# Material · Buttons vs ours

Material: `FlatButton` and `RaisedButton` are 36px tall with `cornerRadius1` (2px), Roboto Medium, uppercase labels by convention; raised carries `depth2`. `FABButton` is a 56px circle with `depth3`, always the one main action on a screen. `IconButton` is a 44px circle. Every button plays a pulse (ripple) from the touch point.

Ours: 32px (44 on iPhone), radius 8, system font, sentence case, no ripple, and a tinted variant instead of a FAB.

**What would change:** a floating action button in the bottom-right corner replaces our toolbar "Invite" / "＋" buttons, labels go uppercase, and every press ripples.
