# The Agency — working rules

A personal company operating system: projects, people, meetings and leadership coaching for every venture Charis runs. PWA, iPhone/Mac feel, works fully on Windows.

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

## Rules that do not bend

1. **Row-Level Security on every table**, and every business table carries `company_id`. A person only ever sees companies they belong to. Write a test proving a member of one company cannot read another's rows.
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

0. **Foundation** (current): auth, companies, invites, roles, app shell, PWA, deploy.
1. Projects & Tasks — scope, AI team structure, assign, track, check-ins, flags, close + retrospective.
2. Today dashboard, Quick Capture, Notebook, Ctrl K palette.
3. My Network (relationship CRM).
4. Meetings (Google Calendar + Meet, notes to tasks).
5. Team comms & alerts (announcements, email, WhatsApp).
6. AI Mentor & Insights (weekly recap, decision log, coaching).
7. Harden & productize (offline, backups, data protection, M-Pesa pricing test).

One phase at a time. Phase 1 must be used on a real project before Phase 2 starts.
