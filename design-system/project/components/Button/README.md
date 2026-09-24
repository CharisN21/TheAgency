# Button

Buttons start actions. Use one primary per view; everything else is secondary, tinted or plain.

- **Primary** (`ag-btn ag-btn-primary`): `accent` fill, `on-accent` text. The single main action: "Create company", "Send invite".
- **Secondary** (`ag-btn-secondary`): `surface` with a `control-border` outline. Cancel, alternates.
- **Tinted** (`ag-btn-tinted`): `accent-soft` with `accent-ink`. Helpful but not the main action, e.g. "Invite" in a toolbar.
- **Plain** (`ag-btn-plain`): text only in `accent`. Low-emphasis: "Skip for now", navbar actions on iPhone.
- **Danger** (`ag-btn-danger`): `red` text. Destructive actions always ask to confirm.
- **Large** (`ag-btn-lg`, 44px): all buttons on iPhone and on sign-in, to meet the 44px `touch-target`.
- **Disabled**: add `disabled`. For viewers, show a `lock` icon inside so the reason is visible.

The consumer provides the label (sentence case, a verb first) and an optional leading icon (`<i data-i="…">`).
