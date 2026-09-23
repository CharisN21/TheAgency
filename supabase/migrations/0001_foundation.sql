-- The Agency · Phase 0 foundation
-- profiles, companies, memberships, invites, activity_log — with Row-Level Security
-- on every table, so a person only ever sees companies they belong to.
--
-- Run this in the Supabase SQL editor (or `supabase db push` once the CLI is linked).

-- ---------------------------------------------------------------- types
create type public.member_role as enum ('owner', 'admin', 'member', 'viewer');

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  timezone text default 'Africa/Nairobi',
  created_at timestamptz not null default now()
);

-- Every new auth user gets a profile row.
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

-- ---------------------------------------------------------------- companies
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  accent_color text default '#7c1f35',
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.memberships (
  company_id uuid not null references public.companies on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  role public.member_role not null default 'member',
  title text,
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

create index memberships_user_idx on public.memberships (user_id);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies on delete cascade,
  email text not null,
  role public.member_role not null default 'member',
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  invited_by uuid not null references public.profiles (id),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index invites_company_idx on public.invites (company_id);

create table public.activity_log (
  id bigserial primary key,
  company_id uuid not null references public.companies on delete cascade,
  actor_id uuid references public.profiles (id),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index activity_company_idx on public.activity_log (company_id, created_at desc);

-- ---------------------------------------------------------------- helpers
-- security definer, so the policies below can ask "is this person a member?"
-- without recursing through memberships' own policies.
create function public.is_member(target_company uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.company_id = target_company and m.user_id = (select auth.uid())
  );
$$;

create function public.is_admin(target_company uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.company_id = target_company
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin')
  );
$$;

-- ---------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.memberships enable row level security;
alter table public.invites enable row level security;
alter table public.activity_log enable row level security;

-- profiles: yourself, plus anyone who shares a company with you.
create policy "read own profile" on public.profiles
  for select using (id = (select auth.uid()));

create policy "read profiles of people in my companies" on public.profiles
  for select using (
    exists (
      select 1 from public.memberships mine
      join public.memberships theirs on theirs.company_id = mine.company_id
      where mine.user_id = (select auth.uid()) and theirs.user_id = public.profiles.id
    )
  );

create policy "update own profile" on public.profiles
  for update using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- companies: members read, admins update, anyone signed in can create one.
create policy "members read their companies" on public.companies
  for select using (public.is_member(id));

create policy "signed-in people create companies" on public.companies
  for insert with check (created_by = (select auth.uid()));

create policy "admins update their company" on public.companies
  for update using (public.is_admin(id)) with check (public.is_admin(id));

-- memberships: see your own company's members; admins manage them.
create policy "members read memberships of their companies" on public.memberships
  for select using (public.is_member(company_id));

create policy "creator joins their new company" on public.memberships
  for insert with check (
    user_id = (select auth.uid())
    or public.is_admin(company_id)
  );

create policy "admins update memberships" on public.memberships
  for update using (public.is_admin(company_id)) with check (public.is_admin(company_id));

create policy "admins remove members" on public.memberships
  for delete using (public.is_admin(company_id));

-- invites: admins manage; the invitee reads their own by email.
create policy "admins read invites" on public.invites
  for select using (public.is_admin(company_id));

create policy "invitee reads their invite" on public.invites
  for select using (email = (select auth.jwt() ->> 'email'));

create policy "admins create invites" on public.invites
  for insert with check (public.is_admin(company_id) and invited_by = (select auth.uid()));

create policy "admins delete invites" on public.invites
  for delete using (public.is_admin(company_id));

-- activity_log: members read their company's trail; the app writes it.
create policy "members read activity" on public.activity_log
  for select using (public.is_member(company_id));

create policy "members write activity" on public.activity_log
  for insert with check (public.is_member(company_id) and actor_id = (select auth.uid()));
