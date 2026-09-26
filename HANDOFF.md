# Handoff — where The Agency stands

Last updated 25 Sep 2026. Read this first when starting a new session, then `CLAUDE.md` for the rules.

## Run it

```bash
npm run dev
```

http://localhost:3000 — sign in with **Continue as Charis (demo)**, or any email address (a new one gets the brand-new-person path).

There is **no database on purpose**. Everything lives in `.data/agency.json`, written by `lib/data/store.ts`, behind the same shapes as `supabase/migrations/0001_foundation.sql`. Screens and actions never touch the file: they go through `lib/data/queries.ts` (reads) and `lib/data/actions.ts` (writes). When Supabase goes in, those files change and the screens should not. Settings → Reset demo data puts the demo back.

## What works today

**Foundation** — sign in, sign out, guarded routes (`proxy.ts`), workspaces, workspace switcher, invites with roles and 7-day links, `/join/[token]` (handles used, expired and unknown), role changes, member removal with last-owner protection, viewer read-only everywhere, PWA manifest and icons, the landing page with the logo sequence.

**CRM** — organisations (list, saved views, filter builder, bulk actions, CSV export, record page with properties, activity timeline, people and deals), people with next-touch dates and one-tap call/WhatsApp/email, deals on a pipeline board with drag-and-drop, stage totals, weighted forecast and a required reason when a deal is lost. Today leads with open pipeline, who to speak to and what is going quiet.

**Import** — Organisations → Import: upload a CSV, map your own column names, see which names already exist, then skip them or fill in their blanks. People on the same row come in attached to their organisation.

**Duplicates** — People and Organisations show "N possible duplicates · Review" when two records share a phone number (written any way), an email or a name (organisation names ignore Ltd, Limited, The, &). The review page (`/people/duplicates`, `/organisations/duplicates`) shows each pair side by side. **Merge** picks the record that stays and, field by field, which value wins; blanks fill from the other, tags combine, people, deals and history move across, and the timeline lists every value not kept. **Not a duplicate** hides a pair for good (with undo). Both are owners and admins only (`can.merge`). The add-person and add-organisation dialogs warn about a look-alike first; "add anyway" records the pair as different. Matching rules live in `lib/data/match.ts`.

**Deal page** — `/deals/[id]`: worth and expected value, the stages as tappable steps (lost always asks why; a lost deal reopens by tapping a stage), who you deal with with one-tap call/WhatsApp/email, other deals with the same organisation, and the deal's own history with a log box. Edit changes name, value, close date, person (must work at the organisation) and owner (must be in the workspace). Pipeline cards, Today's "Closing soon" and organisation pages link to it.

**Bands** — pages are built from full-width sections (`components/app/band.tsx`): one `accent` lead band (the soft maroon tint), then `plain` and `soft` (greige, hairlines above and below) alternating via `toneAfterLead`. Each band rises in on load (240ms, 60ms apart) and again as it scrolls into view (CSS scroll timeline; browsers without it just show the section; off for reduced motion). Every signed-in page uses them: each leads with a tinted band holding its key numbers (`BandStat` tiles, compact and side by side on a phone) or a short explanation, then alternates. Boards and tables pass `wide`, reading pages pass `narrow`. The idea came from prolithica.com; only existing tokens are used.

**Member pages** — Team → a name (or **Your page**) opens `/team/[id]`: their open deals, won this month, who they need to speak to, what they logged in 30 days, then bands for the people they are contacting, their deals, the organisations they look after and their recent activity. Owners and admins open anyone's; members and viewers only their own (`can.viewMember`; a page you may not see is a plain not-found). The last band holds the place for tasks and objectives, which Phase 1 fills in.

**Phase 1 so far (26 Sep 2026)** — built from `docs/phase-1-projects-and-tasks.md`:
- **Tasks** (`components/app/tasks.tsx`): title, who it is for, due date, priority, status (to do, in progress, in review, done, blocked; each shows its word). A task stands alone or links to a project, organisation, deal or person, and shows on the member page, its deal, its organisation, and on Today when late or due within two days. Tick to finish, tap the status to move, tap the title to edit or remove (creator or admin).
- **Projects** (`/projects`, `components/app/projects.tsx`): cards with a progress ring, health in words, tasks done and overdue, people and next check-in; a project page with List and Board views, scope, team and history. Start, edit, and mark on track / at risk / blocked.
- **Objectives** (`components/app/objectives.tsx`) on the member page: this week, this month, this year. Measured as a number, an amount in KSh, done or not, or KSh won in deals (counted from the person's won deals in the period). You set your own; owners and admins set anyone's; only the person and admins ever see them.
- **Check-ins** (`components/app/check-ins.tsx`) on the project page: what moved, what is stuck, next, progress, overall health and a risks line. The form opens pre-filled from the project's tasks since the last check-in (done since then, blocked or late, due before the next one); you edit before posting. Posting sets the project's health and restarts its clock (weekly, fortnightly or monthly from the last check-in). People on the project post them, and owners and admins can too. Today shows check-ins due on projects you lead.
- Data: `projects`, `tasks`, `objectives`, `check_ins` in the store; migrations `0003_projects_tasks_objectives.sql` and `0004_check_ins.sql`.

Every action returns a result and raises a toast. Lists have skeletons and empty states. `app/(app)/error.tsx` catches the rest.

## What is next, in order

1. **Try the import on the real supplier and Safaricom sheets**, then run the duplicates review on what came in.
2. **Record the band pattern in the design system** source (`design-system/`), so the published system matches the app. Also fix the one lint error in `app/(app)/team/invite-dialog.tsx` (setState inside an effect).
3. **Bulk actions and filters on people and deals** — the organisations pattern, copied across (`org-table.tsx` and `filter-bar.tsx` are the models).
4. **Custom fields** — per workspace, per object, AI-suggested and approved.
5. **Phase 5 — notifications, then encrypted messaging.** Designed in full: `docs/phase-5-messaging-and-notifications.md`. Build 5a (notification centre, no crypto) before 5b (channels with E2EE).
6. **Phase 1, the rest** — tasks, projects and objectives are done. Still to build, in order: private flags (note/warning/serious, with a situation–behaviour–impact conversation script; only the raiser and admins see them), close + retrospective, analytics for owners and admins (completion, on time, overdue by person; no leaderboard). Then the AI parts once a Claude API key is in `.env.local`: team structure suggestions, check-in drafts written by Claude (the task-based draft stays as the fallback), retrospective lessons. Use Phase 1 on a real project before Phase 2.
7. **Supabase**, once the flows and the feel are settled. Rewrite `store.ts` as a Postgres adapter, run the migrations (`0001`, then `0002_not_duplicates`), enable Google and magic-link auth, then delete the local store. Merging must become one database function (one transaction) — see the note at the end of `0002`.

## Where things are

```
app/(app)/            the signed-in shell
  organisations/      list + filter-bar.tsx + org-table.tsx + [id] record page
  deals/              pipeline-board.tsx (drag and drop) + new-deal.tsx + [id] deal page
  people/ today/ settings/
  team/               members and invites + [id] member page
app/(auth)/ app/join/ app/new-workspace/   sign in, accept invite, onboarding
lib/data/             types · store (the JSON store) · session · queries · actions
components/app/       sidebar, workspace switcher, tab bar, page header
components/brand/     logo, logo intro sequence
design-system/        source of the published design system (see below)
docs/                 phase specs
supabase/migrations/  the SQL that replaces the local store
```

## The design system

Published and private: https://claude.ai/artifact/G99aNLQ1LFNfcaet7wVMDu

It holds the tokens (maroon `#7c1f35` on warm greige), the logo and its motion, the Phase 0 screens, a component per module for Phases 1–7, reference boards comparing Material and shadcn/ui, palette options, the Phase 0 UX checklist, and the CRM direction boards. The source lives in `design-system/`; `python gen_*.py` regenerates the boards.

**The look is settled. Do not invent colours, spacing or components** — `app/globals.css` maps the tokens onto shadcn role names, and nothing should carry a hex.

## Decisions already made (do not reopen without a reason)

- **Workspace** = one of Charis's ventures. **Organisation** = a business he deals with. People belong to organisations, deals to both. The word "company" is not used in the interface.
- Maroon `#7c1f35` with warm greige neutrals; brass is decorative only.
- shadcn/ui on the radix base, Nova preset, Lucide icons. Components are copied in, not wrapped.
- Local JSON store until the flows are proven, then Postgres.
- Money is whole shillings, written `KSh 480,000`.
- Viewers read and never write, enforced in both the UI and the actions.
- Merging and "not a duplicate" are owners and admins only, the same rule as deleting.
- AI gives paths, not answers, and never assigns anyone automatically.

## Moving phases to another session

This session has run long. A clean split:

- **Session A (this one, or its successor):** CRM depth — bulk actions on people and deals, custom fields. Import, merge, the deal page and the bands are done. Everything in `lib/data/` and `app/(app)/`.
- **Session B:** Phase 5 — notification centre, then encrypted messaging. Start from `docs/phase-5-messaging-and-notifications.md`; it is self-contained.
- **Session C:** Phase 1 — projects, tasks and objectives. Start from `docs/phase-1-projects-and-tasks.md`, then the design system's Phase 1 boards.

Each new session should open this file, then `CLAUDE.md`, then run the app and click through Today, Organisations and Deals before writing anything.
