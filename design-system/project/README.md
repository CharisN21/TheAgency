The Agency is a personal company operating system: one calm command centre for several ventures, their projects, their people and meetings, which also coaches its owner to lead better. It should look and move like a native iPhone and Mac app, and work just as well on a Windows laptop.

The cards below are the mockups and the components they are made from: the **Phase 0 screens** (sign-in, companies, invites, roles, app shell, iPhone install, landing page), a **component per module for Phases 1–7**, the **brand** (logo, lockups, logo motion), and **reference boards** comparing other systems. The Inventory card lists everything the plan needs and what is still to draw.

Review them, comment on anything, and they become the spec Claude Code builds from.

## Principles

- **Apple feel, works everywhere.** System font, translucent sidebar and tab bar, large titles on iPhone, 3-pane layout on desktop.
- **Trust first.** Private by default. Say who can see what, in plain words, wherever people or data are involved. No public shaming, no leaderboards.
- **Calm over busy.** One accent colour, lots of white space, one primary button per view.
- **Capture in under 5 seconds.** Fewer fields; everything optional except what is truly needed.

## Content fundamentals

- Write to "you"; the app never says "we" except in system messages ("We sent a sign-in link…").
- Sentence case everywhere: buttons, titles, menu items. Buttons start with a verb: "Create company", "Send invite", "Copy link".
- British / Kenyan English spelling: colour, organise, cancelled.
- Dates as `21 Sep 2026` or `Monday, 21 September`; times 24-hour on desktop, the phone's setting on iPhone; money as `KSh 12,500`.
- Explain limits instead of hiding them: "You're a Viewer. You can see everything here but can't change it."
- Empty states state the fact, then what will appear: "Nothing due today. When you create projects, tasks due today show up here."
- Error messages give the fix: "Enter a full email address", never just "Invalid".
- No emoji, no exclamation marks, no jargon (say "company", not "workspace" or "tenant").

## Visual foundations

- **Colour.** Warm greige neutrals plus one accent, a deep maroon (`accent` #7c1f35): primary buttons, the active nav item, links, progress rings and the focus ring. White text sits on it in both themes. `accent-soft` with `accent-ink` for selected and tinted states. `brass` is decorative only — the logo's ring, the hairline under the landing hero — never text, never a control. Status colours only mean status: `green` on track, `amber` (a burnt orange, kept clear of the maroon) at risk or pending, `red` (brighter and more orange than the maroon) blocked or destructive, `blue` in review. Every status also carries a word.
- **Surfaces.** `bg` behind everything (a warm greige, never pure white or pure black), `surface` for panes and cards, `surface-raised` for menus and sheets. `sidebar` and `bar` are translucent with a 20px backdrop blur. `ink` is a near-black carrying a trace of wine, so the neutrals sit with the maroon instead of against it.
- **Text.** `ink` for primary text, `ink-2` for meta lines and placeholders, `ink-3` for icons only. All text pairs pass 4.5:1 in both themes.
- **Type.** The system font stack (`--font-sans`): SF Pro on Apple devices, Segoe UI on Windows. Styles: `large-title` (iPhone titles), `title-1` (onboarding), `title-2` (pane titles), `title-3` (sections), `body`, `callout` (row titles, buttons), `subhead` (meta), `caption` (uppercase labels).
- **Spacing.** 4-point grid: `space-1` 4 through `space-8` 32. Panes use `space-6` padding, cards `space-4`.
- **Radius.** `radius-input` 8px for inputs and buttons, `radius-card` 10px for cards and grouped lists, `radius-sheet` 14px for sheets, `radius-pill` for pills and avatars.
- **Shadows.** Soft and rare: `shadow-card` at rest, `shadow-popover` for menus, `shadow-sheet` for modals. Dark mode uses hairline rings instead.
- **Motion.** Ease-out, `duration-fast` 150ms to `duration-slow` 250ms. Sheets slide up; nothing bounces. Under "reduce motion", fade only.
- **Focus.** A solid 3px `focus-ring` (the accent) with 2px offset on every control.
- **Touch.** Every tappable thing on iPhone is at least `touch-target` 44px.
- **Light and dark** follow the system setting.

## Layout and navigation

- **Desktop:** three panes like Apple Mail. Sidebar (`sidebar-width` 232px: company switcher, Today, Projects, Network, Meetings, Notebook, Team, Mentor, Settings), a list pane (`list-width` 360px), and a detail pane.
- **iPhone:** bottom tab bar with Today · Projects · Capture · Network · More. Large titles, grouped lists, bottom sheets.
- **Company switcher** top-left on desktop; a company chip above the large title on iPhone. Every company's data is kept apart.

## Iconography

Lucide line icons (the look-alike for SF Symbols, whose licence limits them to Apple platforms): 24px grid, 2px stroke, round caps. In code use `lucide-react`. The Icons card lists the set used so far. Icons sit at 18px in lists and the sidebar, 24px in the tab bar.

## Logo

A maroon tile, a white **A** in three strokes, and an open brass ring behind it — the progress ring the app uses, drawn as the brand. Files live in the Logos asset group: `agency-mark.svg`, `agency-mark-ink.svg`, `agency-lockup.svg`, `agency-lockup-reverse.svg`, `agency-wordmark.svg`.

Clear space is a quarter of the tile width. Minimum 20px. The lockup sets THE AGENCY in the system font at 600 with 0.18em letterspacing. Never stretch, recolour, shadow or place it on a photo. See BrandMark.

## Motion

Interface motion is 150–250ms ease-out, and nothing moves more than it must. The landing page is the one exception: the logo plays a 1.5s sequence once (blur-in, stroke draw, per-letter rise on `cubic-bezier(.16, 1, .3, 1)`), and the hero lockup hands off into the navigation bar as the page scrolls — one element moving, not two crossfading. `duration-brand` belongs to that page alone. Everything respects `prefers-reduced-motion`.

## Open decisions for Phase 0

1. Later-phase modules in the sidebar: show them as "Soon" (as mocked) or hide until built?
2. Default role for invite links: Member (as mocked) or Viewer?
3. Invite expiry: 7 days (as mocked)?
4. Do Members see teammates' phone numbers, or only Admins?
5. Sign-in left panel: rings and tagline (as mocked), or a photo?
6. The wordmark is set in the system font. Convert it to outlines, or commission a drawn one?
