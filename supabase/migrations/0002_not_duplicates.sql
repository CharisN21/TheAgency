-- Pairs a person looked at and said are different, so the duplicates review
-- never suggests them again. Adds one table; changes nothing that exists.

create table public.not_duplicates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  object text not null check (object in ('people', 'organisations')),
  a_id uuid not null,
  b_id uuid not null,
  marked_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  check (a_id <> b_id)
);

-- One row per pair, whichever way round it was saved.
create unique index not_duplicates_pair_idx
  on public.not_duplicates (workspace_id, least(a_id, b_id), greatest(a_id, b_id));

alter table public.not_duplicates enable row level security;

-- Everyone in the workspace sees the list stay clean; only owners and admins
-- decide, the same as merging.
create policy "members read not_duplicates" on public.not_duplicates
  for select using (public.is_member(workspace_id));
create policy "admins write not_duplicates" on public.not_duplicates
  for insert with check (public.is_admin(workspace_id) and marked_by = (select auth.uid()));
create policy "admins delete not_duplicates" on public.not_duplicates
  for delete using (public.is_admin(workspace_id));

-- Merging moves rows between records and removes one. When Supabase goes in,
-- do it inside a single security-definer function (one transaction) that
-- checks public.is_admin first, so a half-finished merge cannot happen.
