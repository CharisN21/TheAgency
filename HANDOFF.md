# Handoff — where The Agency stands

Last updated 25 Sep 2026. Read this first when starting a new session, then `CLAUDE.md` for the rules.

## The repo

https://github.com/CharisN21/TheAgency. `main` always works; every piece of work gets its own branch and a pull request (`docs/branching.md`). Milestones are tagged: `v0.1.0` Phase 0, `v0.2.0` CRM core, `v0.3.0` Phase 1.

## Run it

```bash
npm run dev
```

http://localhost:3000 — sign in with **Continue as Charis (demo)**, or any email address (a new one gets the brand-new-person path).

There is **no database on purpose**. Everything lives in `.data/agency.json`, written by `lib/data/store.ts`, behind the same shapes as `supabase/migrations/0001_foundation.sql`. Screens and actions never touch the file: they go through `lib/data/queries.ts` (reads) and `lib/data/actions.ts` (writes). When Supabase goes in, those files change and the screens should not. Settings → Reset demo data puts the demo back.

## Checks

`npm test` runs the privacy tests in `tests/privacy.test.ts` (CLAUDE.md rules 1 and 2): a second workspace, Elsewhere, gets a copy of every Kilima Labs record, and the tests prove none of it shows in Kilima Labs lists or pages, that asking for a workspace you are not in does not let you in, that changes aimed at another workspace are refused, that private flags reach only the raiser and owners/admins who are not the subject, and that notifications are yours alone. They use a throwaway data folder (`AGENCY_DATA_DIR`), never `.data/`. Add a check here whenever a new kind of record or a new private thing appears. When Supabase goes in, the same tests must pass against Postgres with Row-Level Security.

`npm run typecheck`, `npm run lint` and `npm test` also run on GitHub for every pull request (`.github/workflows/checks.yml`).

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
- **Private flags** (`/flags`, `components/app/flags.tsx`): a note, warning or serious concern about a person, and optionally a project, written as situation, what happened, and the effect. Seen only by the person who raised it and by owners and admins who are not its subject (`can.seeFlag`, checked in every query and action); the person it is about never sees it, and flags never write to any timeline. Each open flag shows a suggested conversation built from its own words (`lib/data/flag-script.ts`, no AI). Logging the conversation (what was said, the one change agreed) closes it; it can be reopened, and removed only by its raiser or an admin after a confirm. Raise one from Flags, a member page, or a project page. Admins see "N open private flags about X" on someone's page.
- **Close and retrospective** (`components/app/retro.tsx`): the lead, or an owner or admin, presses Close project and walks three steps. What went well and what went wrong are ticked from what the app noticed in tasks, dates and check-ins (`noticeForRetro`: on-time and late tasks, tasks with no deadline, still blocked or open, missed check-ins, ending late; never flags) or typed in. Lessons are suggested only for the problems ticked, each accepted on its own, plus your own. Open tasks stay on people's lists unless marked done. The retrospective shows on the project page; owners and admins can reopen a project and the retrospective is kept.
- **Analytics** (`/projects/analytics`, owners and admins only; everyone else gets not-found and no button): completion, on time and overdue now; tasks finished each week for six weeks (`components/app/charts.tsx`: one series, hover or focus a week for its number, a Table toggle); by person in alphabetical order, never ranked, with a six-week spark; by ongoing project.
- **Claude** (`lib/ai/claude.ts`, server-only; switched on by `ANTHROPIC_API_KEY` in `.env.local`, status shown in Settings). Model `claude-opus-5`, adaptive thinking, effort medium, structured JSON output checked with zod, server-side refusal fallback (`fallbacks: "default"`). Three uses, all suggestions a person accepts: **Suggest a team** on a project (lead or admin): roles with headcount, person or AI helper, who from the team might fit, and milestones; each line is accepted or dismissed on its own (accepting a named person adds them to the project; a milestone becomes a task for the lead); the whole proposal is kept in `team_suggestions` with what was accepted. **Draft with Claude** in the check-in form fills the boxes to edit. **Suggest lessons with Claude** in the close steps adds lessons to tick. Claude sees project names, scope, task titles, statuses, dates and first names, never private flags. Without a key the buttons are hidden and the app explains how to switch Claude on. **Not yet tried against the live API** (no key on this laptop).
- Data: `projects`, `tasks`, `objectives`, `check_ins`, `flags`, `retrospectives`, `team_suggestions` in the store; migrations `0003` to `0009` (flags' privacy rule is in the database too, as `can_see_flag`).

**Lists** — Organisations, People and Deals share one filter bar (`components/app/filter-bar.tsx`: saved views, filter chips, search; each page passes its own filters as plain data, and `sticky` keeps page settings such as the Deals `view`). People filter by when to speak next, owner, organisation and tag; Deals by when they close, owner, organisation and size, on the board or in a list (`?view=list`). Each list has tick boxes and a bulk bar: People — owner, tag, speak-again date, export, delete; Deals — stage (Lost asks why once for all), owner, close date, export, delete. Deleting is owners and admins only, after a confirm, and keeps linked tasks and history.

**Custom fields** (`components/app/custom-fields.tsx`) — owners and admins add, rename and remove fields on organisations and deals in Settings → Custom fields (text, number, KSh amount, date, or a choice); removing one asks first and deletes its values. Anyone who can edit fills them in with Edit details on the organisation or deal page; every value is checked against its type on the server and noted in the history. Claude can suggest fields (hidden without an API key). Filtering by a custom field and mapping import columns to one are still to do.

**Person pages** — `/people/[id]`: who they are and where they work, one-tap call/WhatsApp/email, when to speak next, details and custom fields (people can carry custom fields now), their deals, colleagues at the same organisation, tasks about them, and their history with a log box. Edit changes name, role, phone, email, organisation, owner, tags and the speak-again date. Every mention of a person links here.

**Notification centre (Phase 5a, part 1)** — a bell in every page's top bar with your unread count and latest 20, and `/notifications` with All / Unread and per-kind filters, grouped by day. Written by `notify()` (`lib/data/notify.ts`) inside the same change as the action: a deal you own moved or handed to you, a task given to you or one you set finished, a check-in on your project, records handed to you, your invite accepted. Never about your own actions, never about private flags, titles safe for a lock screen. Date-based reminders (check-in due on a project you lead, people you own overdue) are made at most once a day when you open the app. Settings → Notifications switches kinds off for yourself. Part 2 (email digests via Resend, quiet hours) needs a Resend key.

**Progressive disclosure** — secondary sections fold away behind their title and a one-line summary (`Band` `fold` prop, the browser's own details element): a project's About and History, a member page's organisations and recent activity, Settings' iPhone install, custom fields and Claude-and-data. Long lists show the first few (`components/app/show-more.tsx`): timelines the latest 6, a project its latest check-in; task lists show open tasks with finished ones behind "Show N finished".

**Team chat (Phase 5b)** — the speech bubble in the top bar, or Ctrl J, opens chat as pigeonholes: **Announcements** (everyone reads, owners and admins post), **Groups** (any member but a viewer starts one; members add people; you can leave; the starter or an owner or admin removes people) and **Direct messages** with anyone in the workspace; a **Project chat** button on each project page; "…" on a message makes a task, saves a note to a record or raises a private flag; typing @ tags people and offers "Make this a task for them?". **Keys are not handled by people.** Messages are stored encrypted by the server (`lib/chat/at-rest.ts`, key in `CHAT_ENCRYPTION_KEY`; on a laptop a key file is made in `.data/`), only members open a chat, owners and admins cannot open chats they are not in, and the app says plainly it is not end-to-end. Decided 7 Oct 2026; the end-to-end version is the git tag `chat-e2ee-last`. **Before going live set `CHAT_ENCRYPTION_KEY`** (32 random bytes, base64) on the server and keep a safe copy: without it stored messages cannot be opened.

Every action returns a result and raises a toast. Lists have skeletons and empty states. `app/(app)/error.tsx` catches the rest.

## What is next, in order

1. **Try the import on the real supplier and Safaricom sheets**, then run the duplicates review on what came in.
2. **Design system** is published (version 11, 3 Oct 2026) with the bands board: lead tones by area, the lead number tile, motion and loading. Regenerate with `python design-system/gen_bands.py` and republish when bands change.
3. **Phase 5 — 5b team chat is built** (see above). Next in Phase 5: email digests and quiet hours for the notification centre (needs Resend). Search in chat is done (a box at the top of the chat list, `searchChats`; the server opens messages only in chats you are in). A closed project's chat is read-only until the project reopens, and the invite page carries a chat privacy line (both done). 5c (recovery keys, safety numbers) is cancelled: nothing to recover.
4. **Push notifications, real sign-in email and sending from the app** are researched in `docs/push-and-email-plan.md` (7 Oct 2026). **Push is built** (7 Oct 2026): Settings, "Banners on this device", `public/sw.js`, `lib/push/`, migration `0011`; it needs `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` (make a new pair for the live site; the laptop pair is in `.env.local`). Not yet done for push: banners for chat messages, quiet hours, a per-workspace banner switch. The rest needs the Supabase project, a domain with Resend, and a Google Cloud project.
5. **Phase 1 is built.** Next: add a Claude API key and try the three Claude features for real; then use Phase 1 on a real project before Phase 2 (a CLAUDE.md rule).
6. **Supabase**, once the flows and the feel are settled. Rewrite `store.ts` as a Postgres adapter, run the migrations (`0001`, then `0002_not_duplicates`), enable Google and magic-link auth, then delete the local store. Merging must become one database function (one transaction) — see the note at the end of `0002`.

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
- **Session B:** Phase 5 — notification centre, then team chat. Start from `docs/phase-5-messaging-and-notifications.md`; it is self-contained.
- **Session C:** Phase 1 — projects, tasks and objectives. Start from `docs/phase-1-projects-and-tasks.md`, then the design system's Phase 1 boards.

Each new session should open this file, then `CLAUDE.md`, then run the app and click through Today, Organisations and Deals before writing anything.
