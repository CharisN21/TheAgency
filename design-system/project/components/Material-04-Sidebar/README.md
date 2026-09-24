# Material · Navigation drawer vs our sidebar

Material (`NavigationDrawerController`): 280px wide on phone, 320 on tablet, opaque surface with `depth4`, a 104px coloured header holding the account, 48px rows with a 32px gap between icon and label, dividers between groups. It slides in over the content in 0.25s and is hidden by default behind a hamburger.

Ours: 232px, always visible on desktop, translucent with a blur, 31px rows, the company switcher on top and the account at the bottom.

**What would change:** a hamburger button and an overlay drawer instead of a permanent sidebar; the account moves to a coloured header; the app bar becomes solid blue with the screen title in it.
