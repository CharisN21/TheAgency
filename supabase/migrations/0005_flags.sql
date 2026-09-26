-- Phase 1: private flags. Adds one table; changes nothing that exists.
--
-- The rule, enforced here as well as in the app: a flag is seen by the person
-- who raised it, and by owners and admins — but never by the person it is
-- about, whatever their role. Flags never write to activities.

create type public.flag_severity as enum ('note', 'warning', 'serious');

create table public.flags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  raised_by uuid not null references public.profiles (id),
  about_user_id uuid references public.profiles (id),
  project_id uuid references public.projects on delete set null,
  task_id uuid references public.tasks on delete set null,
  severity public.flag_severity not null,
  situation text not null,
  behaviour text not null,
  impact text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  talked_at timestamptz,
  conversation text,
  agreed_change text,
  created_at timestamptz not null default now(),
  check (about_user_id is null or about_user_id <> raised_by),
  check (about_user_id is not null or project_id is not null or task_id is not null)
);

create index flags_workspace_idx on public.flags (workspace_id, status);

alter table public.flags enable row level security;

create function public.can_see_flag(f public.flags)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select public.is_member(f.workspace_id) and (
    f.raised_by = (select auth.uid())
    or (public.is_admin(f.workspace_id) and f.about_user_id is distinct from (select auth.uid()))
  );
$$;

create policy "raiser or admins, never the subject, read flags" on public.flags
  for select using (public.can_see_flag(flags));

create policy "editors raise flags about others" on public.flags
  for insert with check (
    public.can_edit(workspace_id)
    and raised_by = (select auth.uid())
    and about_user_id is distinct from (select auth.uid())
  );

create policy "those who can see it log the conversation" on public.flags
  for update using (public.can_edit(workspace_id) and public.can_see_flag(flags))
  with check (public.can_edit(workspace_id) and public.can_see_flag(flags));

create policy "raiser or admins remove flags" on public.flags
  for delete using (
    public.can_see_flag(flags)
    and (raised_by = (select auth.uid()) or public.is_admin(workspace_id))
  );
