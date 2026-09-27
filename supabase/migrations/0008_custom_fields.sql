-- Custom fields on organisations, people and deals. Adds two tables; changes nothing
-- that exists.

create type public.field_type as enum ('text', 'number', 'money', 'date', 'choice');

create table public.custom_fields (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  object text not null check (object in ('organisations', 'people', 'deals')),
  label text not null check (char_length(label) between 2 and 40),
  type public.field_type not null,
  options text[] not null default '{}',
  position int not null default 0,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create unique index custom_fields_label_idx on public.custom_fields (workspace_id, object, lower(label));

-- Values are kept as text and checked against the field's type in the app.
create table public.custom_values (
  workspace_id uuid not null references public.workspaces on delete cascade,
  field_id uuid not null references public.custom_fields on delete cascade,
  record_id uuid not null,
  value text not null,
  primary key (field_id, record_id)
);

create index custom_values_record_idx on public.custom_values (workspace_id, record_id);

alter table public.custom_fields enable row level security;
alter table public.custom_values enable row level security;

-- Everyone in the workspace sees the fields; owners and admins shape them.
create policy "members read custom_fields" on public.custom_fields
  for select using (public.is_member(workspace_id));
create policy "admins add custom_fields" on public.custom_fields
  for insert with check (public.is_admin(workspace_id) and created_by = (select auth.uid()));
create policy "admins change custom_fields" on public.custom_fields
  for update using (public.is_admin(workspace_id)) with check (public.is_admin(workspace_id));
create policy "admins remove custom_fields" on public.custom_fields
  for delete using (public.is_admin(workspace_id));

-- Anyone who can edit fills them in.
create policy "members read custom_values" on public.custom_values
  for select using (public.is_member(workspace_id));
create policy "editors write custom_values" on public.custom_values
  for insert with check (public.can_edit(workspace_id));
create policy "editors change custom_values" on public.custom_values
  for update using (public.can_edit(workspace_id)) with check (public.can_edit(workspace_id));
create policy "editors clear custom_values" on public.custom_values
  for delete using (public.can_edit(workspace_id));
