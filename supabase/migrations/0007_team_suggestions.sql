-- Phase 1: what Claude suggested for a project's team, kept whole with the
-- lines a person accepted or dismissed. Adds one table; changes nothing.

create table public.team_suggestions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  project_id uuid not null references public.projects on delete cascade,
  requested_by uuid not null references public.profiles (id),
  roles jsonb not null default '[]',
  milestones jsonb not null default '[]',
  accepted text[] not null default '{}',
  dismissed text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index team_suggestions_project_idx on public.team_suggestions (project_id, created_at desc);

alter table public.team_suggestions enable row level security;

create policy "members read team_suggestions" on public.team_suggestions
  for select using (public.is_member(workspace_id));

-- The project lead asks for suggestions and accepts lines; owners and admins can too.
create policy "lead or admins write team_suggestions" on public.team_suggestions
  for insert with check (
    requested_by = (select auth.uid())
    and public.can_edit(workspace_id)
    and (
      public.is_admin(workspace_id)
      or exists (select 1 from public.projects p where p.id = project_id and p.lead_id = (select auth.uid()))
    )
  );
create policy "lead or admins update team_suggestions" on public.team_suggestions
  for update using (
    public.can_edit(workspace_id)
    and (
      public.is_admin(workspace_id)
      or exists (select 1 from public.projects p where p.id = project_id and p.lead_id = (select auth.uid()))
    )
  );
