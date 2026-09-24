# Reference cards: shadcn/ui (github.com/shadcn-ui/ui, MIT), values read from apps/v4 source.
import os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'project', 'components')
GROUP = 'Reference &middot; shadcn/ui'
GROUP2 = 'Reference &middot; Borrowable'

SH = """
.sh { --background:oklch(1 0 0); --foreground:oklch(0.145 0 0); --card:oklch(1 0 0); --popover:oklch(1 0 0);
  --primary:oklch(0.205 0 0); --primary-foreground:oklch(0.985 0 0); --secondary:oklch(0.97 0 0); --secondary-foreground:oklch(0.205 0 0);
  --muted:oklch(0.97 0 0); --muted-foreground:oklch(0.556 0 0); --accentc:oklch(0.97 0 0); --destructive:oklch(0.577 0.245 27.325);
  --border:oklch(0.922 0 0); --input:oklch(0.922 0 0); --ring:oklch(0.708 0 0);
  --sidebar:oklch(0.985 0 0); --sidebar-accent:oklch(0.97 0 0); --sidebar-border:oklch(0.922 0 0);
  --r:0.625rem; --r-sm:calc(var(--r) * 0.6); --r-md:calc(var(--r) * 0.8); --r-lg:var(--r); --r-xl:calc(var(--r) * 1.4);
  font-family:ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; color:var(--foreground); }
.sh.dark { --background:oklch(0.145 0 0); --foreground:oklch(0.985 0 0); --card:oklch(0.205 0 0); --popover:oklch(0.205 0 0);
  --primary:oklch(0.922 0 0); --primary-foreground:oklch(0.205 0 0); --secondary:oklch(0.269 0 0); --secondary-foreground:oklch(0.985 0 0);
  --muted:oklch(0.269 0 0); --muted-foreground:oklch(0.708 0 0); --accentc:oklch(0.371 0 0); --destructive:oklch(0.704 0.191 22.216);
  --border:oklch(1 0 0 / 10%); --input:oklch(1 0 0 / 15%); --ring:oklch(0.556 0 0); --sidebar:oklch(0.205 0 0); --sidebar-accent:oklch(0.269 0 0); --sidebar-border:oklch(1 0 0 / 10%); }
.s-btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; height:36px; padding:0 16px; border:1px solid transparent; border-radius:var(--r-md); font:500 14px/1 inherit; cursor:pointer; background:var(--primary); color:var(--primary-foreground); transition:all 150ms; }
.s-btn.secondary { background:var(--secondary); color:var(--secondary-foreground); }
.s-btn.outline { background:var(--background); color:var(--foreground); border-color:var(--border); box-shadow:0 1px 2px rgba(0,0,0,.05); }
.s-btn.ghost { background:transparent; color:var(--foreground); }
.s-btn.destructive { background:var(--destructive); color:#fff; }
.s-btn.link { background:transparent; color:var(--foreground); text-decoration:underline; text-underline-offset:4px; padding:0; }
.s-btn.xs { height:24px; padding:0 8px; font-size:12px; gap:4px; }
.s-btn.sm { height:32px; padding:0 12px; gap:6px; }
.s-btn.lg { height:40px; padding:0 24px; }
.s-btn.icon { width:36px; padding:0; }
.s-btn.ring { outline:3px solid color-mix(in oklch, var(--ring) 50%, transparent); outline-offset:0; border-color:var(--ring); }
.s-btn[disabled] { opacity:.5; }
.s-btn .ag-ico { width:16px; height:16px; }
.s-card { background:var(--card); border:1px solid var(--border); border-radius:var(--r-xl); }
.s-input { height:36px; border:1px solid var(--input); border-radius:var(--r-md); background:var(--background); padding:0 12px; display:flex; align-items:center; font-size:14px; color:var(--muted-foreground); box-shadow:0 1px 2px rgba(0,0,0,.05); }
.s-badge { display:inline-flex; align-items:center; gap:4px; height:20px; padding:0 8px; border-radius:var(--r-md); font:500 12px/1 inherit; background:var(--secondary); color:var(--secondary-foreground); border:1px solid transparent; }
.s-badge.outline { background:transparent; border-color:var(--border); }
.s-sidebar { width:256px; background:var(--sidebar); border-right:1px solid var(--sidebar-border); padding:8px; display:flex; flex-direction:column; gap:2px; }
.s-item { height:32px; display:flex; align-items:center; gap:8px; padding:0 8px; border-radius:var(--r-md); font:400 14px/1 inherit; color:var(--foreground); }
.s-item.on { background:var(--sidebar-accent); font-weight:500; }
.s-item .ag-ico { width:16px; height:16px; color:var(--muted-foreground); }
.s-label { font:500 12px/1 inherit; color:var(--muted-foreground); padding:8px; }
.s-sep { height:1px; background:var(--sidebar-border); margin:8px 0; }
.s-row { display:flex; align-items:center; gap:12px; padding:10px 12px; border-bottom:1px solid var(--border); font-size:14px; }
.s-av { width:32px; height:32px; border-radius:999px; background:var(--muted); color:var(--muted-foreground); display:flex; align-items:center; justify-content:center; font:500 12px/1 inherit; flex:none; }
.s-bar { height:48px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:12px; padding:0 16px; }
.board { padding:32px; display:flex; flex-direction:column; gap:24px; background:var(--bg); }
.side { display:grid; grid-template-columns:1fr 1fr; gap:24px; align-items:start; }
.lbl { display:flex; align-items:center; gap:8px; font:600 12px/16px var(--font-sans); letter-spacing:.3px; text-transform:uppercase; color:var(--ink-2); margin-bottom:10px; }
.lbl b { padding:2px 8px; border-radius:999px; font-size:11px; }
.lbl .now { background:var(--accent-soft); color:var(--accent-ink); }
.lbl .alt { background:var(--fill-strong); color:var(--ink); }
.frame { border-radius:var(--radius-card); overflow:hidden; box-shadow:var(--shadow-card); border:1px solid var(--separator); }
.swatch { display:flex; align-items:center; gap:10px; padding:6px 0; font:400 12px/16px var(--font-mono); color:var(--ink-2); }
.swatch i { width:36px; height:24px; border-radius:4px; box-shadow:inset 0 0 0 1px rgba(128,128,128,.3); flex:none; display:block; }
"""

TOKENS = [('background', 'oklch(1 0 0)', 'oklch(0.145 0 0)', 'page'),
          ('foreground', 'oklch(0.145 0 0)', 'oklch(0.985 0 0)', 'body text'),
          ('card / popover', 'oklch(1 0 0)', 'oklch(0.205 0 0)', 'raised surfaces'),
          ('primary', 'oklch(0.205 0 0)', 'oklch(0.922 0 0)', 'main button fill (inverts in dark)'),
          ('primary-foreground', 'oklch(0.985 0 0)', 'oklch(0.205 0 0)', 'text on primary'),
          ('secondary / muted / accent', 'oklch(0.97 0 0)', 'oklch(0.269 0 0)', 'quiet fills, hover'),
          ('muted-foreground', 'oklch(0.556 0 0)', 'oklch(0.708 0 0)', 'meta text'),
          ('destructive', 'oklch(0.577 0.245 27.325)', 'oklch(0.704 0.191 22.216)', 'the only hue in the set'),
          ('border / input', 'oklch(0.922 0 0)', 'oklch(1 0 0 / 10%)', 'hairlines, field borders'),
          ('ring', 'oklch(0.708 0 0)', 'oklch(0.556 0 0)', 'focus ring, drawn at 50% in a 3px outline'),
          ('sidebar', 'oklch(0.985 0 0)', 'oklch(0.205 0 0)', 'its own surface token'),
          ('sidebar-accent', 'oklch(0.97 0 0)', 'oklch(0.269 0 0)', 'active nav row')]
BASES = [('neutral', 'oklch(0.205 0 0)'), ('stone', 'oklch(0.216 0.006 56.043)'), ('zinc', 'oklch(0.21 0.006 285.885)'),
         ('mauve', 'oklch(0.212 0.019 322.12)'), ('olive', 'oklch(0.228 0.013 107.4)'), ('mist', 'oklch(0.218 0.008 223.9)'), ('taupe', 'oklch(0.214 0.009 43.1)')]


def write(name, marker, body, readme):
    d = os.path.join(ROOT, name)
    os.makedirs(d, exist_ok=True)
    open(os.path.join(d, 'preview.html'), 'w', encoding='utf-8').write(
        marker + '\n<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><title>' + name + '</title><style>' + SH + '</style></head>\n<body>\n'
        + body + '\n<script>Agency.ready();</script>\n</body>\n</html>\n')
    open(os.path.join(d, 'README.md'), 'w', encoding='utf-8').write(readme.strip() + '\n')


def I(n, cls=''):
    return '<i data-i="%s"%s></i>' % (n, (' class="ag-ico %s"' % cls) if cls else '')


# ---------- 1. tokens ----------
rows_l, rows_d = '', ''
for label, lv, dv, note in TOKENS:
    rows_l += '<div class="swatch"><i style="background:%s"></i><span style="flex:1;color:var(--ink)">%s</span>%s</div>' % (lv, label, lv)
    rows_d += '<div class="swatch"><i style="background:%s"></i><span style="flex:1;color:var(--ink)">%s</span>%s</div>' % (dv, label, dv)
radii = ''.join('<div style="text-align:center"><div style="width:72px;height:56px;background:var(--fill-strong);border-radius:%s"></div><span class="ag-sub">%s<br>%s</span></div>' % (v, n, px)
                for n, v, px in [('--radius-sm', '6px', '6px'), ('--radius-md', '8px', '8px'), ('--radius-lg', '10px', '10px (base)'), ('--radius-xl', '14px', '14px'), ('--radius-2xl', '18px', '18px')])
bases = ''.join('<div style="text-align:center"><div style="width:64px;height:48px;border-radius:8px;background:%s"></div><span class="ag-sub">%s</span></div>' % (v, n) for n, v in BASES)
write('Shadcn-01-Tokens', '<!-- @dsCard group="%s" height=760 width=1000 page subtitle="CSS variables, light and dark" -->' % GROUP,
      '<div class="board"><div><h2 class="ag-h2">shadcn/ui theme variables</h2><p class="ag-sub" style="max-width:680px">From <code>apps/v4/app/globals.css</code>. A small, role-named set (not a colour library): one neutral ramp plus a single destructive hue. Colours are written in <code>oklch</code>. The whole theme is swappable by redefining these variables.</p></div>'
      '<div class="side"><div><div class="lbl"><b class="alt">:root (light)</b></div><div class="ag-card ag-card-pad">' + rows_l + '</div></div>'
      '<div><div class="lbl"><b class="alt">.dark</b></div><div class="ag-card ag-card-pad" style="background:#141414">' + rows_d.replace('color:var(--ink)', 'color:#fafafa') + '</div></div></div>'
      '<div><div class="lbl">Radius scale <span class="ag-sub" style="text-transform:none">— one base (0.625rem = 10px), the rest derived</span></div><div style="display:flex;gap:16px;align-items:flex-end;flex-wrap:wrap">' + radii + '</div></div>'
      '<div><div class="lbl">Base colour options <span class="ag-sub" style="text-transform:none">— seven near-neutral ramps you pick from at install</span></div><div style="display:flex;gap:16px;flex-wrap:wrap">' + bases + '</div></div>'
      '<div class="ag-banner is-gold">' + I('info') + '<span>Their base radius is 10px — exactly our <code>radius-card</code>. Their focus ring is a 3px outline at 50% opacity; ours is 3px solid.</span></div></div>',
      '''
# shadcn/ui · Theme variables

From `apps/v4/app/globals.css` in [shadcn-ui/ui](https://github.com/shadcn-ui/ui) (MIT). This is the closest system to ours: Next.js + Tailwind + React, which is exactly the stack in the build plan, and the components are copied into your repo rather than installed as a dependency.

- Colours are **roles, not a palette**: `background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`, plus a matching `sidebar-*` set. One hue only (destructive red); everything else is neutral, written in `oklch`.
- `primary` is near-black in light mode and near-white in dark: buttons invert rather than carry a brand colour.
- **Radius**: one base `--radius: 0.625rem` (10px) with sm/md/lg/xl/2xl derived from it — the same 10px card radius we already use.
- Seven neutral base ramps (neutral, stone, zinc, mauve, olive, mist, taupe) are offered at install; colour is meant to be added by you.

**What this would replace in The Agency:** not the look — the *plumbing*. Our tokens would be renamed into these roles so shadcn components work unchanged, with `primary` set to our gold instead of near-black, and `sidebar-*` pointing at our translucent sidebar.
''')

# ---------- 2. buttons ----------
sizes = ''.join('<button class="s-btn %s">%s</button>' % (c, l) for c, l in [('xs', 'xs · 24px'), ('sm', 'sm · 32px'), ('', 'default · 36px'), ('lg', 'lg · 40px')])
write('Shadcn-02-Buttons', '<!-- @dsCard group="%s" height=560 width=1000 page subtitle="Six variants, five sizes" -->' % GROUP,
      '<div class="board"><div><h2 class="ag-h2">Buttons</h2><p class="ag-sub">From <code>registry/new-york-v4/ui/button.tsx</code>. Variants and sizes are declared with <code>cva</code>, so the set is fixed and named.</p></div>'
      '<div class="side"><div><div class="lbl"><b class="alt">shadcn/ui</b></div><div class="s-card sh" style="padding:24px;display:flex;flex-direction:column;gap:18px">'
      '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><button class="s-btn">Create company</button><button class="s-btn secondary">Secondary</button><button class="s-btn outline">Outline</button><button class="s-btn ghost">Ghost</button><button class="s-btn destructive">Delete</button><button class="s-btn link">Link</button></div>'
      '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">' + sizes + '<button class="s-btn icon">' + I('more') + '</button><button class="s-btn outline icon">' + I('plus') + '</button></div>'
      '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><button class="s-btn outline ring">Focused</button><button class="s-btn" disabled>Disabled</button><button class="s-btn outline">' + I('userplus') + ' With icon</button></div>'
      '<div style="font-size:13px;color:var(--muted-foreground)">36px default &middot; radius 8px &middot; 14px medium &middot; icons 16px &middot; focus = 3px ring at 50% &middot; disabled = 50% opacity</div>'
      '<div class="s-sep"></div><div style="display:flex;gap:8px"><span class="s-badge">Owner</span><span class="s-badge outline">Admin</span><span class="s-badge" style="background:var(--destructive);color:#fff">Blocked</span></div></div></div>'
      '<div><div class="lbl"><b class="now">The Agency today</b></div><div class="ag-card ag-card-pad" style="display:flex;flex-direction:column;gap:18px">'
      '<div class="ag-row-x"><button class="ag-btn ag-btn-primary">Create company</button><button class="ag-btn ag-btn-secondary">Cancel</button><button class="ag-btn ag-btn-tinted">' + I('userplus') + ' Invite</button><button class="ag-btn ag-btn-plain">Skip for now</button><button class="ag-btn ag-btn-danger">Remove</button></div>'
      '<div class="ag-row-x"><button class="ag-btn ag-btn-secondary" style="height:24px;font-size:12px">24px</button><button class="ag-btn ag-btn-secondary">32px</button><button class="ag-btn ag-btn-secondary ag-btn-lg">44px (iPhone)</button></div>'
      '<div class="ag-sub">32px default &middot; radius 8px &middot; 14px medium &middot; icons 16px &middot; focus = 3px solid ring &middot; sentence case</div>'
      '<div class="ag-hr"></div><div class="ag-row-x"><span class="ag-pill is-gold">Owner</span><span class="ag-pill is-blue">Admin</span><span class="ag-pill is-red"><i></i>Blocked</span></div></div></div></div>'
      '<div class="ag-banner is-gold">' + I('check') + '<span>These are nearly the same button: same radius, same type size, same icon size, same focus idea. Ours is 4px shorter and uses a gold fill where theirs uses near-black.</span></div></div>',
      '''
# shadcn/ui · Buttons

Six variants — `default`, `secondary`, `outline`, `ghost`, `destructive`, `link` — and sizes `xs` 24, `sm` 32, `default` 36, `lg` 40, plus square icon sizes. Radius 8px (`--radius-md`), 14px medium text, 16px icons, `transition-all` on hover, focus draws a 3px ring at 50% opacity, disabled drops to 50%.

Ours maps almost one-to-one: primary → `default`, secondary → `outline`, tinted → `secondary`, plain → `ghost`/`link`, danger → `destructive`.

**Worth borrowing:** the `xs` size (we have nothing that small, useful for dense rows later), the `ghost` hover behaviour, and the variant names themselves — if we name ours the same way, every shadcn component drops in without edits.
''')

# ---------- 3. sidebar ----------
sh_items = ''.join('<div class="s-item%s">%s%s</div>' % (' on' if k == 'today' else '', I(k), l) for k, l in [('today', 'Today'), ('projects', 'Projects'), ('network', 'Network'), ('meetings', 'Meetings'), ('notebook', 'Notebook')])
sh_items2 = ''.join('<div class="s-item">%s%s</div>' % (I(k), l) for k, l in [('team', 'Team'), ('mentor', 'Mentor'), ('settings', 'Settings')])
sh_side = ('<div class="frame sh" style="display:flex;height:480px;background:var(--background)">'
           '<div class="s-sidebar"><div class="s-item" style="height:48px"><span class="s-av" style="width:32px;height:32px;border-radius:8px;background:var(--primary);color:var(--primary-foreground)">K</span><div style="flex:1;line-height:1.2"><div style="font-weight:500">Kilima Labs</div><div style="font-size:12px;color:var(--muted-foreground)">Owner</div></div>' + I('updown') + '</div>'
           '<div class="s-sep"></div><div class="s-label">Platform</div>' + sh_items + '<div class="s-label">Company</div>' + sh_items2 +
           '<div style="margin-top:auto"><div class="s-sep"></div><div class="s-item" style="height:48px"><span class="s-av">CN</span><div style="flex:1;line-height:1.2"><div style="font-weight:500">Charis N.</div><div style="font-size:12px;color:var(--muted-foreground)">charis@…</div></div>' + I('updown') + '</div></div></div>'
           '<div style="flex:1;display:flex;flex-direction:column"><div class="s-bar">' + I('panel') + '<span style="color:var(--muted-foreground)">Kilima Labs / </span><span style="font-weight:500">Today</span><span style="flex:1"></span><div class="s-input" style="width:200px">Search…</div><button class="s-btn sm">Invite</button></div>'
           '<div style="padding:16px;display:flex;flex-direction:column;gap:16px"><div class="s-card" style="padding:20px"><div style="font-weight:600;font-size:16px">Get Kilima Labs set up</div><div style="font-size:14px;color:var(--muted-foreground);margin-top:4px">2 of 4 steps done</div>'
           '<div style="height:8px;background:var(--secondary);border-radius:999px;margin:16px 0"><div style="width:50%;height:8px;background:var(--primary);border-radius:999px"></div></div>'
           '<div style="display:flex;gap:8px"><button class="s-btn sm">Invite your team</button><button class="s-btn sm outline">Install the app</button></div></div></div></div></div>')
ag_side = open(os.path.join(ROOT, 'Material-04-Sidebar', 'preview.html'), encoding='utf-8').read().split('<div class="lbl"><b class="now">')[1].split('</div>\n<script>')[0]
ag_side = ag_side[ag_side.index('<div class="frame"'):]
write('Shadcn-03-Sidebar', '<!-- @dsCard group="%s" height=1100 width=1000 page subtitle="Sidebar block vs ours" -->' % GROUP,
      '<div class="board"><div><h2 class="ag-h2">Sidebar</h2><p class="ag-sub">From <code>ui/sidebar.tsx</code>: 16rem (256px) wide, 18rem on mobile in a sheet, collapses to a 3rem icon rail, toggled with <code>Ctrl/⌘ B</code>, width animates over 200ms linear. Rows are 32px with an 8px radius.</p></div>'
      '<div><div class="lbl"><b class="alt">shadcn sidebar-07 pattern</b> 256px · rows 32px · breadcrumb header · company + account switchers</div>' + sh_side + '</div>'
      '<div><div class="lbl"><b class="now">The Agency sidebar</b> 232px · rows 31px · translucent · switcher on top, account at the bottom</div>' + ag_side + '</div>'
      '<div class="ag-banner is-gold">' + I('info') + '<span>Their header carries a breadcrumb (Company / Screen) and their account switcher sits at the bottom of the sidebar — both worth stealing for the desktop shell.</span></div></div>',
      '''
# shadcn/ui · Sidebar

`SIDEBAR_WIDTH` 16rem (256px), `SIDEBAR_WIDTH_MOBILE` 18rem, `SIDEBAR_WIDTH_ICON` 3rem, keyboard shortcut `Ctrl/⌘ B`, state kept in a cookie, width transitions 200ms linear. Menu rows: 32px, radius 8px, active row = `sidebar-accent` fill + medium weight — the same idea as our gold-tinted active row.

It also ships the pieces we hand-built: `SidebarGroupLabel`, `SidebarMenuBadge`, a rail, and a sheet version for mobile.

**Worth borrowing:** the breadcrumb in the top bar, the account switcher pinned to the bottom, the collapse-to-icons rail, and `Ctrl B` to hide the sidebar. If we adopt this component, our sidebar is a re-skin of theirs rather than new code.
''')

# ---------- 4. icons + motion ----------
def icon_row(stroke, fill, label, note):
    icons = ''.join('<i data-i="%s" class="ag-ico" style="width:28px;height:28px;stroke-width:%s"></i>' % (n, stroke) for n in ['today', 'search', 'bell', 'settings', 'team', 'check'])
    return ('<div style="display:flex;align-items:center;gap:20px;padding:12px 0;border-bottom:1px solid var(--separator)">'
            '<div style="width:150px"><div style="font:500 14px/19px var(--font-sans)">%s</div><div class="ag-sub">%s</div></div>'
            '<div style="display:flex;gap:16px;color:%s">%s</div></div>' % (label, note, fill, icons))
motion = ''
for src, rows in [('The Agency (now)', [('Hover, press, toggle', '150ms ease-out'), ('Popovers, row selection', '200ms ease-out'), ('Sheets sliding in', '250ms ease-out'), ('Reduce motion', 'fade only')]),
                  ('shadcn/ui', [('Buttons, inputs', 'transition-all 150ms'), ('Dialog / popover in', 'fade-in-0 + zoom-in-95, 200ms'), ('Sheet in / out', '500ms in, 300ms out, ease-in-out'), ('Popover by side', 'slide-in-from-top/bottom-2'), ('Sidebar collapse', 'width 200ms linear')]),
                  ('Material (CosmicMind)', [('Button press', 'pulse 0.16s centre / 0.33s spread'), ('Spring expand/contract', '0.15s, damping 0.5'), ('Navigation drawer', '0.25s, velocity-aware')])]:
    motion += '<div><div class="lbl"><b class="alt">%s</b></div><div class="ag-card" style="padding:4px 16px">' % src
    for a, b in rows:
        motion += '<div style="display:flex;justify-content:space-between;gap:16px;padding:8px 0;border-bottom:1px solid var(--separator);font-size:14px"><span>%s</span><code class="ag-sub">%s</code></div>' % (a, b)
    motion += '</div></div>'
write('Borrow-01-IconsMotion', '<!-- @dsCard group="%s" height=900 width=1000 page subtitle="Icon styles and motion values we can take" -->' % GROUP2,
      '<div class="board"><div><h2 class="ag-h2">Icons and motion</h2><p class="ag-sub" style="max-width:700px">Both repos are MIT, so we can copy code, values and assets. shadcn lets you pick the icon library with one setting (<code>iconLibrary</code>): Lucide, Tabler, Phosphor, Remix or Hugeicons. Below: the same six icons drawn at each library\'s stroke spec, then the motion values from all three systems.</p></div>'
      '<div class="ag-card ag-card-pad">'
      + icon_row('2', 'var(--ink)', 'Lucide (current)', '24px grid, 2px stroke, round caps')
      + icon_row('1.75', 'var(--ink)', 'Tabler', '24px grid, 1.75px stroke, round')
      + icon_row('1.5', 'var(--ink)', 'Phosphor regular', '1.5px stroke, softer corners; also has bold and fill weights')
      + icon_row('1.25', 'var(--ink-2)', 'Hugeicons', '1.25–1.5px stroke, lighter overall')
      + icon_row('2.5', 'var(--accent)', 'Heavier weight', 'the same set at 2.5px, for comparison')
      + '</div>'
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;align-items:start">' + motion + '</div>'
      '<div class="ag-banner is-gold">' + I('info') + '<span>Icon shapes here are our Lucide-style set redrawn at each stroke weight, so you can judge the weight, not the exact glyphs. Switching library later is a one-line change in <code>components.json</code>.</span></div></div>',
      '''
# Borrowable · Icons and motion

**Licences.** Material is MIT (its bundled Roboto is Apache 2.0, and its icon PNGs are Google's Material Design icons, also Apache 2.0). shadcn/ui is MIT and is *designed* to be copied into your repo. Lucide is ISC. All of it is free to use commercially, with the licence file kept.

**Icons.** We stay on Lucide unless you prefer a lighter or heavier line. shadcn supports Lucide, Tabler, Phosphor, Remix and Hugeicons, switchable in `components.json`, so this is not a decision we are locked into. Material's icon PNGs are Android-style glyphs and would look out of place next to an iOS-feel shell.

**Motion.** shadcn's values sit right on top of ours (150ms for controls, 200ms for popovers, ease-out), so adopting its components costs nothing in feel. The one thing worth taking from Material is the *idea* of a press response; the ripple itself reads as Android, so a 150ms scale or tint is a better fit.

**Recommendation:** Lucide icons, shadcn motion values, our 150–250ms ease-out envelope, and `prefers-reduced-motion` respected everywhere.
''')
print('ok')
