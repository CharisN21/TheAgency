# Phone and laptop notifications, and real email

Status: researched, not built. Written 7 Oct 2026. Three separate jobs that are easy to blur together, so they are kept apart.

## 1. Pop-up notifications on phone and laptop (web push)

**What it does.** When something happens to you (a task assigned, a tag in chat, a deal moved), a banner appears on your phone or laptop even when The Agency is closed, and it sits in the phone's or computer's own notification list. While the app is open you see the in-app toast we already have.

**How it works.** The browser gives the app a private address for that device (a "subscription"). The server sends a small message to that address through Apple's, Google's or Mozilla's push service. A small file, the service worker (`public/sw.js`), wakes up, shows the banner and opens the right page when tapped. It needs no account and no monthly fee: we make our own pair of keys (VAPID) with one command.

**What exists.** The notification centre (rows in `notifications`, per-kind mutes, a poll for the bell) and a PWA manifest. Push becomes one more way to deliver the same rows.

**To build**
1. `public/sw.js` handles `push` (show the banner) and `notificationclick` (open `href`).
2. Table `push_subscriptions`: user, workspace, endpoint, two keys, device label, created, last used. Row-Level Security: only your own rows.
3. Settings, "Notifications on this device": a button that asks permission (browsers only allow this after a tap), saves the subscription, and a "Send me a test" button. Turning off removes it.
4. The server sends with the `web-push` library from the one place a notification row is written, so nothing can notify without a row. Quiet hours hold it. A dead address (the push service says it is gone) is deleted.
5. Keys in `.env.local`: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (an email address). Only the public one reaches the browser.
6. PNG app icons and an apple-touch-icon (iPhone does not use SVG icons well).

**Rules that stay.** The banner text is safe on a lock screen: "Wanjiru moved a deal", never money figures or client names. Chat banners say "New message in Announcements", never the message itself (the server would have to open it, and it would pass through the push company's servers). Tapping goes to the page; the page checks you may see it.

**Limits to tell people plainly**
- **iPhone:** iOS 16.4 or newer, and the app must be added to the Home Screen and opened from that icon. Safari tabs cannot receive push. It takes one "Add to Home Screen" per phone; we show how.
- **Android and laptops (Chrome, Edge, Firefox, Safari 16+):** works in the browser, no install.
- **Testing:** works on localhost for a laptop. To test an iPhone it needs the real `https` address (a Vercel preview is enough).
- If the person taps "Block", the app can only tell them how to allow it again in their phone or browser settings.

**Can start now.** Needs no accounts. About two sessions.

## 2. Sign-in email: register, link, forgot password

**What you described.** Someone is invited, gets an email, sets themselves up, signs in with email and password (or a link), and can reset the password.

**How.** This is Supabase Auth, which sends the emails and handles passwords, resets and Google sign-in. It needs two things from us:
- **Our own sender.** Supabase's built-in sender is for testing (a handful of emails an hour, to team members only). For real use, connect Resend as its SMTP, sending from an address on a domain you own, for example `hello@yourdomain`. That means adding a few DNS records (SPF and DKIM) so the mail lands in the inbox and not in spam.
- **A decision on passwords.** `CLAUDE.md` says Google plus email link, no passwords. You asked for "email and password". Recommendation: keep the email link as the main way in, and add an optional password (set in Settings, or at first sign-in) with "Forgot password" sending a reset link. Anyone can use any email, Google or not; "Continue with Google" is an extra for people who prefer it.

**Needs from you:** a domain you control, a Resend account (the free tier is enough to start), and the Supabase project. Until the Supabase project exists this part cannot be built, because today's demo sign-in stands in for it.

## 3. Sending drafted emails from the app, "and it just sends it"

Two ways, and they are not the same.

**A. From the person's own mailbox (recommended).** Each member taps "Connect your mailbox" once and approves Google (Gmail API, permission `gmail.send`: send only, cannot read their inbox) or Microsoft 365. The email then leaves from their real address, lands in their Sent folder, and replies come to their inbox, with no spam problem.
- Google treats `gmail.send` as a "sensitive" permission. The app needs Google's brand verification (a form, a privacy page, a short video; days to weeks) but not the expensive security audit that reading mail needs. Until verified, only up to 100 listed test users, with a warning screen. If every user is on one Google Workspace you own, an "internal" app skips verification.
- Refresh tokens are stored encrypted on the server, like the chat key, never in the browser, and can be disconnected in Settings.

**B. From a company address through Resend**, with the person's address as Reply-To. Simpler, no Google review, but the mail shows as sent by the company and not by them, and replies do not land in their inbox. Fine for system mail (invites, digests), weaker for personal outreach.

**How it behaves in the app**
- The AI drafts; it never sends. The person reads it, edits, and presses **Send**. Nothing sends by itself (rule 8).
- Every sent email is saved on the person's and the organisation's timeline.
- A daily send cap per person, one-click disconnect, and a visible "Sent from you@gmail.com" line before sending.

**Needs from you:** a Google Cloud project (for Google sign-in and the send permission), a privacy page on your domain, and later the Microsoft equivalent if members use Outlook.

## One email in several workspaces

Already how the data is built: one person (one email, one login) can have a membership in any number of workspaces, with a different role in each, and a switcher in the app. Workspaces are walled off from each other: switching changes everything you see, and the tests prove one workspace cannot read another's rows. This holds when the ventures are unrelated.

- **Banners:** a device belongs to the person, so it gets banners from every workspace they are in, and each banner names the workspace in its second line. Mutes are per workspace already; a per-workspace "banners from this workspace" switch is a small next step.
- **Mailbox (step 3):** one connection per person, but each sent email is saved on the timeline of the workspace it was sent from, never the other.
- **Name:** the display name belongs to the login, so it is the same in every workspace. Role is per workspace. A different name per workspace is possible later if ventures should not know each other.

## Suggested order

1. **Push notifications** (can start now, no accounts).
2. **Supabase project**, real sign-in, Resend as sender, optional password and reset.
3. **Connect your mailbox** and send drafted emails, then the weekly digest email using the same Resend sender.

## Sources

- Next.js on PWAs and push: https://nextjs.org/docs/app/guides/progressive-web-apps
- Provider-free web push with `web-push`: https://dev.to/designly/push-notifications-in-nextjs-with-web-push-a-provider-free-solution-11no
- Resend with Supabase Auth: https://resend.com/blog/how-to-configure-supabase-to-send-emails-from-your-domain
- Gmail API scopes: https://developers.google.com/workspace/gmail/api/auth/scopes
- Google verification guide: https://developer.nylas.com/docs/dev-guide/provider-guides/google/google-verification-security-assessment-guide
