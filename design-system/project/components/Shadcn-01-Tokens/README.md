# shadcn/ui · Theme variables

From `apps/v4/app/globals.css` in [shadcn-ui/ui](https://github.com/shadcn-ui/ui) (MIT). This is the closest system to ours: Next.js + Tailwind + React, which is exactly the stack in the build plan, and the components are copied into your repo rather than installed as a dependency.

- Colours are **roles, not a palette**: `background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`, plus a matching `sidebar-*` set. One hue only (destructive red); everything else is neutral, written in `oklch`.
- `primary` is near-black in light mode and near-white in dark: buttons invert rather than carry a brand colour.
- **Radius**: one base `--radius: 0.625rem` (10px) with sm/md/lg/xl/2xl derived from it — the same 10px card radius we already use.
- Seven neutral base ramps (neutral, stone, zinc, mauve, olive, mist, taupe) are offered at install; colour is meant to be added by you.

**What this would replace in The Agency:** not the look — the *plumbing*. Our tokens would be renamed into these roles so shadcn components work unchanged, with `primary` set to our gold instead of near-black, and `sidebar-*` pointing at our translucent sidebar.
