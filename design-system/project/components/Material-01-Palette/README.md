# Material · Colour library

From `Sources/iOS/Color/Color.swift` in [CosmicMind/Material](https://github.com/CosmicMind/Material) (MIT).

19 families × 14 steps (`lighten5`…`darken4`, `accent1`…`accent4`). `Theme` picks six roles from it: `primary` = blue.darken2 `#1976d2`, `secondary` = blue.base `#2196f3`, `background` and `surface` = white, `error` = red.base `#f44336`, `onPrimary` / `onSecondary` = white. The dark theme uses `#202020` bars on a `#303030` ground with teal `#009688` as secondary.

Text is set with black or white at fixed opacities (87 / 54 / 38%, dividers 12%) rather than named greys.

**What this would replace in The Agency:** `accent` (deep gold) and `accent-soft`, plus the neutral `ink` / `ink-2` / `ink-3` scale, which would become opacity-based. Status colours would come from the library (`green.base` `#4caf50`, `amber.base` `#ffc107`, `red.base` `#f44336`) instead of the darker, text-safe ones we picked.
