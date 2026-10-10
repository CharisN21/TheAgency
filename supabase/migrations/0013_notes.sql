-- Phase 2: the notebook of written notes and whiteboards. Adds one table;
-- changes nothing that exists.
-- Design: docs/phase-2-today-capture-notebook-palette.md. Rules: lib/notes/access.ts.
--
-- Private to the author unless shared:
--   shared = null        only the author (owners and admins cannot see it)
--   shared = 'workspace' everyone in the workspace can open it
--   shared = 'project'   it shows on that project; everyone in the workspace can
--                        open it (projects are open to all), and only the
--                        project's lead and members, and owners and admins, can
--                        draw on a whiteboard
-- A shared written note is changed only by its author. A shared whiteboard is
-- drawn on together. Sharing, pinning and deleting stay with the author.

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text check (title is null or char_length(title) <= 120),
  kind text not null default 'text' check (kind in ('text', 'board')),
  -- The words, or a whiteboard's caption (which may be empty).
  body text not null default '' check (char_length(body) <= 10000),
  -- A whiteboard's strokes; the server checks their shape and size before saving.
  drawing jsonb check (drawing is null or pg_column_size(drawing) <= 1000000),
  shared text check (shared in ('workspace', 'project')),
  -- If the project goes, the note falls back to private.
  project_id uuid references public.projects on delete set null,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind = 'board' or char_length(body) >= 1)
);

create index notes_author_idx on public.notes (workspace_id, author_id, pinned desc, updated_at desc);
create index notes_project_idx on public.notes (project_id) where shared = 'project';

alter table public.notes enable row level security;

create function public.can_see_note(n public.notes)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_member(n.workspace_id) and (
    n.author_id = (select auth.uid())
    or n.shared = 'workspace'
    or (n.shared = 'project' and n.project_id is not null)
  )
$$;

create function public.can_draw_on(n public.notes)
returns boolean language sql stable security definer set search_path = public as $$
  select n.kind = 'board' and public.can_see_note(n) and (
    n.author_id = (select auth.uid())
    or (n.shared = 'workspace' and public.can_edit(n.workspace_id))
    or (n.shared = 'project' and public.can_edit(n.workspace_id) and (
      public.is_admin(n.workspace_id)
      or exists (
        select 1 from public.projects p
        where p.id = n.project_id
          and ((select auth.uid()) = p.lead_id or (select auth.uid()) = any (p.member_ids))
      )
    ))
  )
$$;

create policy "read visible notes" on public.notes
  for select using (public.can_see_note(notes));
create policy "write own notes" on public.notes
  for insert with check (author_id = (select auth.uid()) and public.is_member(workspace_id));
create policy "change own notes or draw on shared boards" on public.notes
  for update using (author_id = (select auth.uid()) or public.can_draw_on(notes))
  with check (author_id = (select auth.uid()) or public.can_draw_on(notes));
create policy "delete own notes" on public.notes
  for delete using (author_id = (select auth.uid()) and public.is_member(workspace_id));

-- Someone drawing on a shared whiteboard may change its drawing, title and
-- caption, never who owns it, who can see it, or where it lives.
create function public.notes_guard()
returns trigger language plpgsql as $$
begin
  if (select auth.uid()) is distinct from old.author_id and (
    new.author_id is distinct from old.author_id
    or new.workspace_id is distinct from old.workspace_id
    or new.kind is distinct from old.kind
    or new.shared is distinct from old.shared
    or new.project_id is distinct from old.project_id
    or new.pinned is distinct from old.pinned
  ) then
    raise exception 'Only the author can change who sees this';
  end if;
  return new;
end
$$;

create trigger notes_guard before update on public.notes
  for each row execute function public.notes_guard();
