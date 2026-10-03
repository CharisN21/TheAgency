# Design review, 1 Oct 2026

Charis: "the tabs need more theme contrast and better transitions and loading effects… everything looks the same."

## Done on branch `design/visual-depth`

1. **Each part of the app opens in its own tone** (`Band` tones `maroon` and `ink`, `.band-dark` in `globals.css`). Relationships pages lead in maroon, Work pages in ink with a maroon glow, Workspace pages keep the soft tint. Only existing token values are used; inside a dark band the shared roles are re-pointed to white-on-dark and the dark theme's status colours.
2. **Movement**: pages fade in on arrival (`app/(app)/template.tsx`), and the sidebar or tab-bar link you click shows a sweeping line until its page arrives (`components/app/link-pending.tsx`). Reduced motion turns both off.

3. **Loading** (done 3 Oct): shared `PageSkeleton` in each page's lead tone and shape; every route has `loading.tsx`; shimmer placeholders.
4. **Dark mode** (done 3 Oct): follows the device; Settings → Appearance (match device / light / dark, per device); maroon text uses the soft pink in dark.
5. **Accessibility** (done 3 Oct, two batches): phone tab bar rebuilt (Today, People, Deals, Projects, More opens the menu); one main landmark; skip link; labelled sidebar nav with aria-current; link focus ring; scroll padding; 44px tap areas on touch; saved-view remove reachable; Move button always shown on deal cards; named board columns and owner chips; search and filter fields named; chips marked by outline and aria-current; one h1 per page; BandTitle no longer wraps its action; setup steps announced; "3 days late" instead of "3d late"; toasts with close button, 6 seconds, clear of the tab bar.

## Original plan (kept for reference)

3. **Loading**: shimmer instead of pulse in `components/ui/skeleton.tsx`; a shared page skeleton in the page's own lead tone; `loading.tsx` for the six routes that have none (organisations, organisations/[id], organisations/import, people, deals, settings).
4. **Dark mode**: the design system's dark theme exists in `globals.css` but nothing applies `.dark`. Follow the system setting; first swap `text-primary` links for `text-accent-foreground` in dark (contrast).
5. **Accessibility fixes** (a11y-architect audit, most important first):
   - Mobile tab bar: "Capture" is a dead span and "More" goes to a 404 — phone users cannot reach People, Projects, Team, Flags, Settings except via the header trigger.
   - Saved-view remove button is hover-only (`filter-bar.tsx` ~166) — unreachable by keyboard and touch.
   - Pipeline board "Move deal" menu is hover-only and 24px — touch users can only drag; copy never mentions the menu.
   - Nested `<main>`: `components/ui/sidebar.tsx` ~306 renders `<main>` around each page's `<main>`; change to `<div>`.
   - Selected chips and the active tab shown by tint alone; add `aria-current` / `aria-pressed` and a non-colour cue.
   - Search box and filter selects have no accessible name.
   - Links have no designed focus ring: add `a:focus-visible, summary:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px }`.
   - `scroll-padding` so the sticky header and tab bar do not cover focused items.
   - Below-44px targets on phones: shared `sm`/`xs`/icon button sizes, sidebar trigger and menu buttons, sheet close, checkbox hit area, chips. Use `h-11 md:h-8` style sizes.
   - Today setup checklist: done/not-done not announced; two h1s on Today and the project page; `BandTitle` h2 wraps its action buttons.
   - Board columns unnamed; owner initials chips have no accessible name; sidebar has no `<nav>`.
   - Error toasts vanish after ~4s with no close button and sit over the tab bar.
   - Abbreviations ("3d late") — write "3 days late".
   Checked and fine: text contrast on band tints, reduced motion, details bands, chat controls, task status words.
Still open: group the "Soon" sidebar items; make the most important stat lead; count-up on stat tiles.

Update the design system's Layout-01-Bands board with the new lead tones before publishing it.
