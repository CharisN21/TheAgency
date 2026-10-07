-- Phase 5b: team chat. Adds four tables; changes nothing that exists.
-- Three kinds: announcements (everyone reads, owners and admins post),
-- groups (named, chosen members) and direct messages (two people).
--
-- Messages are stored encrypted by the app server (lib/chat/at-rest.ts) with a
-- key it holds in CHAT_ENCRYPTION_KEY, never in the database. They are not
-- end-to-end encrypted. The database holds only the sealed text, so a copy of it
-- on its own reads as nothing. (An earlier design kept keys per device; that
-- version is the git tag chat-e2ee-last.)

create table public.channels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  name text not null,
  kind text not null check (kind in ('announcements', 'group', 'dm')),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  -- A group made from a project's chat button; one chat per project.
  project_id uuid references public.projects on delete set null
);
create unique index channels_one_per_project on public.channels (project_id) where project_id is not null;
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

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  channel_id uuid not null references public.channels on delete cascade,
  sender_id uuid not null references public.profiles (id),
  -- Sealed by the app server: text, tags and any task card. Opaque to the database.
  body text not null check (length(body) <= 20000),
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

alter table public.channels enable row level security;
alter table public.channel_members enable row level security;
alter table public.messages enable row level security;
alter table public.channel_reads enable row level security;

-- Owners and admins do not see groups or direct messages they are not in.
create policy "members read their chats" on public.channels
  for select using (public.in_channel(id));
create policy "members see who is in their chats" on public.channel_members
  for select using (public.in_channel(channel_id));
create policy "members read their messages" on public.messages
  for select using (public.in_channel(channel_id));
create policy "own read markers" on public.channel_reads
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and public.is_member(workspace_id));

-- Starting a chat, posting, and changing a group are each a security-definer
-- function (create_group, start_direct_message, add_group_members,
-- remove_group_member, post_message) repeating the checks in lib/data/actions.ts:
-- only owners and admins post announcements, only a group's starter or an owner
-- or admin removes someone else, tags are people in the chat, a task card points
-- at a real task in the workspace. Removing someone from a workspace also deletes
-- their channel_members and channel_reads rows there (in remove_member), so a
-- later re-invite does not restore them to private chats. So there are
-- deliberately no insert policies on these tables for ordinary users.
