# Material · Scales and type

- **Corner radius** presets 1–9: 2, 4, 8, 12, 16, 20, 24, 28, 32px. Buttons use `cornerRadius1` = 2px.
- **Heights**: 20, 28, 36, 44, 49, 52, 60, 68, 104px. Buttons 36, bars 49–52, drawer header 104.
- **Interim space** 1–19: 0, 1, 2, 4, 8, 12, 16, 20, 24, 28, 32 … 64px — a 4-point grid like ours, with more steps.
- **Depth** 1–5: shadows at 30% black, offset and blur 0.5 / 1 / 2 / 4 / 8px. Material shows hierarchy with shadow where we use hairlines and translucency.
- **Type**: Roboto (Thin / Light / Regular / Medium / Bold), base size 16px, toolbar titles Medium 17, snackbar and buttons Medium 14.

**What this would replace:** our 8/10/14px radii would drop to 2–4px; the system font stack would become Roboto on every platform (so iPhone stops looking native); shadows would get heavier and appear on bars and buttons.
