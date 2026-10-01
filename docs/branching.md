# How the repo is organised

Repository: https://github.com/CharisN21/TheAgency

One rule holds everything together: **`main` always works.** Anything on `main` can be shown to someone, and later it is what Vercel puts live. New work happens on a short-lived branch and only reaches `main` once it has been tried.

## Branches

| Branch | What it holds | How long it lives |
|---|---|---|
| `main` | The working app. Nothing is committed here directly. | For ever |
| `feature/<name>` | One new thing, e.g. `feature/person-page`, `feature/phase-5a-notification-centre` | Until it is merged, usually a day or two |
| `fix/<name>` | One repair, e.g. `fix/invite-dialog-opens-twice` | Until it is merged |
| `design/<name>` | Design system boards and tokens, e.g. `design/page-bands` | Until it is merged |
| `docs/<name>` | Plans and notes only, e.g. `docs/phase-2-plan` | Until it is merged |

Names are lowercase words joined by hyphens, saying what the branch does.

## The flow for every piece of work

1. **Start a branch from the latest `main`** — `git switch main`, `git pull`, `git switch -c feature/<name>`.
2. **Build in small steps**, committing after each working step, as before. Push the branch to GitHub as you go (`git push -u origin feature/<name>`), so nothing only lives on one laptop.
3. **Open a pull request** into `main`. The template asks for what changed, what to click to test it, and whether any data changes.
   GitHub then runs the **Checks**: type-check, lint and the privacy tests. A red cross means something broke; do not merge until it is green.
4. **Charis tries it** by following the "what to click" steps (later, on the Vercel preview link GitHub shows on the pull request).
5. **Merge with "Squash and merge"**, so `main` gets one tidy commit per piece of work, then delete the branch. The detailed step-by-step commits stay visible on the pull request.

Two sessions working at once (see HANDOFF.md: CRM depth, Phase 5, Phase 1) each use their own branch, so they never trip over each other; whichever merges second takes in `main` first.

## Milestones

Each finished phase is marked on `main` with a version tag, so you can always see or return to the app as it was:

| Tag | Marks |
|---|---|
| `v0.1.0` | Phase 0: foundation on local data |
| `v0.2.0` | CRM core |
| `v0.3.0` | Phase 1 built |

The next phase finished becomes `v0.4.0`. `v1.0.0` is kept for the first version people outside the team use, once Supabase is in.

## Settings worth switching on in GitHub

These are in the repository's **Settings**, and are Charis's to change:

- **Branches → Add branch ruleset for `main`**: require a pull request before merging, and block force pushes. Nobody, Claude included, can then change `main` without a pull request.
- **General → Pull Requests**: allow squash merging (and turn off the others if you like), and tick "Automatically delete head branches".
- **Branches → the `main` ruleset → Require status checks to pass**, choosing **checks**: then a pull request cannot be merged while the checks are red.
- **Later, with Vercel connected**: every pull request gets its own preview link to click through before merging.
