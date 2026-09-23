# The Agency

A personal company operating system: projects, people, meetings and leadership coaching for every venture you run. Installable web app (PWA) with an iPhone/Mac feel that works fully on Windows.

**Phase 0 — Foundation.** The shell, the look and the database rules are in place. Sign-in runs in preview mode until you add Supabase keys.

## Run it

```bash
npm run dev
```

Then open http://localhost:3000.

- `/` — the landing page, with the logo sequence
- `/sign-in` — Google and email magic link
- `/today` — the app shell and the setup checklist
- `/team` — members, roles and what each role can do

## Connect Supabase (turns sign-in on)

1. Create a project at [supabase.com](https://supabase.com) — the free tier is enough.
2. Copy `.env.local.example` to `.env.local` and paste in the project URL and anon key from **Project Settings → API**.
3. Open the Supabase **SQL editor** and run `supabase/migrations/0001_foundation.sql`. It creates profiles, companies, memberships, invites and the activity log, with Row-Level Security on all of them.
4. In **Authentication → Providers**, enable Google and Email (magic link).
5. In **Authentication → URL configuration**, add `http://localhost:3000/auth/callback` (and later your Vercel URL) as a redirect URL.
6. Restart `npm run dev`. The preview-mode notice disappears and sign-in works.

## Layout

```
app/
  page.tsx              landing page
  (auth)/sign-in        sign in, check email
  (app)/                the signed-in shell: sidebar + tab bar
    today/              Today
    team/               Team and roles
  auth/callback/        where Google and the magic link return
components/
  brand/                logo, logo sequence
  app/                  sidebar, company switcher, mobile tab bar
  ui/                   shadcn components
lib/supabase/           browser and server clients
supabase/migrations/    SQL, run in order
```

## Rules

`CLAUDE.md` holds the working rules for this repo: design tokens only, RLS on every table, secrets in `.env.local`, server components by default, loading and error states everywhere. Read it before changing anything.
