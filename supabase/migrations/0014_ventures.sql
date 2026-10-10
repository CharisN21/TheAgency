-- Ventures and founders. A venture (Telecast) holds several workspaces, one per
-- team ("Marketing and sales", "Directors"). Only founders, appointed by the
-- platform owner, start ventures and add workspaces to them; everyone else gets
-- in by invite, with a role and a title.
--
-- Nothing is lost: each existing workspace becomes its own venture with the same
-- name and colour, and anyone who had created a workspace becomes a founder.

create table public.ventures (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  accent_color text not null default '#7c1f35' check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  -- The logo's file in the public 'venture-logos' Storage bucket, redrawn as 256 by 256 WebP by the server.
  logo_path text check (logo_path is null or logo_path ~ '^[0-9a-f-]{36}-[0-9]{13}\.webp$'),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.profiles add column founder boolean not null default false;
alter table public.workspaces add column venture_id uuid references public.ventures on delete restrict;
alter table public.invites add column title text check (title is null or char_length(title) <= 60);

-- Backfill: one venture per existing workspace, then require it.
insert into public.ventures (id, name, accent_color, created_by, created_at)
  select gen_random_uuid(), w.name, w.accent_color, w.created_by, w.created_at from public.workspaces w;
update public.workspaces w set venture_id = v.id
  from public.ventures v
  where v.name = w.name and v.created_by = w.created_by and v.created_at = w.created_at and w.venture_id is null;
alter table public.workspaces alter column venture_id set not null;
update public.profiles p set founder = true where exists (select 1 from public.workspaces w where w.created_by = p.id);

create index workspaces_venture_idx on public.workspaces (venture_id);

alter table public.ventures enable row level security;

create function public.is_founder()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select founder from public.profiles where id = (select auth.uid())), false)
$$;

-- A founder runs a venture they created, or one where they own a workspace.
create function public.runs_venture(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_founder() and (
    exists (select 1 from public.ventures v where v.id = target and v.created_by = (select auth.uid()))
    or exists (
      select 1 from public.workspaces w join public.memberships m on m.workspace_id = w.id
      where w.venture_id = target and m.user_id = (select auth.uid()) and m.role = 'owner'
    )
  )
$$;

-- You see a venture because you are in one of its workspaces, or you founded it.
-- Its other workspaces stay out of sight (workspaces keep their own policies).
create policy "see ventures you are part of" on public.ventures
  for select using (
    created_by = (select auth.uid())
    or exists (select 1 from public.workspaces w where w.venture_id = ventures.id and public.is_member(w.id))
  );
create policy "founders start ventures" on public.ventures
  for insert with check (public.is_founder() and created_by = (select auth.uid()));
create policy "founders rename their ventures" on public.ventures
  for update using (public.runs_venture(id)) with check (public.runs_venture(id));

-- Only a venture's founders add workspaces to it. Replaces any wider insert rule.
drop policy "signed-in people create workspaces" on public.workspaces;
create policy "founders add workspaces to their ventures" on public.workspaces
  for insert with check (created_by = (select auth.uid()) and public.runs_venture(venture_id));

-- Only the platform owner sets who is a founder; that runs on the server with
-- the service key, so ordinary users can never change their own `founder`.
create function public.profiles_guard()
returns trigger language plpgsql as $$
begin
  if new.founder is distinct from old.founder and current_setting('request.jwt.claim.role', true) is distinct from 'service_role' then
    raise exception 'Only the platform owner appoints founders';
  end if;
  return new;
end
$$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.profiles_guard();
