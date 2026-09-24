# TextField

Single-line input with a label above, optional help or error text below.

- Label: `callout`-weight 13px in `ink`, always visible (no placeholder-only labels).
- Box: `surface`, 1px `control-border`, `radius-input`, 36px tall on desktop, 44px (`is-lg`) on iPhone.
- Placeholder text uses `ink-2`. Focus draws a 3px `focus-ring`. Errors switch the border to `red` and show a one-line fix ("Enter a full email address"), never just "Invalid".
- Selects use the same box with a trailing `down` chevron.

The consumer provides label, value or placeholder, and help or error text.
