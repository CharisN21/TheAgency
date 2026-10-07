-- Phase 2: the private notebook. Adds one table; changes nothing that exists.
-- Design: docs/phase-2-today-capture-notebook-palette.md.
--
-- A note is visible only to the person who wrote it: not owners, not admins.
-- It reaches anyone else only when its author posts it onto a record's
-- timeline, which copies the words into `activities` and leaves this row alone.

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 10000),
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_author_idx on public.notes (workspace_id, author_id, pinned desc, updated_at desc);

alter table public.notes enable row level security;

create policy "read own notes" on public.notes
  for select using (author_id = (select auth.uid()) and public.is_member(workspace_id));
create policy "write own notes" on public.notes
  for insert with check (author_id = (select auth.uid()) and public.is_member(workspace_id));
create policy "change own notes" on public.notes
  for update using (author_id = (select auth.uid()) and public.is_member(workspace_id))
  with check (author_id = (select auth.uid()) and public.is_member(workspace_id));
create policy "delete own notes" on public.notes
  for delete using (author_id = (select auth.uid()) and public.is_member(workspace_id));
