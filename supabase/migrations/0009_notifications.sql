-- Phase 5a: the notification centre. Adds two tables; changes nothing that
-- exists. Design: docs/phase-5-messaging-and-notifications.md, Part A.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  -- Safe to read on a lock screen: who did what to which record, never money or private notes.
  title text not null,
  href text,
  actor_id uuid,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (workspace_id, user_id, created_at desc);
create unique index notifications_dedupe_idx on public.notifications (user_id, dedupe_key) where dedupe_key is not null;

create table public.notification_prefs (
  workspace_id uuid not null references public.workspaces on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  muted text[] not null default '{}',
  primary key (workspace_id, user_id)
);

alter table public.notifications enable row level security;
alter table public.notification_prefs enable row level security;

-- Your notifications are yours alone: nobody else, owners included, reads them.
create policy "read own notifications" on public.notifications
  for select using (user_id = (select auth.uid()) and public.is_member(workspace_id));
create policy "mark own notifications read" on public.notifications
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Notifications are written by the server in the same transaction as the
-- change they describe (a security-definer function per action), so there is
-- deliberately no insert policy for ordinary users.

create policy "read own prefs" on public.notification_prefs
  for select using (user_id = (select auth.uid()));
create policy "write own prefs" on public.notification_prefs
  for insert with check (user_id = (select auth.uid()) and public.is_member(workspace_id));
create policy "change own prefs" on public.notification_prefs
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
