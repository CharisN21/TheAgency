-- Observers: people such as Directors who look at the tabs their workspace
-- chooses, raise flags, chat and ask for task changes, and never edit.
-- Adds a role and a column; nothing is lost. Existing workspaces open Deals and
-- Projects to Observers until an owner or admin changes it.

alter type public.member_role add value if not exists 'observer' before 'viewer';

alter table public.workspaces
  add column observer_tabs text[] not null default '{deals,projects}'
  check (observer_tabs <@ array['organisations', 'people', 'deals', 'projects', 'notebook', 'team']);

-- May this person open this tab here? Everyone but an Observer may open every tab.
create function public.can_open(target uuid, tab text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m join public.workspaces w on w.id = m.workspace_id
    where m.workspace_id = target and m.user_id = (select auth.uid())
      and (m.role <> 'observer' or tab = any (w.observer_tabs))
  )
$$;

-- Observers raise flags too (viewers still do not). can_edit stays owner/admin/member.
create function public.can_raise_flag(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.workspace_id = target and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin', 'member', 'observer')
  )
$$;

drop policy "editors raise flags about others" on public.flags;
create policy "people who may raise flags raise them about others" on public.flags
  for insert with check (
    public.can_raise_flag(workspace_id)
    and raised_by = (select auth.uid())
    and about_user_id is distinct from (select auth.uid())
  );

-- The records behind each tab: an Observer reads them only if that tab is open to them.
drop policy "members read organisations" on public.organisations;
create policy "members read organisations" on public.organisations
  for select using (public.can_open(workspace_id, 'organisations'));
drop policy "members read contacts" on public.contacts;
create policy "members read contacts" on public.contacts
  for select using (public.can_open(workspace_id, 'people'));
drop policy "members read deals" on public.deals;
create policy "members read deals" on public.deals
  for select using (public.can_open(workspace_id, 'deals'));
drop policy "members read projects" on public.projects;
create policy "members read projects" on public.projects
  for select using (public.can_open(workspace_id, 'projects'));
drop policy "members read tasks" on public.tasks;
create policy "members read tasks" on public.tasks
  for select using (public.can_open(workspace_id, 'projects'));
