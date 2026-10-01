-- Phase 5b: encrypted chat. Adds six tables; changes nothing that exists.
-- Three kinds: announcements (everyone reads, owners and admins post),
-- groups (named, chosen members) and direct messages (two people).
-- Design: docs/phase-5-messaging-and-notifications.md, Part B.
-- The server stores public keys, wrapped keys and sealed messages only.

-- Devices belong to a person, not a workspace: one phone serves every
-- workspace you are in. The private key never leaves the device.
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  public_key jsonb not null check (public_key ? 'x' and public_key ? 'y' and not public_key ? 'd'),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.channels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  name text not null,
  kind text not null check (kind in ('announcements', 'group', 'dm')),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  epoch integer not null default 0,
  -- A member's device could not open this epoch's key; the next member who can makes a new one.
  rekey_epoch integer
);
create unique index channels_one_announcements on public.channels (workspace_id) where kind = 'announcements';

-- Who is in a group or a direct message. Announcements needs no rows: it is everyone.
create table public.channel_members (
  workspace_id uuid not null references public.workspaces on delete cascade,
  channel_id uuid not null references public.channels on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  added_by uuid references public.profiles (id),
  added_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);

-- In a chat right now: everyone for announcements, listed members (still in
-- the workspace) for groups and direct messages.
create function public.in_channel(target uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (
    select 1 from public.channels c
    where c.id = target and public.is_member(c.workspace_id)
      and (c.kind = 'announcements'
           or exists (select 1 from public.channel_members m
                      where m.channel_id = c.id and m.user_id = (select auth.uid())))
  )
$$;

create table public.channel_keys (
  workspace_id uuid not null references public.workspaces on delete cascade,
  channel_id uuid not null references public.channels on delete cascade,
  epoch integer not null,
  device_id uuid not null references public.devices on delete cascade,
  wrapped_by_device_id uuid not null references public.devices,
  wrapped_key text not null,
  created_at timestamptz not null default now(),
  primary key (channel_id, epoch, device_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  channel_id uuid not null references public.channels on delete cascade,
  sender_id uuid not null references public.profiles (id),
  sender_device_id uuid not null references public.devices,
  epoch integer not null,
  iv text not null,
  ciphertext text not null check (length(ciphertext) <= 65536),
  created_at timestamptz not null default now()
);
create index messages_channel_idx on public.messages (channel_id, created_at);

create table public.channel_reads (
  workspace_id uuid not null references public.workspaces on delete cascade,
  channel_id uuid not null references public.channels on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);

alter table public.devices enable row level security;
alter table public.channels enable row level security;
alter table public.channel_members enable row level security;
alter table public.channel_keys enable row level security;
alter table public.messages enable row level security;
alter table public.channel_reads enable row level security;

-- Public keys are public to people who share a workspace with you: they are
-- needed to wrap channel keys for your devices.
create policy "see devices of people you work with" on public.devices
  for select using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.memberships a join public.memberships b on a.workspace_id = b.workspace_id
      where a.user_id = (select auth.uid()) and b.user_id = devices.user_id
    )
  );
-- No insert or update policies on devices: adding and removing go through
-- register_device and revoke_device (security definer), which check the key
-- is a real P-256 point, enforce the limit of 10, and only ever set
-- revoked_at from null to now(). A direct insert or update would skip them.

-- Owners and admins do not see groups or direct messages they are not in.
create policy "members read their chats" on public.channels
  for select using (public.in_channel(id));
create policy "members see who is in their chats" on public.channel_members
  for select using (public.in_channel(channel_id));

-- A wrapped key is readable only by the device it was wrapped for.
create policy "device reads its own wrapped keys" on public.channel_keys
  for select using (
    exists (select 1 from public.devices d where d.id = channel_keys.device_id and d.user_id = (select auth.uid()))
  );

create policy "members read sealed messages" on public.messages
  for select using (public.in_channel(channel_id));

create policy "own read markers" on public.channel_reads
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and public.is_member(workspace_id));

-- Removing someone from a workspace also deletes their channel_members and
-- channel_reads rows there (in remove_member), so a later re-invite does not
-- restore them to private chats.
--
-- Rotating a key, posting a message, and starting or changing a group are each
-- a security-definer function (rotate_channel, post_message, create_group,
-- start_direct_message, add_group_members, remove_group_member) repeating the
-- checks in lib/data/actions.ts: a new key covers exactly the active devices of
-- current members (compared as sets of uuid, never as text), a key is only
-- renewed when one is needed, only owners and admins renew the Announcements
-- key, nothing is posted while the key is out of date, only owners
-- and admins post announcements, and only a group's starter or an owner or
-- admin removes someone else. So there are deliberately no insert policies on
-- channels, channel_members, channel_keys or messages for ordinary users.
