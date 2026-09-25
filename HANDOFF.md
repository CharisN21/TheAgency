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

Every action returns a result and raises a toast. Lists have skeletons and empty states. `app/(app)/error.tsx` catches the rest.

## What is next, in order

1. **Try the import on the real supplier and Safaricom sheets**, then run the duplicates review on what came in.
2. **Deal detail page** — deal cards currently link to their organisation.
3. **Bulk actions and filters on people and deals** — the organisations pattern, copied across (`org-table.tsx` and `filter-bar.tsx` are the models).
4. **Custom fields** — per workspace, per object, AI-suggested and approved.
5. **Phase 5 — notifications, then encrypted messaging.** Designed in full: `docs/phase-5-messaging-and-notifications.md`. Build 5a (notification centre, no crypto) before 5b (channels with E2EE).
6. **Phase 1 — Projects and tasks**, linked to organisations and deals.
7. **Supabase**, once the flows and the feel are settled. Rewrite `store.ts` as a Postgres adapter, run the migrations (`0001`, then `0002_not_duplicates`), enable Google and magic-link auth, then delete the local store. Merging must become one database function (one transaction) — see the note at the end of `0002`.

## Where things are

```
app/(app)/            the signed-in shell
  organisations/      list + filter-bar.tsx + org-table.tsx + [id] record page
  deals/              pipeline-board.tsx (drag and drop) + new-deal.tsx
  people/ today/ team/ settings/
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

- **Session A (this one, or its successor):** CRM depth — deal detail, bulk actions on people and deals, custom fields. Import and merge are done. Everything in `lib/data/` and `app/(app)/`.
- **Session B:** Phase 5 — notification centre, then encrypted messaging. Start from `docs/phase-5-messaging-and-notifications.md`; it is self-contained.
- **Session C:** Phase 1 — projects and tasks. Start from the design system's Phase 1 boards.

Each new session should open this file, then `CLAUDE.md`, then run the app and click through Today, Organisations and Deals before writing anything.
