# Build rules for Phase 0

Rules to paste into `CLAUDE.md` before the Phase 0 kickoff prompt, so Claude Code builds to a known standard instead of improvising. Distilled from the `ui-ux-pro-max-skill` catalogue (MIT): 60 Next.js rules and 68 shadcn/ui rules, kept to the ones marked Critical or High.

## Next.js (App Router)

- Server Components by default. Add `'use client'` only where interaction needs it, and push client components as far down the tree as possible.
- Fetch data in Server Components (`async function Page()`), not in effects.
- Set caching explicitly rather than relying on defaults; call `updateTag` after a successful mutation in a Server Action so the writer sees their own write.
- Every route gets `loading.tsx` and `error.tsx` (with a `reset` function). No route left without a loading and an error state.
- Validate and authorise **inside** every Server Action and API route — Zod or similar. Never trust the client.
- Secrets live in `.env.local`, git-ignored, validated at startup. Only `NEXT_PUBLIC_`-prefixed variables reach the browser. The Claude API key and Supabase service key stay server-side.
- `next/link` for internal navigation, `next/image` with explicit width and height for every image, remote domains declared in `next.config.js`.
- Configure CSP headers. Sanitise anything a user typed before it is rendered.
- Avoid layout shift: skeletons with the same shape and aspect ratio as the content they replace.

## shadcn/ui

- `npx shadcn@latest init` first, then add components one at a time; run `--dry-run` to see what the CLI would change before it writes.
- Theme through CSS variables only: complete `:root` and `.dark` sets, mapped with `@theme inline`. Never hard-code a hex in a component.
- Use the component variants rather than one-off classes; keep size variants consistent across the app.
- `Dialog` for forms and detail, `AlertDialog` for destructive confirmations (removing a member, deleting a company), `Sheet` for side panels and the mobile sidebar.
- Sidebar goes inside `SidebarProvider` at the layout level; `Toaster` and `TooltipProvider` at app level.
- Forms: React Hook Form with `Field` + `FieldLabel` + `Input` + `FieldError`. Labels are associated with controls, always visible.
- Let the components manage focus and keyboard behaviour; don't re-implement it.
- Anchors for links, buttons for actions — never a div with a click handler.

## Product rules from our own plan

- Row-Level Security on every table, with an automated test proving a member of one company cannot read another's rows, and that a Member cannot read flags.
- Every list has an empty state; every action that hits the network has a loading state and a success or error result.
- 44px minimum touch targets, visible focus rings, and `prefers-reduced-motion` respected.
- Motion: 150–200ms for hover and press, 200–300ms for route and company switches, 800–1200ms skeleton pulse, all ease-out.
- Pages are stacks of full-width bands: one lead band (accent-soft) first, then plain and soft alternating. Bands arrive with a 240ms rise, staggered 60ms, and rise again as they scroll into view; none of it under reduced motion. See `Layout-01-Bands`.

*Source: [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (MIT), `stacks/nextjs.csv`, `stacks/shadcn.csv`, `ux-guidelines.csv`, `motion.csv`. Rules verified against what Phase 0 builds; product rules are ours.*
