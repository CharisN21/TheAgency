-- Phase 1: projects, tasks and objectives. Adds three tables; changes nothing
-- that exists. See docs/phase-1-projects-and-tasks.md.

create type public.task_status as enum ('todo', 'doing', 'review', 'done', 'blocked');
create type public.priority as enum ('low', 'medium', 'high');
create type public.project_health as enum ('on_track', 'at_risk', 'blocked');
create type public.cadence as enum ('weekly', 'fortnightly', 'monthly');
create type public.objective_period as enum ('week', 'month', 'year');
create type public.objective_measure as enum ('number', 'money', 'done', 'won');

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  name text not null,
  scope text,
  organisation_id uuid references public.organisations on delete set null,
  deal_id uuid references public.deals on delete set null,
  lead_id uuid not null references public.profiles (id),
  member_ids uuid[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'closed')),
  health public.project_health not null default 'on_track',
  due_at timestamptz,
  cadence public.cadence not null default 'weekly',
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

-- A task can stand alone: every link is optional.
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  title text not null,
  notes text,
  status public.task_status not null default 'todo',
  priority public.priority not null default 'medium',
  due_at timestamptz,
  assignee_id uuid not null references public.profiles (id),
  created_by uuid not null references public.profiles (id),
  project_id uuid references public.projects on delete cascade,
  organisation_id uuid references public.organisations on delete set null,
  deal_id uuid references public.deals on delete set null,
  contact_id uuid references public.contacts on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index tasks_assignee_idx on public.tasks (workspace_id, assignee_id, status);
create index tasks_project_idx on public.tasks (project_id);

create table public.objectives (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  owner_id uuid not null references public.profiles (id),
  set_by uuid not null references public.profiles (id),
  title text not null,
  period public.objective_period not null,
  period_start date not null,
  measure public.objective_measure not null,
  target numeric,
  progress numeric not null default 0,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index objectives_owner_idx on public.objectives (workspace_id, owner_id, period, period_start);

alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.objectives enable row level security;

-- Projects and tasks: members read, editors write, admins delete — like deals.
create policy "members read projects" on public.projects
  for select using (public.is_member(workspace_id));
create policy "editors write projects" on public.projects
  for insert with check (public.can_edit(workspace_id));
create policy "editors update projects" on public.projects
  for update using (public.can_edit(workspace_id)) with check (public.can_edit(workspace_id));
create policy "admins delete projects" on public.projects
  for delete using (public.is_admin(workspace_id));

create policy "members read tasks" on public.tasks
  for select using (public.is_member(workspace_id));
create policy "editors write tasks" on public.tasks
  for insert with check (public.can_edit(workspace_id) and created_by = (select auth.uid()));
create policy "editors update tasks" on public.tasks
  for update using (public.can_edit(workspace_id)) with check (public.can_edit(workspace_id));
create policy "creator or admin deletes tasks" on public.tasks
  for delete using (created_by = (select auth.uid()) or public.is_admin(workspace_id));

-- Objectives are personal: the person they are for, and owners and admins.
create policy "owner or admin reads objectives" on public.objectives
  for select using (
    public.is_member(workspace_id) and (owner_id = (select auth.uid()) or public.is_admin(workspace_id))
  );
create policy "set own, or admins set anyone's" on public.objectives
  for insert with check (
    public.can_edit(workspace_id)
    and set_by = (select auth.uid())
    and (owner_id = (select auth.uid()) or public.is_admin(workspace_id))
  );
create policy "owner or admin updates objectives" on public.objectives
  for update using (
    public.can_edit(workspace_id) and (owner_id = (select auth.uid()) or public.is_admin(workspace_id))
  );
create policy "owner or admin deletes objectives" on public.objectives
  for delete using (
    public.can_edit(workspace_id) and (owner_id = (select auth.uid()) or public.is_admin(workspace_id))
  );
