-- Phase 1: closing a project with a retrospective. Adds one table; changes
-- nothing that exists.

create table public.retrospectives (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  project_id uuid not null unique references public.projects on delete cascade,
  written_by uuid not null references public.profiles (id),
  went_well text[] not null default '{}',
  went_wrong text[] not null default '{}',
  lessons text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.retrospectives enable row level security;

-- Lessons are for everyone in the workspace to learn from.
create policy "members read retrospectives" on public.retrospectives
  for select using (public.is_member(workspace_id));

-- The project's lead writes it on closing; owners and admins can too.
create policy "lead or admins write retrospectives" on public.retrospectives
  for insert with check (
    written_by = (select auth.uid())
    and public.can_edit(workspace_id)
    and (
      public.is_admin(workspace_id)
      or exists (select 1 from public.projects p where p.id = project_id and p.lead_id = (select auth.uid()))
    )
  );

create policy "admins remove retrospectives" on public.retrospectives
  for delete using (public.is_admin(workspace_id));
