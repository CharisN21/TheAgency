# Going live: the database and the hosting

Written 10 Oct 2026. Where The Agency stands, what is left, and the steps to put it on a real database (Supabase) and a real address (Vercel).

## Where we are

Everything below works on a laptop today, on the local data file. 263 automated checks pass on every pull request, the production build succeeds, and the 17 database migrations run in order on a real Postgres with row-level security on all 27 tables (`npm run check:migrations`).

| Area | State |
|---|---|
| Phase 0, foundation: sign-in, invites, roles, app shell, installable app | Built |
| Phase 0b, CRM: organisations, people, deals, pipeline, timelines | Built |
| Phase 1, projects and tasks: check-ins, private flags, close and retrospective, objectives, analytics | Built. The three Claude features have never run against the live API (no key yet). Not yet used on a real project. |
| Phase 2: Notebook, whiteboards, sharing, Quick Capture, Ctrl K | Built. Left: a sharper Today, sharing into the app from the phone. |
| Phase 3, network depth: import, merge duplicates, saved views | Mostly built. Left: segments, filtering by custom fields, mapping import columns to custom fields. |
| Phase 4, meetings (Google Calendar and Meet) | Not started |
| Phase 5a, notifications: bell, banners on phone and laptop, quiet hours | Built. Left: email digests (needs Resend). |
| Phase 5b, team chat: announcements, groups, direct messages, project chats, tags, tasks from messages, search | Built |
| Phase 6, AI mentor and insights | Not started |
| Phase 7, harden: offline, backups, data protection, M-Pesa pricing | Not started |
| Access and teams: Main Hub, ventures, founders, logos and their colours, Observers | Built. Left: priority changes approved by the team lead. |
| Real sign-in emails, password reset, sending email from Gmail or Outlook | Waiting for Supabase and a Google Cloud project |

## Why the database comes before the hosting

On Vercel the app cannot keep a data file: each request may run on a fresh machine, and anything written to disk is gone after it. So the order is: database first, then hosting.

## Step 1: what you do (about 30 minutes, no code)

Keep every key out of chat and out of GitHub. You paste them into `.env.local` on your laptop and into Vercel's settings yourself.

1. **Supabase account.** Go to supabase.com, sign up with GitHub (CharisN21).
2. **New project.** Name: `the-agency`. Database password: let it generate one and save it in a password manager. Region: the one nearest Nairobi that it offers (Frankfurt, `eu-central-1`, if there is nothing in Africa). Plan: Free to start; move to Pro (daily backups) before real client data goes in.
3. **Copy three values** from Project Settings, API: the Project URL, the publishable (anon) key and the secret (service role) key. Paste them into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. The secret key is like a master key: never in chat, never in the browser.
4. **Vercel account.** Go to vercel.com, sign up with GitHub. Do not import the project yet; I will say when.

Later, not needed to start: a domain name, a Google Cloud project (for "Continue with Google" and sending from Gmail), a Resend account (email digests), an Anthropic key (Claude features).

## Step 2: what I build (each its own pull request)

1. **Real sign-in.** Supabase Auth: email link, optional password with "Forgot password", Google later. The demo sign-in stays on a laptop only. Founders and invites work as now.
2. **The data layer.** `lib/data/queries.ts` and `lib/data/actions.ts` move from the data file to Postgres, one area at a time (workspaces and people first, then CRM, projects, chat, notebook). The screens do not change. The privacy tests run against Postgres with row-level security on, so rule 1 is proven by the database itself. This is the biggest piece left: expect four to six pull requests.
3. **Files.** Venture logos move to a Supabase Storage bucket.
4. **Run the migrations** on your Supabase project, and set `PLATFORM_OWNER_EMAILS` to your email so you can appoint founders.
5. **Moving your test data**, if you want it: a one-off script copies the laptop's data file into the database. Or start clean.

## Step 3: hosting on Vercel

1. Import `CharisN21/TheAgency` in Vercel. It detects Next.js.
2. Functions region: the same as the database (Frankfurt, `fra1`), so every page is one short hop.
3. Environment variables, in Vercel's settings (all secret except the `NEXT_PUBLIC_` ones):

| Variable | Where it comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase, Project Settings, API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase, secret key |
| `PLATFORM_OWNER_EMAILS` | Your email |
| `CHAT_ENCRYPTION_KEY` | Make a new one (command in `.env.local.example`); keep a safe copy, lost means stored chats cannot be read |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | A new pair: `npx web-push generate-vapid-keys` |
| `ANTHROPIC_API_KEY` | Optional, for Claude features |

4. Every pull request then gets its own preview address; `main` is the live site.
5. Before real users: a domain, Supabase Pro backups, and a privacy notice.

## A faster option, and why I do not recommend it for real data

The whole data file could be stored as one row in Postgres, which would put a working demo online in one session. It has no row-level security, and two people saving at once can overwrite each other. Fine for showing the app to a few people with demo data; not for clients' or staff's information.
