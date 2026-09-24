# Reference cards: CosmicMind/Material (github.com/CosmicMind/Material), values read from the repo source.
import os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'project', 'components')
GROUP = 'Reference &middot; Material'

MAT = """
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@100;300;400;500;700&display=swap');
.mat { --mp:#1976d2; --ms:#2196f3; --mbg:#fafafa; --msurface:#ffffff; --merr:#f44336; --mon:#ffffff;
  --mtxt:rgba(0,0,0,.87); --mtxt2:rgba(0,0,0,.54); --mtxt3:rgba(0,0,0,.38); --mdiv:rgba(0,0,0,.12);
  --d1:0 .5px .5px rgba(0,0,0,.3); --d2:0 1px 1px rgba(0,0,0,.3); --d3:0 2px 2px rgba(0,0,0,.3); --d4:0 4px 4px rgba(0,0,0,.3); --d5:0 8px 8px rgba(0,0,0,.3);
  font-family:Roboto, "Helvetica Neue", Arial, sans-serif; color:var(--mtxt); }
.mat.dark { --mp:#202020; --ms:#009688; --mbg:#303030; --msurface:#303030; --mtxt:#fff; --mtxt2:rgba(255,255,255,.7); --mtxt3:rgba(255,255,255,.5); --mdiv:rgba(255,255,255,.12); }
.m-btn { height:36px; padding:0 16px; border:0; border-radius:2px; font:500 16px/36px Roboto, sans-serif; letter-spacing:.4px; background:transparent; color:var(--mp); cursor:pointer; }
.m-btn.raised { background:var(--ms); color:var(--mon); box-shadow:var(--d2); }
.m-btn.flat-err { color:var(--merr); }
.m-fab { width:56px; height:56px; border-radius:50%; border:0; background:var(--ms); color:var(--mon); box-shadow:var(--d3); display:inline-flex; align-items:center; justify-content:center; }
.m-icon-btn { width:44px; height:44px; border-radius:50%; border:0; background:transparent; color:var(--mtxt2); display:inline-flex; align-items:center; justify-content:center; }
.m-bar { height:52px; background:var(--mp); color:var(--mon); display:flex; align-items:center; gap:16px; padding:0 16px; box-shadow:var(--d2); position:relative; z-index:2; }
.m-bar .t { font:500 17px/1 Roboto, sans-serif; flex:1; }
.m-bar .m-icon-btn { color:var(--mon); }
.m-drawer { width:280px; background:var(--msurface); box-shadow:var(--d4); display:flex; flex-direction:column; position:relative; z-index:3; }
.m-drawer-head { height:104px; background:var(--mp); color:var(--mon); padding:16px; display:flex; flex-direction:column; justify-content:flex-end; gap:4px; }
.m-item { height:48px; display:flex; align-items:center; gap:32px; padding:0 16px; font:400 14px/48px Roboto, sans-serif; color:var(--mtxt); }
.m-item.sel { background:rgba(25,118,210,.12); color:var(--mp); font-weight:500; }
.m-item .ag-ico { color:var(--mtxt2); width:24px; height:24px; }
.m-item.sel .ag-ico { color:var(--mp); }
.m-divider { height:1px; background:var(--mdiv); margin:8px 0; }
.m-card { background:var(--msurface); border-radius:2px; box-shadow:var(--d2); }
.m-chip { height:32px; border-radius:16px; background:#eee; color:var(--mtxt); font:400 13px/32px Roboto, sans-serif; padding:0 12px; display:inline-flex; align-items:center; gap:6px; }
.m-tabs { height:49px; background:var(--msurface); box-shadow:0 -1px 1px rgba(0,0,0,.3); display:grid; grid-template-columns:repeat(4,1fr); }
.m-tab { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; font:400 10px/12px Roboto, sans-serif; color:var(--mtxt3); }
.m-tab.on, .m-tab.on .ag-ico { color:var(--mp); }
.m-tab .ag-ico { width:24px; height:24px; color:var(--mtxt3); }
.m-lrow { display:flex; align-items:center; gap:16px; padding:12px 16px; min-height:72px; }
.m-lrow + .m-lrow { border-top:1px solid var(--mdiv); }
.m-av { width:40px; height:40px; border-radius:50%; background:#e0e0e0; color:var(--mtxt); display:flex; align-items:center; justify-content:center; font:500 14px/1 Roboto, sans-serif; flex:none; }
.m-label { font:500 11px/16px Roboto, sans-serif; letter-spacing:.8px; text-transform:uppercase; color:var(--mtxt2); }
.m-h1 { font:300 34px/40px Roboto, sans-serif; margin:0; }
.m-h2 { font:400 20px/28px Roboto, sans-serif; margin:0; }
.m-body { font:400 16px/24px Roboto, sans-serif; }
.m-cap { font:400 14px/20px Roboto, sans-serif; color:var(--mtxt2); }
.board { padding:32px; display:flex; flex-direction:column; gap:24px; background:var(--bg); }
.side { display:grid; grid-template-columns:1fr 1fr; gap:24px; align-items:start; }
.lbl { display:flex; align-items:center; gap:8px; font:600 12px/16px var(--font-sans); letter-spacing:.3px; text-transform:uppercase; color:var(--ink-2); margin-bottom:10px; }
.lbl b { padding:2px 8px; border-radius:999px; font-size:11px; }
.lbl .now { background:var(--accent-soft); color:var(--accent-ink); }
.lbl .alt { background:#e3f2fd; color:#0d47a1; }
.frame { border-radius:var(--radius-card); overflow:hidden; box-shadow:var(--shadow-card); }
"""

PAL = [('red', '#ffebee', '#ef9a9a', '#f44336', '#d32f2f', '#b71c1c', '#ff5252'),
       ('pink', '#fce4ec', '#f48fb1', '#e91e63', '#c2185b', '#880e4f', '#ff4081'),
       ('purple', '#f3e5f5', '#ce93d8', '#9c27b0', '#7b1fa2', '#4a148c', '#e040fb'),
       ('deepPurple', '#ede7f6', '#b39ddb', '#673ab7', '#512da8', '#311b92', '#7c4dff'),
       ('indigo', '#e8eaf6', '#9fa8da', '#3f51b5', '#303f9f', '#1a237e', '#536dfe'),
       ('blue', '#e3f2fd', '#90caf9', '#2196f3', '#1976d2', '#0d47a1', '#448aff'),
       ('lightBlue', '#e1f5fe', '#81d4fa', '#03a9f4', '#0288d1', '#01579b', '#40c4ff'),
       ('cyan', '#e0f7fa', '#80deea', '#00bcd4', '#0097a7', '#006064', '#18ffff'),
       ('teal', '#e0f2f1', '#80cbc4', '#009688', '#00796b', '#004d40', '#64ffda'),
       ('green', '#e8f5e9', '#a5d6a7', '#4caf50', '#388e3c', '#1b5e20', '#69f0ae'),
       ('lightGreen', '#f1f8e9', '#c5e1a5', '#8bc34a', '#689f38', '#33691e', '#b2ff59'),
       ('lime', '#f9fbe7', '#e6ee9c', '#cddc39', '#afb42b', '#827717', '#eeff41'),
       ('yellow', '#fffde7', '#fff59d', '#ffeb3b', '#fbc02d', '#f57f17', '#ffff00'),
       ('amber', '#fff8e1', '#ffe082', '#ffc107', '#ffa000', '#ff6f00', '#ffd740'),
       ('orange', '#fff3e0', '#ffcc80', '#ff9800', '#f57c00', '#e65100', '#ffab40'),
       ('deepOrange', '#fbe9e7', '#ffab91', '#ff5722', '#e64a19', '#bf360c', '#ff6e40'),
       ('brown', '#efebe9', '#bcaaa4', '#795548', '#5d4037', '#3e2723', ''),
       ('grey', '#fafafa', '#eeeeee', '#9e9e9e', '#616161', '#212121', ''),
       ('blueGrey', '#eceff1', '#b0bec5', '#607d8b', '#455a64', '#263238', '')]
STEPS = ['50', '300', '500', '700', '900', 'A200']


def write(name, marker, body, readme, extra_head=''):
    d = os.path.join(ROOT, name)
    os.makedirs(d, exist_ok=True)
    html = (marker + '\n<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><title>' + name + '</title>'
            + '<style>' + MAT + '</style>' + extra_head + '</head>\n<body>\n' + body
            + '\n<script>Agency.ready();</script>\n</body>\n</html>\n')
    open(os.path.join(d, 'preview.html'), 'w', encoding='utf-8').write(html)
    open(os.path.join(d, 'README.md'), 'w', encoding='utf-8').write(readme.strip() + '\n')


def I(n, cls=''):
    return '<i data-i="%s"%s></i>' % (n, (' class="ag-ico %s"' % cls) if cls else '')


# ---------------- 1. palette ----------------
rows = '<div style="display:grid;grid-template-columns:120px repeat(6,1fr);gap:4px;align-items:center">'
rows += '<span></span>' + ''.join('<span class="ag-caps" style="text-align:center">%s</span>' % s for s in STEPS)
for fam in PAL:
    rows += '<span style="font:500 13px/18px var(--font-sans)">%s</span>' % fam[0]
    for i, hexv in enumerate(fam[1:]):
        if not hexv:
            rows += '<span></span>'
            continue
        dark = i >= 2 and fam[0] not in ('yellow', 'amber', 'lime')
        rows += ('<span style="height:44px;background:%s;border-radius:2px;display:flex;align-items:center;justify-content:center;font:400 10px/1 Roboto,monospace;color:%s">%s</span>'
                 % (hexv, '#fff' if dark else 'rgba(0,0,0,.87)', hexv))
rows += '</div>'
theme_map = ''
for label, val, note in [('primary', '#1976d2', 'blue.darken2 — app bars, active nav'), ('secondary', '#2196f3', 'blue.base — raised buttons, FAB'),
                         ('background', '#ffffff', 'Color.white'), ('surface', '#ffffff', 'cards, dialogs'), ('error', '#f44336', 'red.base'),
                         ('onPrimary / onSecondary', '#ffffff', 'text on those fills')]:
    theme_map += '<div class="m-lrow" style="min-height:52px"><span style="width:40px;height:28px;border-radius:2px;background:%s;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12);flex:none"></span><div style="flex:1"><b style="font:500 14px/20px Roboto,sans-serif">%s</b> <span class="m-cap">%s</span></div><code class="m-cap">%s</code></div>' % (val, label, note, val)
dark_map = ''
for label, val, note in [('primary', '#202020', 'near-black bars'), ('secondary', '#009688', 'teal.base'), ('background / surface', '#303030', 'one grey for both'), ('onBackground / onSurface', '#ffffff', 'all text white')]:
    dark_map += '<div class="m-lrow" style="min-height:52px"><span style="width:40px;height:28px;border-radius:2px;background:%s;box-shadow:inset 0 0 0 1px rgba(255,255,255,.2);flex:none"></span><div style="flex:1"><b style="font:500 14px/20px Roboto,sans-serif">%s</b> <span class="m-cap">%s</span></div><code class="m-cap">%s</code></div>' % (val, label, note, val)
write('Material-01-Palette', '<!-- @dsCard group="%s" height=1180 width=1000 page subtitle="19 colour families, 14 steps each" -->' % GROUP,
      '<div class="board mat"><div><h2 class="ag-h2">Material colour library</h2><p class="ag-sub" style="max-width:640px">Every family from <code>Sources/iOS/Color/Color.swift</code>. The library defines 14 steps per family (50–900 plus A100–A700); six are shown. The Agency currently uses one gold accent plus four status colours.</p></div>'
      + rows +
      '<div class="side"><div><div class="lbl">Theme.light</div><div class="m-card">' + theme_map + '</div></div>'
      '<div><div class="lbl">Theme.dark</div><div class="m-card dark mat dark" style="background:#303030">' + dark_map + '</div></div></div>'
      '<div class="ag-banner is-gold">' + I('info') + '<span>Text colours are opacities, not greys: dark text 87% / 54% / 38%, dividers 12%. Light text 100% / 70% / 50%.</span></div></div>',
      '''
# Material · Colour library

From `Sources/iOS/Color/Color.swift` in [CosmicMind/Material](https://github.com/CosmicMind/Material) (MIT).

19 families × 14 steps (`lighten5`…`darken4`, `accent1`…`accent4`). `Theme` picks six roles from it: `primary` = blue.darken2 `#1976d2`, `secondary` = blue.base `#2196f3`, `background` and `surface` = white, `error` = red.base `#f44336`, `onPrimary` / `onSecondary` = white. The dark theme uses `#202020` bars on a `#303030` ground with teal `#009688` as secondary.

Text is set with black or white at fixed opacities (87 / 54 / 38%, dividers 12%) rather than named greys.

**What this would replace in The Agency:** `accent` (deep gold) and `accent-soft`, plus the neutral `ink` / `ink-2` / `ink-3` scale, which would become opacity-based. Status colours would come from the library (`green.base` `#4caf50`, `amber.base` `#ffc107`, `red.base` `#f44336`) instead of the darker, text-safe ones we picked.
''')

# ---------------- 2. tokens ----------------
def scale(vals, unit, render):
    return '<div style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap">' + ''.join(render(v) for v in vals) + '</div>'
radii = scale([2, 4, 8, 12, 16, 20, 24, 28, 32], 'px', lambda v: '<div style="text-align:center"><div style="width:64px;height:64px;background:var(--ms);border-radius:%dpx"></div><span class="m-cap">%d</span></div>' % (v, v))
heights = scale([20, 28, 36, 44, 49, 52, 60, 68, 104], 'px', lambda v: '<div style="text-align:center"><div style="width:56px;height:%dpx;background:var(--mp);border-radius:2px"></div><span class="m-cap">%d</span></div>' % (v, v))
spaces = scale([1, 2, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64], 'px', lambda v: '<div style="text-align:center"><div style="width:%dpx;height:24px;background:var(--mtxt3);border-radius:1px"></div><span class="m-cap">%d</span></div>' % (v, v))
depths = ''.join('<div style="text-align:center"><div class="m-card" style="width:96px;height:64px;box-shadow:var(--d%d)"></div><span class="m-cap">depth%d</span></div>' % (i, i) for i in range(1, 6))
typ = ''.join('<div style="display:flex;align-items:baseline;gap:16px;padding:6px 0;border-bottom:1px solid var(--mdiv)"><span class="m-cap" style="width:180px">%s</span><span style="font:%s Roboto,sans-serif">The Agency</span></div>' % (n, f)
              for n, f in [('Thin 100 · 34px', '100 34px/40px'), ('Light 300 · 34px (headline)', '300 34px/40px'), ('Regular 400 · 20px', '400 20px/28px'),
                           ('Regular 400 · 16px (body, base pointSize)', '400 16px/24px'), ('Medium 500 · 17px (toolbar title)', '500 17px/24px'),
                           ('Medium 500 · 14px (snackbar, buttons)', '500 14px/20px'), ('Bold 700 · 14px', '700 14px/20px')])
write('Material-02-Tokens', '<!-- @dsCard group="%s" height=1080 width=1000 page subtitle="Radius, height, spacing, depth, Roboto" -->' % GROUP,
      '<div class="board mat"><div><h2 class="ag-h2">Material scales</h2><p class="ag-sub">Read from <code>Type/CornerRadius.swift</code>, <code>Height/HeightPreset.swift</code>, <code>Type/InterimSpace.swift</code>, <code>Type/Depth.swift</code> and <code>Font/</code>.</p></div>'
      '<div><div class="lbl">Corner radius 1–9 <span class="ag-sub" style="text-transform:none">(The Agency: 6 / 8 / 10 / 14 / pill)</span></div>' + radii + '</div>'
      '<div><div class="lbl">Height presets <span class="ag-sub" style="text-transform:none">(bars, rows, buttons)</span></div>' + heights + '</div>'
      '<div><div class="lbl">Interim space 1–19 <span class="ag-sub" style="text-transform:none">(The Agency: 4 / 8 / 12 / 16 / 24 / 32)</span></div>' + spaces + '</div>'
      '<div class="side"><div><div class="lbl">Depth 1–5 <span class="ag-sub" style="text-transform:none">(shadow, 30% black)</span></div><div style="display:flex;gap:16px;flex-wrap:wrap">' + depths + '</div></div>'
      '<div><div class="lbl">Roboto <span class="ag-sub" style="text-transform:none">(bundled in the repo)</span></div>' + typ + '</div></div></div>',
      '''
# Material · Scales and type

- **Corner radius** presets 1–9: 2, 4, 8, 12, 16, 20, 24, 28, 32px. Buttons use `cornerRadius1` = 2px.
- **Heights**: 20, 28, 36, 44, 49, 52, 60, 68, 104px. Buttons 36, bars 49–52, drawer header 104.
- **Interim space** 1–19: 0, 1, 2, 4, 8, 12, 16, 20, 24, 28, 32 … 64px — a 4-point grid like ours, with more steps.
- **Depth** 1–5: shadows at 30% black, offset and blur 0.5 / 1 / 2 / 4 / 8px. Material shows hierarchy with shadow where we use hairlines and translucency.
- **Type**: Roboto (Thin / Light / Regular / Medium / Bold), base size 16px, toolbar titles Medium 17, snackbar and buttons Medium 14.

**What this would replace:** our 8/10/14px radii would drop to 2–4px; the system font stack would become Roboto on every platform (so iPhone stops looking native); shadows would get heavier and appear on bars and buttons.
''')

# ---------------- 3. buttons ----------------
btns = ('<div class="side"><div><div class="lbl"><b class="alt">Material</b></div><div class="m-card" style="padding:24px;display:flex;flex-direction:column;gap:20px">'
        '<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><button class="m-btn">FLAT BUTTON</button><button class="m-btn raised">RAISED BUTTON</button><button class="m-btn flat-err">DELETE</button><button class="m-icon-btn">' + I('more') + '</button><button class="m-fab">' + I('plus') + '</button></div>'
        '<div class="m-cap">36px tall &middot; radius 2 &middot; Roboto Medium &middot; raised = secondary fill + depth2 &middot; FAB 56px + depth3 &middot; every press plays a pulse (ripple)</div>'
        '<div class="m-divider"></div><div style="display:flex;gap:12px;flex-wrap:wrap"><span class="m-chip">' + I('check', 'ag-ico-sm') + 'Owner</span><span class="m-chip" style="background:#e3f2fd;color:#0d47a1">Admin</span><span class="m-chip">Member</span></div>'
        '<div class="m-cap">Chips: 32px, fully rounded, grey ground</div></div></div>'
        '<div><div class="lbl"><b class="now">The Agency today</b></div><div class="ag-card ag-card-pad" style="display:flex;flex-direction:column;gap:20px">'
        '<div class="ag-row-x"><button class="ag-btn ag-btn-primary">Create company</button><button class="ag-btn ag-btn-secondary">Cancel</button><button class="ag-btn ag-btn-tinted">' + I('userplus') + ' Invite</button><button class="ag-btn ag-btn-plain">Skip for now</button><button class="ag-btn ag-btn-danger">Remove</button></div>'
        '<div class="ag-sub">32px tall &middot; radius 8 &middot; system font &middot; sentence case &middot; flat fills, no ripple</div>'
        '<div class="ag-hr"></div><div class="ag-row-x"><span class="ag-pill is-gold">Owner</span><span class="ag-pill is-blue">Admin</span><span class="ag-pill">Member</span><span class="ag-pill is-green"><i></i>On track</span></div>'
        '<div class="ag-sub">Pills: 22px, semibold 12px</div></div></div></div>')
write('Material-03-Buttons', '<!-- @dsCard group="%s" height=520 width=1000 page subtitle="Buttons and chips, side by side" -->' % GROUP,
      '<div class="board"><div><h2 class="ag-h2">Buttons</h2><p class="ag-sub">Material buttons come in four kinds: Flat, Raised, FAB and Icon (<code>Sources/iOS/Button/</code>). All share a pulse animation on press.</p></div>' + btns + '</div>',
      '''
# Material · Buttons vs ours

Material: `FlatButton` and `RaisedButton` are 36px tall with `cornerRadius1` (2px), Roboto Medium, uppercase labels by convention; raised carries `depth2`. `FABButton` is a 56px circle with `depth3`, always the one main action on a screen. `IconButton` is a 44px circle. Every button plays a pulse (ripple) from the touch point.

Ours: 32px (44 on iPhone), radius 8, system font, sentence case, no ripple, and a tinted variant instead of a FAB.

**What would change:** a floating action button in the bottom-right corner replaces our toolbar "Invite" / "＋" buttons, labels go uppercase, and every press ripples.
''')

# ---------------- 4. drawer ----------------
drawer_items = ''
for k, l, sel in [('today', 'Today', True), ('projects', 'Projects', False), ('network', 'Network', False), ('meetings', 'Meetings', False), ('notebook', 'Notebook', False)]:
    drawer_items += '<div class="m-item%s">%s%s</div>' % (' sel' if sel else '', I(k), l)
drawer_items += '<div class="m-divider"></div>'
for k, l in [('team', 'Team'), ('mentor', 'Mentor'), ('settings', 'Settings')]:
    drawer_items += '<div class="m-item">%s%s</div>' % (I(k), l)
drawer = ('<div class="frame" style="display:flex;height:560px;background:var(--mbg)">'
          '<div class="m-drawer"><div class="m-drawer-head"><span class="m-av" style="background:rgba(255,255,255,.25);color:#fff">CN</span><div style="font:500 14px/20px Roboto,sans-serif">Charis N.</div><div style="font:400 14px/20px Roboto,sans-serif;opacity:.7;display:flex;align-items:center;gap:6px">Kilima Labs ' + I('down', 'ag-ico-sm') + '</div></div>' + drawer_items + '</div>'
          '<div style="flex:1;display:flex;flex-direction:column;background:var(--mbg)"><div class="m-bar"><button class="m-icon-btn">' + I('panel') + '</button><span class="t">Today</span><button class="m-icon-btn">' + I('search') + '</button><button class="m-icon-btn">' + I('more') + '</button></div>'
          '<div style="flex:1;padding:16px;position:relative"><div class="m-card" style="padding:16px"><div class="m-label">Get set up</div><div class="m-h2" style="margin-top:4px">2 of 4 done</div><div style="height:4px;background:#e0e0e0;border-radius:2px;margin:16px 0"><div style="width:50%;height:4px;background:var(--ms);border-radius:2px"></div></div><div class="m-cap">Invite your office team &middot; Install on your iPhone</div><div style="display:flex;gap:8px;margin-top:12px"><button class="m-btn">MANAGE</button><button class="m-btn">SHOW ME</button></div></div>'
          '<button class="m-fab" style="position:absolute;right:24px;bottom:24px">' + I('plus') + '</button></div></div></div>')
ours = ('<div class="frame" style="display:flex;height:560px;background:var(--surface);width:100%">'
        '<div style="width:232px;flex:none;display:flex">' + open(os.path.join(ROOT, 'Sidebar', 'preview.html'), encoding='utf-8').read().split('<body>')[1].split('<script>')[0].replace('height:600px;width:232px', 'height:560px;width:232px') + '</div>'
        '<div style="flex:1;display:flex;flex-direction:column;background:var(--bg)"><div class="ag-toolbar" style="background:var(--surface)"><span class="ag-search" style="flex:1">' + I('search') + 'Search <span class="ag-kbd" style="margin-left:auto">Ctrl K</span></span><button class="ag-btn ag-btn-tinted">' + I('userplus') + ' Invite</button></div>'
        '<div style="padding:16px"><div class="ag-card ag-card-pad"><div class="ag-row-x" style="gap:16px"><div class="ag-ring" data-p="50"><span>2/4</span></div><div><h3 class="ag-h3">Get Kilima Labs set up</h3><div class="ag-sub">Invite your office team · Install on your iPhone</div></div></div></div></div></div></div>')
write('Material-04-Sidebar', '<!-- @dsCard group="%s" height=720 width=1000 page subtitle="Navigation drawer vs our sidebar" -->' % GROUP,
      '<div class="board"><div><h2 class="ag-h2">Sidebar</h2><p class="ag-sub">Material\'s <code>NavigationDrawerController</code>: 280px on phone, 320px on tablet, slides over the content with a scrim, 0.25s.</p></div>'
      '<div class="mat"><div class="lbl"><b class="alt">Material drawer</b> 280px · header 104px · rows 48px · depth4</div>' + drawer + '</div>'
      '<div><div class="lbl"><b class="now">The Agency sidebar</b> 232px · rows 31px · translucent, always visible</div>' + ours + '</div></div>',
      '''
# Material · Navigation drawer vs our sidebar

Material (`NavigationDrawerController`): 280px wide on phone, 320 on tablet, opaque surface with `depth4`, a 104px coloured header holding the account, 48px rows with a 32px gap between icon and label, dividers between groups. It slides in over the content in 0.25s and is hidden by default behind a hamburger.

Ours: 232px, always visible on desktop, translucent with a blur, 31px rows, the company switcher on top and the account at the bottom.

**What would change:** a hamburger button and an overlay drawer instead of a permanent sidebar; the account moves to a coloured header; the app bar becomes solid blue with the screen title in it.
''')

# ---------------- 5. compare phone ----------------
def ag_phone():
    src = open(os.path.join(ROOT, 'Screen-12-iPhone-Home', 'preview.html'), encoding='utf-8').read()
    body = src.split('<div class="ag-phones">')[1].split('</div></div><div class="ag-phone-cap">Company switcher sheet</div>')[0]
    return '<div class="ag-phone-wrap">' + body.split('<div class="ag-phone-wrap">')[1].split('<div class="ag-phone-cap">')[0] + '<div class="ag-phone-cap">Now: Apple feel</div></div>'

mat_phone = ('<div class="ag-phone-wrap"><div class="ag-phone mat" style="background:var(--mbg);border-color:#202020">'
             '<div class="ag-status" style="background:#0d47a1;color:#fff;height:44px;padding-top:8px"><span style="font:500 14px/1 Roboto,sans-serif">9:41</span><span class="island" style="width:100px;height:26px;top:6px;margin-left:-50px"></span><span class="bat" style="border-color:#fff"></span></div>'
             '<div class="m-bar" style="height:56px"><button class="m-icon-btn">' + I('panel') + '</button><span class="t">Today</span><button class="m-icon-btn">' + I('search') + '</button><button class="m-icon-btn">' + I('more') + '</button></div>'
             '<div style="flex:1;padding:16px;display:flex;flex-direction:column;gap:16px;position:relative">'
             '<div class="m-card"><div class="m-lrow"><span class="m-av" style="background:#e3f2fd;color:#1976d2">50%</span><div style="flex:1"><div style="font:400 16px/24px Roboto,sans-serif">Get Kilima Labs set up</div><div class="m-cap">2 steps left</div></div>' + I('chevron') + '</div>'
             '<div class="m-lrow"><span class="m-av" style="background:transparent;box-shadow:inset 0 0 0 2px rgba(0,0,0,.38)"></span><div style="flex:1"><div style="font:400 16px/24px Roboto,sans-serif">Invite your office team</div><div class="m-cap">3 invites pending</div></div></div>'
             '<div class="m-lrow"><span class="m-av" style="background:transparent;box-shadow:inset 0 0 0 2px rgba(0,0,0,.38)"></span><div style="flex:1"><div style="font:400 16px/24px Roboto,sans-serif">Add to Home Screen</div><div class="m-cap">One-tap access</div></div></div></div>'
             '<div style="text-align:center;padding:24px 16px;color:var(--mtxt2)"><i data-i="today" class="ag-ico" style="width:40px;height:40px"></i><div class="m-h2" style="margin-top:8px;color:var(--mtxt)">Nothing due today</div><div class="m-cap">Tasks and check-ins show up here once projects start.</div></div>'
             '<button class="m-fab" style="position:absolute;right:16px;bottom:16px">' + I('plus') + '</button></div>'
             '<div class="m-tabs">' + ''.join('<div class="m-tab%s">%s%s</div>' % (' on' if k == 'today' else '', I(k), l) for k, l in [('today', 'Today'), ('projects', 'Projects'), ('network', 'Network'), ('moreTab', 'More')]) + '</div>'
             '</div><div class="ag-phone-cap">Alternative: Material feel</div></div>')
write('Material-05-ComparePhone', '<!-- @dsCard group="%s" height=1020 width=1000 page subtitle="The same Today screen, both ways" -->' % GROUP,
      '<div class="board"><div><h2 class="ag-h2">Today on iPhone, both ways</h2><p class="ag-sub">Same content, same data. Left: large title, translucent 5-tab bar, gold accent, system font. Right: blue app bar with a hamburger, Roboto, cards with shadows, a floating action button, 4 tabs.</p></div>'
      '<div style="display:flex;gap:40px;justify-content:center;padding:8px 0">' + ag_phone() + mat_phone + '</div></div>',
      '''
# Material · Today on iPhone, side by side

The same screen in both languages. Material moves the title into a coloured app bar, replaces the centre Capture tab with a floating action button, sets everything in Roboto, and separates cards with shadows instead of hairlines.

Worth deciding: Material's app bar is a strong, always-visible brand block; our large title is quieter and reads as native iOS. The build plan asks for "Apple feel, works everywhere", so this is the main trade-off to settle before Phase 0.
''')
print('ok')
