# The Agency — working rules

A personal company operating system and CRM: workspaces, organisations, people, deals and the work around them, for every venture Charis runs. PWA, iPhone/Mac feel, works fully on Windows.

**Charis does not write code by hand.** Explain every step in plain language, keep changes small, and after each step say exactly what to click to test it.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4 + shadcn/ui (radix base, Nova preset) + lucide-react icons
- Supabase: Postgres, Auth (Google + email magic link), Storage, Row-Level Security
- Claude API (server-side only) for team suggestions, check-in drafts, recaps, mentor
- Vercel for hosting, GitHub for the repo

## Design system

The look is fixed and lives in a published design system (maroon `#7c1f35` on warm greige, system font, 8/10/14px radii, 150–250ms ease-out). Do not invent colours, spacing or new components.

- Colours, radii and spacing are CSS variables in `app/globals.css`, mapped to shadcn role names. **Never hard-code a hex in a component.**
- `primary` is the maroon. `accent` / `accent-foreground` is the soft maroon tint used for selected rows. `ok` / `warn` / `destructive` / `info` are status only, and every status also carries a word.
- `brass` is decorative only: the logo ring, the hairline on the landing page. Never text, never a control.
- The brand mark lives in `components/brand/logo.tsx`. The landing-page logo sequence is in `components/brand/logo-intro.tsx` plus the `brand-*` rules at the end of `globals.css`.

## Naming (settled 24 Sep 2026)

- A **workspace** is one of Charis's own ventures (Kilima Labs). It holds the people, the records and the work.
- An **organisation** is a business he deals with: supplier, client, partner, prospect, service provider.
- **People** (contacts) belong to organisations. **Deals** belong to an organisation and usually a person.
- Never use "company" in the interface. It is ambiguous now.

## Rules that do not bend

1. **Row-Level Security on every table**, and every business table carries `workspace_id`. A person only ever sees workspaces they belong to. Write a test proving a member of one workspace cannot read another's rows.
2. **Private flags stay private**: visible only to the person who raised them and to owners and admins.
3. **Secrets in `.env.local` only**, which is git-ignored. Only `NEXT_PUBLIC_`-prefixed variables reach the browser. The Claude API key and the Supabase service key are server-side only.
4. **Validate and authorise inside every Server Action and route handler.** Never trust the client.
5. **Server Components by default**; add `"use client"` only where interaction needs it.
6. **Every route gets `loading.tsx` and `error.tsx`.** Every list gets an empty state. Every action that hits the network gets a loading state and a success or failure result.
7. **44px minimum touch targets**, visible focus rings, `prefers-reduced-motion` respected.
8. **AI gives paths, not answers**, and never assigns anyone automatically — suggestions are accepted line by line.
9. Plain-language copy: sentence case, British/Kenyan spelling, `KSh`, no emoji, no jargon.

## Working style

- Plan first, in plain words. Build in small steps. After each step, say what to click.
- Commit after each working step with a clear message, then push.
- Before changing the database, say what data could be lost.
- Never approve a destructive migration without explaining it first.

## Phases

0. **Foundation** (done, on local data): auth, workspaces, invites, roles, app shell, PWA.
0b. **CRM core** (current): organisations, people, deals and the pipeline board, activity timeline.
1. Projects & Tasks, linked to organisations and deals — scope, AI team structure, assign, track, check-ins, flags, close + retrospective. Tasks can stand without a project, and every member gets weekly, monthly and yearly objectives on their member page. Read `docs/phase-1-projects-and-tasks.md` first.
2. Today dashboard, Quick Capture, Notebook, Ctrl K palette.
3. Network depth: import, merge duplicates, saved views, segments.
4. Meetings (Google Calendar + Meet, notes to tasks).
5. Team comms: **5a** notification centre, then **5b** end-to-end encrypted channels and DMs. Full design in `docs/phase-5-messaging-and-notifications.md` — read it before writing any key-handling code.
6. AI Mentor & Insights (weekly recap, decision log, coaching).
7. Harden & productize (offline, backups, data protection, M-Pesa pricing test).

One phase at a time. Phase 1 must be used on a real project before Phase 2 starts.

`HANDOFF.md` says where the work stands, what is next and how to split phases across sessions. Open it first in a new session.

## Data while we build

There is no database yet, on purpose: the flows and the feel come first. `lib/data/store.ts` keeps everything in one JSON file under `.data/`, behind the same shapes as `supabase/migrations/0001_foundation.sql`. Screens and actions never touch the file directly — they go through `lib/data/queries.ts` and `lib/data/actions.ts`. When Supabase goes in, those two files change and nothing else should.
