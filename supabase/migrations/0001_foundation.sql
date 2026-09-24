-- The Agency · foundation
--
-- Naming: a **workspace** is one of your own ventures. An **organisation** is a
-- business you deal with. People (contacts) belong to organisations; deals belong
-- to both. Every business table carries workspace_id and has Row-Level Security on,
-- so a person only ever sees the workspaces they belong to.
--
-- Run this in the Supabase SQL editor, or `supabase db push` once the CLI is linked.

-- ---------------------------------------------------------------- types
create type public.member_role as enum ('owner', 'admin', 'member', 'viewer');
create type public.org_category as enum ('supplier', 'client', 'partner', 'prospect', 'service');
create type public.deal_stage as enum ('new', 'quoted', 'negotiating', 'won', 'lost');
create type public.activity_type as enum ('call', 'meeting', 'whatsapp', 'email', 'visit', 'note', 'system');

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  timezone text default 'Africa/Nairobi',
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -------------------------------------------------------------- workspaces
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  accent_color text default '#7c1f35',
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.memberships (
  workspace_id uuid not null references public.workspaces on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  role public.member_role not null default 'member',
  title text,
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index memberships_user_idx on public.memberships (user_id);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  email text not null,
  role public.member_role not null default 'member',
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  invited_by uuid not null references public.profiles (id),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index invites_workspace_idx on public.invites (workspace_id);

-- ------------------------------------------------------------------- CRM
create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  name text not null,
  category public.org_category not null default 'prospect',
  what_they_do text,
  location text,
  phone text,
  email text,
  owner_id uuid not null references public.profiles (id),
  tags text[] not null default '{}',
  consent_note text,
  created_at timestamptz not null default now()
);

create index organisations_workspace_idx on public.organisations (workspace_id);
create unique index organisations_unique_name on public.organisations (workspace_id, lower(name));

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  organisation_id uuid references public.organisations on delete set null,
  full_name text not null,
  title text,
  email text,
  phone text,
  tags text[] not null default '{}',
  owner_id uuid not null references public.profiles (id),
  next_touch_at timestamptz,
  touch_cadence_days int,
  consent_note text,
  created_at timestamptz not null default now()
);

create index contacts_workspace_idx on public.contacts (workspace_id);
create index contacts_org_idx on public.contacts (organisation_id);
create index contacts_touch_idx on public.contacts (workspace_id, next_touch_at);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  title text not null,
  organisation_id uuid references public.organisations on delete set null,
  contact_id uuid references public.contacts on delete set null,
  -- whole shillings; no cents in this business
  value bigint not null check (value > 0),
  stage public.deal_stage not null default 'new',
  expected_close date,
  owner_id uuid not null references public.profiles (id),
  lost_reason text,
  stage_changed_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

create index deals_workspace_idx on public.deals (workspace_id, stage);
create index deals_org_idx on public.deals (organisation_id);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  type public.activity_type not null default 'note',
  summary text not null,
  occurred_at timestamptz not null default now(),
  actor_id uuid not null references public.profiles (id),
  organisation_id uuid references public.organisations on delete cascade,
  contact_id uuid references public.contacts on delete cascade,
  deal_id uuid references public.deals on delete cascade,
  created_at timestamptz not null default now()
);

create index activities_workspace_idx on public.activities (workspace_id, occurred_at desc);
create index activities_org_idx on public.activities (organisation_id, occurred_at desc);
create index activities_deal_idx on public.activities (deal_id, occurred_at desc);

-- ---------------------------------------------------------------- helpers
-- security definer, so the policies can ask "is this person a member?" without
-- recursing through memberships' own policies.
create function public.is_member(target uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.workspace_id = target and m.user_id = (select auth.uid())
  );
$$;

create function public.is_admin(target uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.workspace_id = target
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin')
  );
$$;

-- A viewer reads everything in their workspace and writes nothing.
create function public.can_edit(target uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.workspace_id = target
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin', 'member')
  );
$$;

-- -------------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.memberships enable row level security;
alter table public.invites enable row level security;
alter table public.organisations enable row level security;
alter table public.contacts enable row level security;
alter table public.deals enable row level security;
alter table public.activities enable row level security;

-- profiles: yourself, plus anyone who shares a workspace with you.
create policy "read own profile" on public.profiles
  for select using (id = (select auth.uid()));

create policy "read profiles of people in my workspaces" on public.profiles
  for select using (
    exists (
      select 1 from public.memberships mine
      join public.memberships theirs on theirs.workspace_id = mine.workspace_id
      where mine.user_id = (select auth.uid()) and theirs.user_id = public.profiles.id
    )
  );

create policy "update own profile" on public.profiles
  for update using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- workspaces
create policy "members read their workspaces" on public.workspaces
  for select using (public.is_member(id));

create policy "signed-in people create workspaces" on public.workspaces
  for insert with check (created_by = (select auth.uid()));

create policy "admins update their workspace" on public.workspaces
  for update using (public.is_admin(id)) with check (public.is_admin(id));

-- memberships
create policy "members read memberships" on public.memberships
  for select using (public.is_member(workspace_id));

create policy "creator joins their new workspace" on public.memberships
  for insert with check (user_id = (select auth.uid()) or public.is_admin(workspace_id));

create policy "admins update memberships" on public.memberships
  for update using (public.is_admin(workspace_id)) with check (public.is_admin(workspace_id));

create policy "admins remove members" on public.memberships
  for delete using (public.is_admin(workspace_id));

-- invites
create policy "admins read invites" on public.invites
  for select using (public.is_admin(workspace_id));

create policy "invitee reads their invite" on public.invites
  for select using (email = (select auth.jwt() ->> 'email'));

create policy "admins create invites" on public.invites
  for insert with check (public.is_admin(workspace_id) and invited_by = (select auth.uid()));

create policy "admins delete invites" on public.invites
  for delete using (public.is_admin(workspace_id));

-- CRM tables: members read, editors write, admins delete.
create policy "members read organisations" on public.organisations
  for select using (public.is_member(workspace_id));
create policy "editors write organisations" on public.organisations
  for insert with check (public.can_edit(workspace_id));
create policy "editors update organisations" on public.organisations
  for update using (public.can_edit(workspace_id)) with check (public.can_edit(workspace_id));
create policy "admins delete organisations" on public.organisations
  for delete using (public.is_admin(workspace_id));

create policy "members read contacts" on public.contacts
  for select using (public.is_member(workspace_id));
create policy "editors write contacts" on public.contacts
  for insert with check (public.can_edit(workspace_id));
create policy "editors update contacts" on public.contacts
  for update using (public.can_edit(workspace_id)) with check (public.can_edit(workspace_id));
create policy "admins delete contacts" on public.contacts
  for delete using (public.is_admin(workspace_id));

create policy "members read deals" on public.deals
  for select using (public.is_member(workspace_id));
create policy "editors write deals" on public.deals
  for insert with check (public.can_edit(workspace_id));
create policy "editors update deals" on public.deals
  for update using (public.can_edit(workspace_id)) with check (public.can_edit(workspace_id));
create policy "admins delete deals" on public.deals
  for delete using (public.is_admin(workspace_id));

create policy "members read activities" on public.activities
  for select using (public.is_member(workspace_id));
create policy "editors write activities" on public.activities
  for insert with check (public.can_edit(workspace_id) and actor_id = (select auth.uid()));
