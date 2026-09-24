# shadcn/ui · Sidebar

`SIDEBAR_WIDTH` 16rem (256px), `SIDEBAR_WIDTH_MOBILE` 18rem, `SIDEBAR_WIDTH_ICON` 3rem, keyboard shortcut `Ctrl/⌘ B`, state kept in a cookie, width transitions 200ms linear. Menu rows: 32px, radius 8px, active row = `sidebar-accent` fill + medium weight — the same idea as our gold-tinted active row.

It also ships the pieces we hand-built: `SidebarGroupLabel`, `SidebarMenuBadge`, a rail, and a sheet version for mobile.

**Worth borrowing:** the breadcrumb in the top bar, the account switcher pinned to the bottom, the collapse-to-icons rail, and `Ctrl B` to hide the sidebar. If we adopt this component, our sidebar is a re-skin of theirs rather than new code.
