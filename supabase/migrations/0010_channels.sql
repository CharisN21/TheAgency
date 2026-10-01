-- Phase 5b: encrypted channels. Adds five tables; changes nothing that exists.
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
  kind text not null check (kind in ('general')),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  epoch integer not null default 0
);
create unique index channels_one_general on public.channels (workspace_id) where kind = 'general';

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
create policy "add your own device" on public.devices
  for insert with check (user_id = (select auth.uid()));
create policy "remove your own device" on public.devices
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- #general is every member of the workspace.
create policy "members read their channels" on public.channels
  for select using (public.is_member(workspace_id));

-- A wrapped key is readable only by the device it was wrapped for.
create policy "device reads its own wrapped keys" on public.channel_keys
  for select using (
    exists (select 1 from public.devices d where d.id = channel_keys.device_id and d.user_id = (select auth.uid()))
  );

create policy "members read sealed messages" on public.messages
  for select using (public.is_member(workspace_id));

create policy "own read markers" on public.channel_reads
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and public.is_member(workspace_id));

-- Rotating a key and posting a message are each one security-definer function
-- (rotate_channel, post_message) that repeats the checks in lib/data/actions.ts:
-- the new key covers exactly the active devices of current members, and nothing
-- is posted while the key is out of date. So there are deliberately no insert
-- policies on channel_keys or messages for ordinary users.
