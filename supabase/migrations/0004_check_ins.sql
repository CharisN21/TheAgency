-- Phase 1: project check-ins. Adds one table; changes nothing that exists.

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  project_id uuid not null references public.projects on delete cascade,
  author_id uuid not null references public.profiles (id),
  moved text not null default '',
  stuck text not null default '',
  next text not null default '',
  progress smallint not null check (progress between 0 and 100),
  risks text,
  health public.project_health not null,
  created_at timestamptz not null default now()
);

create index check_ins_project_idx on public.check_ins (project_id, created_at desc);

alter table public.check_ins enable row level security;

-- Everyone in the workspace reads a project's progress history.
create policy "members read check_ins" on public.check_ins
  for select using (public.is_member(workspace_id));

-- The people on the project post them, and owners and admins can too.
create policy "project people or admins post check_ins" on public.check_ins
  for insert with check (
    author_id = (select auth.uid())
    and public.can_edit(workspace_id)
    and (
      public.is_admin(workspace_id)
      or exists (
        select 1 from public.projects p
        where p.id = project_id and (select auth.uid()) = any (p.member_ids) and p.status = 'active'
      )
    )
  );

-- A posted check-in is history: no updates, and only admins remove one.
create policy "admins delete check_ins" on public.check_ins
  for delete using (public.is_admin(workspace_id));
