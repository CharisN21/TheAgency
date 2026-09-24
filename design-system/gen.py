# Generates component previews, screen mockups and their READMEs for The Agency design system.
import os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'project', 'components')

def write(name, marker, body, readme, style=''):
    d = os.path.join(ROOT, name)
    os.makedirs(d, exist_ok=True)
    html = (marker + '\n<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><title>' + name + '</title>'
            + ('<style>' + style + '</style>' if style else '') + '</head>\n<body>\n' + body
            + '\n<script>Agency.ready();</script>\n</body>\n</html>\n')
    open(os.path.join(d, 'preview.html'), 'w', encoding='utf-8').write(html)
    if readme is not None:
        open(os.path.join(d, 'README.md'), 'w', encoding='utf-8').write(readme.strip() + '\n')

def I(n, cls=''):
    return '<i data-i="%s"%s></i>' % (n, (' class="ag-ico %s"' % cls) if cls else '')

# ---------- shared fixtures ----------
COS = [('K', 'Kilima Labs', '', 'Owner'), ('N', 'Nairobi PPE Supply', 'c2', 'Owner'), ('R', 'Ridge Moto Spares', 'c3', 'Admin')]
TEAM = [('CN', 'Charis N.', 'Founder', 'Owner', 'gold'),
        ('WK', 'Wanjiru Kamau', 'Operations lead', 'Admin', 'gold'),
        ('OO', 'Otieno Odhiambo', 'Sales', 'Member', ''),
        ('AN', 'Achieng Njeri', 'Procurement', 'Member', ''),
        ('BM', 'Brian Mwangi', 'Accountant', 'Viewer', '')]
ROLE_PILL = {'Owner': 'is-gold', 'Admin': 'is-blue', 'Member': '', 'Viewer': ''}
NAV = [('today', 'Today', False), ('projects', 'Projects', True), ('network', 'Network', True), ('meetings', 'Meetings', True),
       ('notebook', 'Notebook', True), ('team', 'Team', False), ('mentor', 'Mentor', True)]

def co_tile(c, size=''):
    return '<span class="ag-co %s %s">%s</span>' % (c[2], size, c[0])

def sidebar(active='today', co=COS[0], me=('CN', 'Charis N.', 'Owner'), open_=False):
    h = '<aside class="ag-sidebar"><div class="ag-lights"><i></i><i></i><i></i></div>'
    h += '<div class="ag-switcher%s">%s<span class="name">%s</span>%s</div>' % (' is-open' if open_ else '', co_tile(co), co[1], I('updown'))
    for key, label, soon in NAV:
        cls = 'ag-side-item' + (' is-active' if key == active else '') + (' is-soon' if soon else '')
        extra = '<span class="count">Soon</span>' if soon else ''
        if key == 'team':
            h += '<div class="ag-side-sep"></div>'
        h += '<div class="%s">%s%s%s</div>' % (cls, I(key), label, extra)
    h += '<div class="ag-side-item%s">%s%s</div>' % (' is-active' if active == 'settings' else '', I('settings'), 'Settings')
    h += '<div class="ag-side-foot"><span class="ag-av sm gold">%s</span><div style="flex:1;min-width:0"><div style="font:500 13px/17px var(--font-sans)">%s</div><div class="ag-sub" style="font-size:12px;line-height:15px">%s</div></div><span class="ag-kbd">Ctrl K</span></div>' % me
    return h + '</aside>'

def status_bar():
    return '<div class="ag-status"><span>9:41</span><span class="island"></span><span class="bat"></span></div>'

def tabbar(active='today'):
    tabs = [('today', 'Today'), ('projects', 'Projects'), ('capture', 'Capture'), ('network', 'Network'), ('moreTab', 'More')]
    h = '<nav class="ag-tabbar">'
    for k, l in tabs:
        if k == 'capture':
            h += '<div class="ag-tab"><span class="ag-tab-cap">%s</span></div>' % I('plus')
        else:
            h += '<div class="ag-tab%s">%s%s</div>' % (' is-active' if k == active else '', I(k), l)
    return h + '</nav><div class="ag-home-ind"></div>'

def phone(inner, cap, surface=False, tabs=None):
    return ('<div class="ag-phone-wrap"><div class="ag-phone%s">' % (' is-surface' if surface else '') + status_bar() + inner
            + (tabbar(tabs) if tabs else '<div class="ag-home-ind"></div>') + '</div><div class="ag-phone-cap">%s</div></div>' % cap)

def pill(role):
    return '<span class="ag-pill %s">%s</span>' % (ROLE_PILL[role], role)

def member_rows(sel=None, phone_=False):
    h = ''
    for ini, name, title, role, g in TEAM:
        h += ('<div class="ag-lrow%s"><span class="ag-av %s">%s</span><div class="body"><div class="t">%s</div><div class="m">%s</div></div>%s%s</div>'
              % (' is-sel' if sel == name else '', g, ini, name, title, pill(role), I('chevron', 'chev ag-ico-sm') if phone_ else ''))
    return h

# =====================================================================
# COMPONENTS
# =====================================================================
write('Button', '<!-- @dsCard group="Actions" height=150 -->',
'''<div class="ag-pad ag-stack">
<div class="ag-row-x"><button class="ag-btn ag-btn-primary">Create company</button><button class="ag-btn ag-btn-secondary">Cancel</button><button class="ag-btn ag-btn-tinted">%s Invite</button><button class="ag-btn ag-btn-plain">Skip for now</button><button class="ag-btn ag-btn-danger">Remove member</button><button class="ag-btn ag-btn-secondary" disabled>%s Invite</button><button class="ag-btn ag-btn-secondary ag-btn-icon" aria-label="More">%s</button></div>
<div class="ag-row-x"><button class="ag-btn ag-btn-primary ag-btn-lg">Email me a sign-in link</button><button class="ag-btn ag-btn-secondary ag-btn-lg"><b style="font-weight:700">G</b> Continue with Google</button></div>
</div>''' % (I('userplus'), I('lock'), I('more')),
'''
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
''')

write('TextField', '<!-- @dsCard group="Inputs" height=210 -->',
'''<div class="ag-pad" style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:900px">
<div class="ag-field"><label class="ag-label">Company name</label><div class="ag-input"><span class="grow">Kilima Labs</span></div><div class="ag-help">You can rename it later.</div></div>
<div class="ag-field"><label class="ag-label">Work email</label><div class="ag-input is-focus"><span class="grow ph">you@company.co.ke</span></div><div class="ag-help">Focused: 3px <code>focus-ring</code>.</div></div>
<div class="ag-field"><label class="ag-label">Email</label><div class="ag-input is-error"><span class="grow">wanjiru@</span></div><div class="ag-error">Enter a full email address.</div></div>
<div class="ag-field"><label class="ag-label">Role</label><div class="ag-input"><span class="grow">Member</span>%s</div></div>
<div class="ag-field"><label class="ag-label">Search</label><div class="ag-search">%s Search people</div></div>
<div class="ag-field"><label class="ag-label">Large (iPhone)</label><div class="ag-input is-lg"><span class="grow ph">Email address</span></div></div>
</div>''' % (I('down', 'ag-ico-sm'), I('search')),
'''
# TextField

Single-line input with a label above, optional help or error text below.

- Label: `callout`-weight 13px in `ink`, always visible (no placeholder-only labels).
- Box: `surface`, 1px `control-border`, `radius-input`, 36px tall on desktop, 44px (`is-lg`) on iPhone.
- Placeholder text uses `ink-2`. Focus draws a 3px `focus-ring`. Errors switch the border to `red` and show a one-line fix ("Enter a full email address"), never just "Invalid".
- Selects use the same box with a trailing `down` chevron.

The consumer provides label, value or placeholder, and help or error text.
''')

write('SegmentedControl', '<!-- @dsCard group="Inputs" height=110 -->',
'''<div class="ag-pad ag-row-x" style="gap:24px"><div class="ag-seg"><span class="is-on">Members 5</span><span>Invites 2</span></div><div class="ag-seg"><span>Owner</span><span class="is-on">Admin</span><span>Member</span><span>Viewer</span></div><div class="ag-seg"><span class="is-on">Email</span><span>Link</span></div></div>''',
'''
# SegmentedControl

Switches between 2–4 views of the same thing (Members / Invites, Email / Link, List / Board / Timeline in Phase 1).

`fill` track, the selected segment on `surface` with `shadow-card`. Labels are 13px, sentence case, and may carry a count.
Don't use it for actions or for more than four options; use a select instead.
''')

write('StatusPill', '<!-- @dsCard group="Status" height=120 -->',
'''<div class="ag-pad ag-stack"><div class="ag-row-x"><span class="ag-pill is-green"><i></i>On track</span><span class="ag-pill is-amber"><i></i>At risk</span><span class="ag-pill is-red"><i></i>Blocked</span><span class="ag-pill is-blue"><i></i>In review</span><span class="ag-pill"><i></i>Planning</span></div>
<div class="ag-row-x"><span class="ag-pill is-gold">Owner</span><span class="ag-pill is-blue">Admin</span><span class="ag-pill">Member</span><span class="ag-pill">Viewer</span><span class="ag-pill is-amber">Invite pending</span><span class="ag-pill is-red">Expired</span></div></div>''',
'''
# StatusPill

A small rounded label for status and roles. Always a word, never colour alone.

- Status: `is-green` on track / done, `is-amber` at risk / pending, `is-red` blocked / flag / expired, `is-blue` in review, neutral for planning or inactive. Status pills carry a dot (`<i></i>`).
- Roles: Owner `is-gold`, Admin `is-blue`, Member and Viewer neutral. No dot.
- 22px tall, `radius-pill`, 12px semibold text.
''')

write('ProgressRing', '<!-- @dsCard group="Status" height=120 -->',
'''<div class="ag-pad ag-row-x" style="gap:24px"><div class="ag-ring" data-p="72"><span>72%%</span></div><div class="ag-ring is-green" data-p="100"><span>%s</span></div><div class="ag-ring is-amber" data-p="38"><span>38%%</span></div><div class="ag-ring is-red" data-p="15"><span>15%%</span></div><div class="ag-ring" data-p="0"><span>0%%</span></div></div>''' % I('check', 'ag-ico-sm'),
'''
# ProgressRing

Apple Fitness-style ring for project and setup progress. `<div class="ag-ring" data-p="72"><span>72%</span></div>`; `Agency.rings()` draws it.

`accent` by default; `is-green` when complete, `is-amber` at risk, `is-red` blocked, on a `fill-strong` track. The label in the middle is the number, or a check when done.
''')

write('Banner', '<!-- @dsCard group="Status" height=210 -->',
'''<div class="ag-pad ag-stack" style="max-width:640px">
<div class="ag-banner is-amber">%s<span><b>You're a Viewer in Kilima Labs.</b> You can see everything here but can't change it.</span></div>
<div class="ag-banner is-gold">%s<span>Install The Agency on your phone for one-tap access. <b style="color:var(--accent-ink)">Show me how</b></span></div>
<div class="ag-banner is-red">%s<span>This invite link expired on 14 Sep. Ask Wanjiru for a new one.</span></div>
<div><span class="ag-toast">%s Invite link copied</span></div></div>''' % (I('eye'), I('download'), I('alert'), I('check')),
'''
# Banner and Toast

Banners sit at the top of a pane and explain a lasting state. Toasts confirm a quick action and fade after 3 seconds.

- `is-amber` on `amber-soft`: limited access (Viewer mode), pending things.
- `is-gold` on `accent-soft`: helpful tips (install the app).
- `is-red` on `red-soft`: errors and expired links, always with the next step.
- Toast: `ink` fill, `surface` text, bottom-centre, one short line in past tense ("Invite link copied").
''')

write('Avatar', '<!-- @dsCard group="Identity" height=110 -->',
'''<div class="ag-pad ag-row-x" style="gap:16px"><span class="ag-av sm">OO</span><span class="ag-av">AN</span><span class="ag-av lg">BM</span><span class="ag-av gold">CN</span><span class="ag-av lg gold">WK</span><span class="ag-av dash">%s</span></div>''' % I('plus', 'ag-ico-sm'),
'''
# Avatar

A person's initials in a circle (photos replace them when uploaded). Sizes: `sm` 24px (sidebar, dense rows), default 32px (lists), `lg` 44px (detail headers, iPhone).

`fill-strong` with `ink` initials for everyone; `gold` (`accent-soft` / `accent-ink`) marks Owners and Admins. `dash` is the empty "invite someone" slot.
''')

write('CompanyTile', '<!-- @dsCard group="Identity" height=130 -->',
'''<div class="ag-pad ag-row-x" style="gap:16px"><span class="ag-co">K</span><span class="ag-co c2">N</span><span class="ag-co c3">R</span><span class="ag-co c4">S</span><span class="ag-co lg">K</span><span class="ag-co lg c2">N</span><span class="ag-co xl">K</span></div>''',
'''
# CompanyTile

The square mark for a company (venture) in the switcher, invites and settings. Shows the uploaded logo, else the first letter on the company's `accent_color`.

Sizes: 24px in the sidebar and menus, `lg` 44px in lists, `xl` 64px on invite and onboarding screens. Corners `radius-sm`, larger tiles `radius-card`. Starter colours: `accent` (default), `green` (c2), `ink` (c3), `blue` (c4).
''')

write('BrandMark', '<!-- @dsCard group="Identity" height=110 -->',
'''<div class="ag-pad ag-row-x" style="gap:40px"><span class="ag-mark"><b>A</b>The Agency</span><span class="ag-mark" style="font-size:24px"><b style="width:40px;height:40px;font-size:21px;border-radius:10px">A</b>The Agency</span><span class="ag-mark"><b>A</b></span></div>''',
'''
# BrandMark

The Agency has no logo yet, so the mark is type only: a gold `accent` tile with "A" and the name "The Agency" in the system font, bold.

Use it on sign-in, splash, invite emails and the PWA icon. Replace it when a real logo is designed; don't draw a new symbol ad hoc.
''')

write('Sidebar', '<!-- @dsCard group="Navigation" height=620 width=280 -->',
'<div style="height:600px;width:232px;display:flex">' + sidebar('team') + '</div>',
'''
# Sidebar

The desktop left column: company switcher on top, then the modules, then the signed-in person.

- `sidebar` translucent fill with a 20px backdrop blur, `sidebar-width` 232px.
- Items: 14px medium, `accent` icon. The current module is `is-active` (`accent-soft` / `accent-ink`).
- Modules that arrive in later phases show `is-soon` in `ink-2` with a "Soon" tag. (Open decision: show them as "Soon", or hide them until they exist.)
- Order follows the build plan: Today · Projects · Network · Meetings · Notebook, then Team · Mentor · Settings.
- The footer shows the person, their role in this company and the `Ctrl K` hint.
''')

write('CompanySwitcher', '<!-- @dsCard group="Navigation" height=380 -->',
'''<div class="ag-pad" style="display:flex;gap:40px;align-items:flex-start">
<div style="width:232px"><div class="ag-switcher">%s<span class="name">Kilima Labs</span>%s</div></div>
<div class="ag-pop" style="width:280px"><div class="ag-caps">Your companies</div>
<div class="ag-mi">%s<div style="flex:1"><div>Kilima Labs</div><div class="ag-sub" style="font-size:12px;line-height:15px">Owner · 5 people</div></div>%s</div>
<div class="ag-mi is-hi">%s<div style="flex:1"><div>Nairobi PPE Supply</div><div class="ag-muted" style="font-size:12px;line-height:15px">Owner · 3 people</div></div><span class="end ag-kbd" style="background:transparent;color:inherit;border-color:currentColor">Ctrl 2</span></div>
<div class="ag-mi">%s<div style="flex:1"><div>Ridge Moto Spares</div><div class="ag-sub" style="font-size:12px;line-height:15px">Admin · 7 people</div></div></div>
<div class="ag-hr"></div><div class="ag-mi">%sCreate company</div><div class="ag-mi">%sInvite people to Kilima Labs</div><div class="ag-hr"></div><div class="ag-mi">%sSign out</div></div></div>''' % (co_tile(COS[0]), I('updown'), co_tile(COS[0]), I('check', 'end'), co_tile(COS[1]), co_tile(COS[2]), I('plus'), I('userplus'), I('logout')),
'''
# CompanySwitcher

Top-left of the sidebar (Slack / Linear style). Click to open a menu of every company you belong to, with your role and team size.

- The current company has a check. `Ctrl 1…9` jumps straight to a company.
- Menu actions: Create company, Invite people (Owners and Admins only), Sign out.
- Switching reloads every pane for that company only. Data from one company never shows in another.
- On iPhone the same list opens as a bottom sheet from the company chip above the large title.
''')

write('TabBar', '<!-- @dsCard group="Navigation" height=150 width=393 -->',
'<div style="position:relative;width:393px;height:120px;background:var(--bg);overflow:hidden">' + tabbar('today').replace('<div class="ag-home-ind"></div>', '<div class="ag-home-ind"></div>') + '</div>',
'''
# TabBar

The iPhone bottom bar: Today · Projects · Capture · Network · More (Apple HIG: at most 5 tabs).

- `bar` translucent fill with backdrop blur, `tabbar-height` 83px including the home indicator.
- Inactive tabs are `ink-3` icons with `ink-2` labels; the active tab is `accent`.
- Capture is a gold button in the middle that opens Quick Capture (Phase 2). Until then it opens "New…" (company, invite).
- More lists Meetings, Notebook, Team, Mentor and Settings.
''')

write('ListRow', '<!-- @dsCard group="Containers" height=360 -->',
'<div class="ag-pad" style="max-width:520px"><div class="ag-group">' + member_rows('Wanjiru Kamau') + '</div></div>',
'''
# ListRow and grouped list

The workhorse row: leading avatar or icon, a title and meta line, trailing pill or chevron. Rows sit in a `ag-group` (a `surface` card with `radius-card`) separated by inset `separator` hairlines.

- Title 14px medium `ink`; meta 13px `ink-2`.
- Selected row: `fill-strong`. At least 52px tall on desktop and 44px (`touch-target`) on iPhone.
- On iPhone, rows that open something end with a `chevron` in `ink-3`.
''')

write('Menu', '<!-- @dsCard group="Containers" height=260 -->',
'''<div class="ag-pad"><div class="ag-pop" style="width:240px"><div class="ag-mi">%sChange role</div><div class="ag-mi is-hi">%sResend invite</div><div class="ag-mi">%sCopy invite link</div><div class="ag-hr"></div><div class="ag-mi" style="color:var(--red)"><i data-i="trash" style="color:var(--red)"></i>Remove from company</div></div></div>''' % (I('shield'), I('mail'), I('link')),
'''
# Menu

A floating list of actions (right-click, "…" buttons, the company switcher). `surface-raised`, `shadow-popover`, `radius-card`.

The highlighted item fills with `accent` and `on-accent` text. Destructive items are last, in `red`, after a separator.
''')

write('Sheet', '<!-- @dsCard group="Containers" height=460 -->',
'''<div style="position:relative;height:440px"><div class="ag-scrim"><div class="ag-sheet"><div class="ag-sheet-head"><h2 class="ag-h3">Remove Otieno from Kilima Labs?</h2><button class="ag-btn ag-btn-secondary ag-btn-icon" aria-label="Close">%s</button></div>
<div class="ag-sheet-body"><p style="margin:0">Otieno will lose access straight away. Tasks assigned to him stay in their projects and show as unassigned.</p><div class="ag-banner is-gold">%s<span>Nothing is deleted. You can invite him again at any time.</span></div></div>
<div class="ag-sheet-foot"><button class="ag-btn ag-btn-secondary">Cancel</button><button class="ag-btn ag-btn-primary" style="background:var(--red);color:var(--surface)">Remove</button></div></div></div></div>''' % (I('x'), I('info')),
'''
# Sheet

A modal for a focused task or a confirmation, on a `scrim`. Desktop: centred, 480px, `radius-sheet`, `shadow-sheet`. iPhone: slides up from the bottom with a grabber.

Header with a question-style title and a close button, a short body that says what will happen, footer with Cancel then the action on the right. Destructive confirmations say what is kept, not only what is lost.
''')

write('EmptyState', '<!-- @dsCard group="Containers" height=280 -->',
'''<div class="ag-pad" style="max-width:480px"><div class="ag-card ag-empty">%s<h3 class="ag-h3">Nothing due today</h3><p class="ag-sub">When you create a project, tasks due today and check-ins show up here.</p><button class="ag-btn ag-btn-tinted" style="margin-top:8px">%s Invite your team</button></div></div>''' % (I('today'), I('userplus')),
'''
# EmptyState

What a pane shows before there is data. An `ink-3` icon, a `title-3` line that states the fact, one `subhead` line on what will appear here, and at most one tinted action.

Calm, never apologetic, no exclamation marks.
''')

icons_html = '<div class="ag-pad" style="display:grid;grid-template-columns:repeat(8,1fr);gap:16px 8px">'
for n in ['today', 'projects', 'capture', 'network', 'meetings', 'notebook', 'team', 'mentor', 'settings', 'search', 'updown', 'chevron', 'down', 'back', 'check', 'x', 'more', 'moreTab', 'mail', 'link', 'copy', 'share', 'download', 'userplus', 'lock', 'eye', 'shield', 'building', 'inbox', 'bell', 'image', 'clock', 'info', 'alert', 'panel', 'moon', 'phone', 'laptop', 'trash', 'logout', 'arrow', 'refresh']:
    icons_html += '<div style="display:flex;flex-direction:column;align-items:center;gap:6px"><i data-i="%s" class="ag-ico ag-ico-lg"></i><span class="ag-sub" style="font-size:11px">%s</span></div>' % (n, n)
icons_html += '</div>'
write('Icons', '<!-- @dsCard group="Identity" height=380 -->', icons_html,
'''
# Icons

Lucide-style line icons (the build plan's SF Symbols look-alike): 24px grid, 2px stroke, round caps and joins, drawn in `currentColor`.

Write `<i data-i="today"></i>` and call `Agency.icons()`. In code, use the `lucide-react` package with the matching names (sun, folder-kanban, share-2, calendar, notebook, users, sparkles, sliders-horizontal …). Sizes: 18px in lists and the sidebar, 24px in the tab bar, 16px inside buttons. Icons that carry meaning use `ink-2` or a status colour; decorative ones `ink-3`.
''')

# =====================================================================
# SCREENS — desktop
# =====================================================================
W = '<!-- @dsCard group="%s" height=900 width=1360 page subtitle="%s" -->'
DESK = 'Phase 0 · Desktop'
MOB = 'Phase 0 · iPhone'

def win(inner, cls='', style=''):
    return '<div class="ag-canvas"><div class="ag-window %s" style="%s">%s</div></div>' % (cls, style, inner)

# D1 Sign in
signin_left = ('<div style="background:var(--accent-soft);padding:48px;display:flex;flex-direction:column;justify-content:space-between">'
    '<span class="ag-mark"><b>A</b>The Agency</span>'
    '<div><h1 style="font-size:40px;line-height:44px;font-weight:700;letter-spacing:-.6px;margin:0 0 16px;max-width:460px">Every company, project and person in one place.</h1>'
    '<p class="ag-muted" style="margin:0;max-width:420px;font-size:17px;line-height:24px">Run your ventures, remember every relationship and get better at leading, a little every week.</p></div>'
    '<div class="ag-row-x" style="gap:20px"><div class="ag-ring" data-p="72"><span>72%</span></div><div class="ag-ring is-green" data-p="100"><span>' + I('check', 'ag-ico-sm') + '</span></div><div class="ag-ring is-amber" data-p="40"><span>40%</span></div><span class="ag-sub" style="color:var(--ink)">Progress you can see at a glance.</span></div></div>')
signin_right = ('<div style="display:flex;align-items:center;justify-content:center;background:var(--surface)"><div style="width:360px" class="ag-stack">'
    '<h1 class="ag-h1">Sign in</h1><p class="ag-muted" style="margin:0 0 12px">Use your Google account or get a link by email. No passwords.</p>'
    '<button class="ag-btn ag-btn-secondary ag-btn-lg ag-btn-block"><b style="font-weight:700;font-size:17px">G</b> Continue with Google</button>'
    '<div class="ag-row-x" style="gap:12px;margin:8px 0"><div class="ag-hr" style="flex:1"></div><span class="ag-sub">or</span><div class="ag-hr" style="flex:1"></div></div>'
    '<div class="ag-field"><label class="ag-label">Work email</label><div class="ag-input is-lg is-focus"><span class="grow ph">you@company.co.ke</span></div></div>'
    '<button class="ag-btn ag-btn-primary ag-btn-lg ag-btn-block">Email me a sign-in link</button>'
    '<div class="ag-row-x" style="gap:8px;margin-top:16px;align-items:flex-start">' + I('shield') + '<span class="ag-sub">Private by default. Only people you invite can see your company, and you can export or delete your data at any time.</span></div>'
    '</div></div>')
write('Screen-01-SignIn', W % (DESK, 'Sign in: Google or email magic link'), win(signin_left + signin_right, '', 'grid-template-columns:1fr 1fr'),
'''
# Screen 01 · Sign in

First screen for everyone. Two ways in: Google, or an email magic link (Supabase Auth). No passwords.

Review: the headline and sub-copy, whether the left panel should show something else (a photo of your office? your ventures?), and the privacy line under the form (Trust first, Kenya DPA).
''')

# D2 Check email
check = ('<div style="display:flex;align-items:center;justify-content:center;background:var(--bg)"><div class="ag-card" style="width:440px;padding:40px;text-align:center" >'
    '<div style="width:64px;height:64px;border-radius:16px;background:var(--accent-soft);color:var(--accent-ink);display:flex;align-items:center;justify-content:center;margin:0 auto 20px"><i data-i="mail" class="ag-ico" style="width:30px;height:30px"></i></div>'
    '<h1 class="ag-h2">Check your email</h1><p class="ag-muted" style="margin:8px 0 24px">We sent a sign-in link to <b style="color:var(--ink)">charis@example.com</b>. Open it on this device. It works for 1 hour.</p>'
    '<button class="ag-btn ag-btn-secondary ag-btn-lg ag-btn-block">Open Gmail</button>'
    '<div class="ag-row-x" style="justify-content:center;margin-top:16px"><span class="ag-sub">Nothing yet?</span><button class="ag-btn ag-btn-plain">Resend in 0:42</button><span class="ag-sub">·</span><button class="ag-btn ag-btn-plain">Use a different email</button></div>'
    '</div></div>')
write('Screen-02-CheckEmail', W % (DESK, 'After requesting a magic link'), win('<div style="position:absolute;top:24px;left:32px"><span class="ag-mark"><b>A</b>The Agency</span></div>' + check, '', 'grid-template-columns:1fr'),
'''
# Screen 02 · Check your email

Shown after "Email me a sign-in link". Says where the link went, how long it lasts, and how to resend or change the email.
''')

# D3 Create company
swatches = ''.join('<span style="width:28px;height:28px;border-radius:50%%;background:var(--%s);display:inline-block;%s"></span>' % (c, 'box-shadow:0 0 0 2px var(--surface),0 0 0 4px var(--accent)' if c == 'accent' else '') for c in ['accent', 'green', 'blue', 'ink', 'red'])
create_left = ('<div style="padding:48px 64px;display:flex;flex-direction:column;gap:24px;background:var(--surface)">'
    '<div class="ag-row-x" style="justify-content:space-between"><span class="ag-mark"><b>A</b>The Agency</span><span class="ag-sub">Step 1 of 2</span></div>'
    '<div><h1 class="ag-h1">Create your company</h1><p class="ag-muted" style="margin:6px 0 0">A company is a separate space with its own projects, people and data. Add more ventures later.</p></div>'
    '<div class="ag-field"><label class="ag-label">Company name</label><div class="ag-input is-lg is-focus"><span class="grow">Kilima Labs</span></div></div>'
    '<div class="ag-field"><label class="ag-label">Your title here</label><div class="ag-input is-lg"><span class="grow">Founder</span></div><div class="ag-help">Shown to your team next to your name.</div></div>'
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">'
    '<div class="ag-field"><label class="ag-label">Logo <span class="ag-sub">(optional)</span></label><div style="height:88px;border:1px dashed var(--control-border);border-radius:var(--radius-card);display:flex;align-items:center;justify-content:center;gap:8px;color:var(--ink-2);font-size:13px">' + I('image') + 'Drop an image or browse</div></div>'
    '<div class="ag-field"><label class="ag-label">Colour</label><div class="ag-row-x" style="gap:12px;height:40px">' + swatches + '</div><div class="ag-help">Used for the company tile.</div></div></div>'
    '<div class="ag-row-x" style="margin-top:auto;justify-content:flex-end"><button class="ag-btn ag-btn-primary ag-btn-lg">Continue ' + I('arrow') + '</button></div></div>')
create_right = ('<div style="background:var(--bg);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;border-left:1px solid var(--separator)">'
    '<span class="ag-caps">Preview</span>'
    '<div class="ag-card" style="width:280px;padding:10px;background:var(--sidebar)"><div class="ag-switcher is-open" style="margin:0">' + co_tile(COS[0]) + '<span class="name">Kilima Labs</span>' + I('updown') + '</div>'
    '<div class="ag-side-item is-active">' + I('today') + 'Today</div><div class="ag-side-item">' + I('team') + 'Team</div><div class="ag-side-item">' + I('settings') + 'Settings</div></div>'
    '<p class="ag-sub" style="max-width:280px;text-align:center;margin:0">This is how your company appears in the switcher.</p></div>')
write('Screen-03-CreateCompany', W % (DESK, 'Onboarding step 1: name, title, logo, colour'), win(create_left + create_right, '', 'grid-template-columns:1.3fr 1fr'),
'''
# Screen 03 · Create your company

Onboarding step 1, and also what "Create company" in the switcher opens. Fields map to `companies` (name, logo_url, accent_color) and your `memberships.title`. You become the Owner.

Review: which fields are required (only the name is), and whether you want a "What kind of business?" field for later AI suggestions.
''')

# D4 Invite team onboarding
def inv_row(email, role, ph=False):
    return ('<div style="display:grid;grid-template-columns:1fr 160px 32px;gap:8px"><div class="ag-input"><span class="grow%s">%s</span></div><div class="ag-input"><span class="grow">%s</span>%s</div><button class="ag-btn ag-btn-secondary ag-btn-icon" aria-label="Remove" style="height:36px;width:36px">%s</button></div>'
            % (' ph' if ph else '', email, role, I('down', 'ag-ico-sm'), I('x')))
roles_tbl = ''
for r, d in [('Owner', 'Everything, including billing and deleting the company.'), ('Admin', 'Invite people, change roles, see private flags, manage all projects.'),
             ('Member', 'Work on projects they are added to: tasks, comments, check-ins.'), ('Viewer', 'See projects and progress. Cannot create or edit anything.')]:
    roles_tbl += '<div class="ag-lrow flat" style="min-height:44px;align-items:flex-start">%s<div class="body m" style="padding-top:2px">%s</div></div>' % ('<span style="width:72px">' + pill(r) + '</span>', d)
invite_left = ('<div style="padding:48px 64px;display:flex;flex-direction:column;gap:20px;background:var(--surface)">'
    '<div class="ag-row-x" style="justify-content:space-between"><span class="ag-row-x">' + co_tile(COS[0]) + '<b style="font-size:14px">Kilima Labs</b></span><span class="ag-sub">Step 2 of 2</span></div>'
    '<div><h1 class="ag-h1">Invite your office team</h1><p class="ag-muted" style="margin:6px 0 0">They\'ll get an email with a link to join Kilima Labs. They won\'t see your other companies.</p></div>'
    '<div class="ag-stack" style="gap:8px"><div style="display:grid;grid-template-columns:1fr 160px 32px;gap:8px"><span class="ag-label">Email</span><span class="ag-label">Role</span><span></span></div>'
    + inv_row('wanjiru@example.com', 'Admin') + inv_row('otieno@example.com', 'Member') + inv_row('achieng@example.com', 'Member') + inv_row('name@example.com', 'Member', True) +
    '<button class="ag-btn ag-btn-plain" style="align-self:flex-start">' + I('plus') + ' Add another</button></div>'
    '<div class="ag-card ag-card-pad ag-row-x" style="background:var(--bg);box-shadow:none">' + I('link') + '<div style="flex:1"><div style="font:500 14px/19px var(--font-sans)">Or share an invite link</div><div class="ag-sub">Anyone with the link joins as a Member. Expires in 7 days.</div></div><button class="ag-btn ag-btn-secondary">' + I('copy') + ' Copy link</button></div>'
    '<div class="ag-row-x" style="margin-top:auto;justify-content:space-between"><button class="ag-btn ag-btn-plain">Skip for now</button><button class="ag-btn ag-btn-primary ag-btn-lg">Send 3 invites</button></div></div>')
invite_right = ('<div style="background:var(--bg);padding:48px 40px;border-left:1px solid var(--separator);display:flex;flex-direction:column;gap:12px">'
    '<span class="ag-caps">What each role can do</span><div class="ag-group">' + roles_tbl + '</div>'
    '<div class="ag-row-x" style="gap:8px;align-items:flex-start;margin-top:8px">' + I('lock') + '<span class="ag-sub">Private flags are only ever visible to the person who raised them and to Owners and Admins.</span></div></div>')
write('Screen-04-InviteTeam', W % (DESK, 'Onboarding step 2: invite by email or link'), win(invite_left + invite_right, '', 'grid-template-columns:1.3fr 1fr'),
'''
# Screen 04 · Invite your office team

Onboarding step 2. Invite by email with a role per person, or copy a link. Each row creates an `invites` record (email, role, token, expires_at). The right side explains the four roles in plain words.

Review: the role descriptions (these become the permission rules), the default role for link invites (Member), and the 7-day expiry.
''')

# D5 Home shell Today empty
today_list = ('<section class="ag-pane"><div class="ag-toolbar"><span class="ag-search" style="flex:1">' + I('search') + 'Search <span class="ag-kbd" style="margin-left:auto">Ctrl K</span></span></div>'
    '<div class="ag-pane-body"><div><div class="ag-sub">Monday, 21 September</div><h1 class="ag-h2" style="margin-top:2px">Morning, Charis</h1></div>'
    '<div class="ag-card ag-empty" style="box-shadow:none;background:var(--bg);padding:40px 24px">' + I('today') + '<h3 class="ag-h3">Nothing due today</h3><p class="ag-sub">When you create projects, tasks due today, overdue work and check-ins show up here.</p></div></div></section>')
def step(done, title, sub, btn=''):
    mark = ('<span style="width:24px;height:24px;border-radius:50%;background:var(--green);color:var(--surface);display:flex;align-items:center;justify-content:center;flex:none">' + I('check', 'ag-ico-sm') + '</span>') if done else '<span style="width:24px;height:24px;border-radius:50%;border:2px solid var(--control-border);flex:none"></span>'
    return '<div class="ag-lrow flat" style="padding:14px 16px">%s<div class="body"><div class="t"%s>%s</div><div class="m">%s</div></div>%s</div>' % (mark, ' style="color:var(--ink-2);text-decoration:line-through"' if done else '', title, sub, btn)
today_detail = ('<section class="ag-pane is-bg"><div class="ag-toolbar" style="background:var(--surface)"><span class="grow"></span><button class="ag-btn ag-btn-tinted">' + I('userplus') + ' Invite</button></div>'
    '<div class="ag-pane-body" style="padding:32px 40px;gap:20px"><div class="ag-row-x" style="gap:16px"><div class="ag-ring" data-p="50" style="width:56px;height:56px"><span>2/4</span></div><div><h2 class="ag-h2">Get Kilima Labs set up</h2><div class="ag-sub">Four quick steps. About 5 minutes.</div></div></div>'
    '<div class="ag-group">' + step(True, 'Create your company', 'Kilima Labs is ready.') + step(True, 'Sign in on your laptop', 'Signed in with Google.')
    + step(False, 'Invite your office team', '3 invites pending. Wanjiru hasn\'t joined yet.', '<button class="ag-btn ag-btn-secondary">Manage</button>')
    + step(False, 'Install The Agency on your iPhone', 'Open this site in Safari, tap Share, then Add to Home Screen.', '<button class="ag-btn ag-btn-secondary">Show me</button>') + '</div>'
    '<div class="ag-banner is-gold">' + I('info') + '<span>Projects, Network and Meetings unlock as they\'re built. Today will fill up once your first project starts.</span></div></div></section>')
write('Screen-05-HomeToday', W % (DESK, 'App shell: sidebar, list, detail'), win(sidebar('today') + today_list + today_detail),
'''
# Screen 05 · Home (Today, empty)

The 3-pane app shell (Apple Mail style): sidebar, middle list, right detail. In Phase 0 Today is empty, so the detail pane shows a setup checklist with a progress ring.

Review: the greeting, the setup steps, and whether later-phase modules should appear as "Soon" or stay hidden.
''')

# D6 Switcher open
pop = ('<div class="ag-pop" style="position:absolute;left:10px;top:84px;width:290px;z-index:2"><div class="ag-caps">Your companies</div>'
    '<div class="ag-mi">' + co_tile(COS[0]) + '<div style="flex:1"><div>Kilima Labs</div><div class="ag-sub" style="font-size:12px;line-height:15px">Owner · 5 people</div></div>' + I('check') + '</div>'
    '<div class="ag-mi is-hi">' + co_tile(COS[1]) + '<div style="flex:1"><div>Nairobi PPE Supply</div><div style="font-size:12px;line-height:15px">Owner · 3 people</div></div><span class="ag-kbd" style="background:transparent;color:inherit;border-color:currentColor">Ctrl 2</span></div>'
    '<div class="ag-mi">' + co_tile(COS[2]) + '<div style="flex:1"><div>Ridge Moto Spares</div><div class="ag-sub" style="font-size:12px;line-height:15px">Admin · 7 people</div></div><span class="ag-kbd">Ctrl 3</span></div>'
    '<div class="ag-hr"></div><div class="ag-mi">' + I('plus') + 'Create company</div><div class="ag-mi">' + I('userplus') + 'Invite people to Kilima Labs</div><div class="ag-hr"></div><div class="ag-mi">' + I('logout') + 'Sign out</div></div>')
write('Screen-06-CompanySwitcher', W % (DESK, 'Switching between ventures'), win(sidebar('today', open_=True) + today_list + today_detail + pop),
'''
# Screen 06 · Company switcher open

Clicking the company at top-left lists every company you belong to with your role there. Pick one to switch; everything reloads for that company only.

Test from the plan: create two companies and switch between them; a teammate invited to one never sees the other.
''')

# D7 Team
team_list = ('<section class="ag-pane"><div class="ag-toolbar"><h1 class="ag-h3 grow">Team</h1><button class="ag-btn ag-btn-primary">' + I('userplus') + ' Invite</button></div>'
    '<div class="ag-pane-body"><div class="ag-seg" style="align-self:flex-start"><span class="is-on">Members 5</span><span>Invites 2</span></div>'
    '<div class="ag-search">' + I('search') + 'Search people</div><div class="ag-group" style="box-shadow:none;margin:0 -16px;border-radius:0">' + member_rows('Wanjiru Kamau') + '</div></div></section>')
def perm(ok, txt):
    return '<div class="ag-row-x" style="gap:10px;padding:6px 0">%s<span style="font-size:14px">%s</span></div>' % (('<i data-i="check" style="color:var(--green)"></i>' if ok else '<i data-i="x" style="color:var(--ink-3)"></i>'), txt)
team_detail = ('<section class="ag-pane is-bg"><div class="ag-toolbar" style="background:var(--surface)"><span class="grow"></span><button class="ag-btn ag-btn-secondary ag-btn-icon" aria-label="More">' + I('more') + '</button></div>'
    '<div class="ag-pane-body" style="padding:32px 40px;gap:20px"><div class="ag-row-x" style="gap:16px"><span class="ag-av lg gold" style="width:64px;height:64px;font-size:22px">WK</span><div><h2 class="ag-h2">Wanjiru Kamau</h2><div class="ag-sub">Operations lead · Joined 12 Sep 2026</div></div></div>'
    '<div class="ag-group"><div class="ag-lrow flat">' + I('mail') + '<div class="body"><div class="m">Email</div><div class="t">wanjiru@example.com</div></div></div><div class="ag-lrow flat">' + I('phone') + '<div class="body"><div class="m">Phone</div><div class="t">+254 7•• ••• 214</div></div></div></div>'
    '<div class="ag-stack" style="gap:8px"><span class="ag-caps">Role in Kilima Labs</span><div class="ag-seg" style="align-self:flex-start"><span>Owner</span><span class="is-on">Admin</span><span>Member</span><span>Viewer</span></div></div>'
    '<div class="ag-card ag-card-pad"><div class="ag-sub" style="margin-bottom:4px">As an Admin, Wanjiru can</div>' + perm(True, 'Invite people and change roles') + perm(True, 'Create and manage every project') + perm(True, 'See private flags') + perm(False, 'Delete the company or transfer ownership') + '</div>'
    '<div><button class="ag-btn ag-btn-danger">Remove from Kilima Labs</button></div></div></section>')
write('Screen-07-Team', W % (DESK, 'Members, roles and permissions'), win(sidebar('team') + team_list + team_detail),
'''
# Screen 07 · Team

Members of the current company with their titles and roles (`memberships`). Selecting someone opens their detail: contact, role picker, and a plain-language list of what that role allows.

Review: the permission lines per role, and whether phone numbers should be masked for Members (privacy by default).
''')

# D8 Invite sheet
role_opts = ''
for r, d, on in [('Admin', 'Invite people, manage projects, see flags', False), ('Member', 'Work on projects they are added to', True), ('Viewer', 'See only. Good for accountants and advisers', False)]:
    role_opts += ('<div class="ag-lrow flat" style="min-height:48px;%s">%s<div class="body"><div class="t">%s</div><div class="m">%s</div></div></div>'
                  % ('background:var(--accent-soft)' if on else '', ('<span style="width:18px;height:18px;border-radius:50%;border:5px solid var(--accent);flex:none"></span>' if on else '<span style="width:18px;height:18px;border-radius:50%;border:2px solid var(--control-border);flex:none"></span>'), r, d))
sheet = ('<div class="ag-scrim" style="z-index:3"><div class="ag-sheet" style="width:520px"><div class="ag-sheet-head"><h2 class="ag-h3">Invite to Kilima Labs</h2><button class="ag-btn ag-btn-secondary ag-btn-icon" aria-label="Close">' + I('x') + '</button></div>'
    '<div class="ag-sheet-body"><div class="ag-seg" style="align-self:flex-start"><span class="is-on">Email</span><span>Link</span></div>'
    '<div class="ag-field"><label class="ag-label">Email addresses</label><div class="ag-input is-focus" style="height:auto;min-height:36px;padding:5px 8px;flex-wrap:wrap"><span class="ag-pill">kevin.m@example.com ' + I('x', 'ag-ico-sm') + '</span><span class="ph grow">Add another…</span></div><div class="ag-help">Separate with commas. Each person gets their own link.</div></div>'
    '<div class="ag-field"><label class="ag-label">Role</label><div class="ag-group" style="box-shadow:none;border:1px solid var(--separator)">' + role_opts + '</div></div>'
    '<div class="ag-row-x" style="gap:8px">' + I('clock') + '<span class="ag-sub">Link expires in 7 days · Only works for this email</span></div></div>'
    '<div class="ag-sheet-foot"><button class="ag-btn ag-btn-secondary">Cancel</button><button class="ag-btn ag-btn-primary">Send invite</button></div></div></div>')
write('Screen-08-InviteSheet', W % (DESK, 'Create an invite with a role'), win(sidebar('team') + team_list + team_detail + sheet),
'''
# Screen 08 · Invite sheet

Opened from "Invite" on Team. Email tab: one or more addresses and a role. Link tab: a shareable link with a role and expiry (copy, or share on WhatsApp). Creates rows in `invites`.
''')

# D9 Accept invite
accept = ('<div style="display:flex;align-items:center;justify-content:center;background:var(--bg)"><div class="ag-card" style="width:460px;padding:40px;text-align:center">'
    '<div style="display:flex;justify-content:center;margin-bottom:20px">' + co_tile(COS[0], 'xl') + '</div>'
    '<div class="ag-sub">Wanjiru Kamau invited you to join</div><h1 class="ag-h1" style="margin:4px 0 12px">Kilima Labs</h1>'
    '<div style="margin-bottom:20px">' + pill('Member') + '</div>'
    '<div class="ag-card ag-card-pad" style="background:var(--bg);box-shadow:none;text-align:left;margin-bottom:24px"><div class="ag-sub" style="margin-bottom:4px">As a Member you can</div>' + perm(True, 'See and update tasks assigned to you') + perm(True, 'Comment and post check-ins on your projects') + perm(False, 'See private flags or other companies') + '</div>'
    '<div class="ag-stack" style="gap:10px"><button class="ag-btn ag-btn-primary ag-btn-lg ag-btn-block"><b style="font-weight:700">G</b> Join with Google</button><button class="ag-btn ag-btn-secondary ag-btn-lg ag-btn-block">Join with email link</button></div>'
    '<p class="ag-sub" style="margin:20px 0 0">Invite for kevin.m@example.com · expires 28 Sep</p></div></div>')
write('Screen-09-AcceptInvite', W % (DESK, 'What an invited teammate sees'), win('<div style="position:absolute;top:24px;left:32px"><span class="ag-mark"><b>A</b>The Agency</span></div>' + accept, '', 'grid-template-columns:1fr'),
'''
# Screen 09 · Accept invite

The page an invite link opens. Shows who invited them, which company, their role and what it allows, then sign-in. After joining they land on Today inside that company only.
''')

# D10 Viewer mode
viewer_list = team_list.replace('<button class="ag-btn ag-btn-primary">' + I('userplus') + ' Invite</button>', '<button class="ag-btn ag-btn-secondary" disabled>' + I('lock') + ' Invite</button>')
viewer_list = viewer_list.replace('<div class="ag-pane-body">', '<div class="ag-pane-body"><div class="ag-banner is-amber">' + I('eye') + '<span><b>You\'re a Viewer.</b> You can see everything here but can\'t change it.</span></div>', 1)
viewer_detail = team_detail.replace('<div class="ag-seg" style="align-self:flex-start"><span>Owner</span><span class="is-on">Admin</span><span>Member</span><span>Viewer</span></div>', '<div>' + pill('Admin') + '</div>')
viewer_detail = viewer_detail.replace('<div><button class="ag-btn ag-btn-danger">Remove from Kilima Labs</button></div>', '').replace('+254 7•• ••• 214', 'Hidden from Viewers')
write('Screen-10-ViewerMode', W % (DESK, 'Read-only for the Viewer role'), win(sidebar('team', me=('BM', 'Brian Mwangi', 'Viewer')) + viewer_list + viewer_detail),
'''
# Screen 10 · Viewer mode

The same Team screen seen by Brian, a Viewer. A banner explains the limit, action buttons are disabled with a lock, the role picker becomes a plain label, and private details are hidden.

Test from the plan: a Viewer cannot create or edit anything.
''')

# =====================================================================
# SCREENS — iPhone
# =====================================================================
PW = '<!-- @dsCard group="%s" height=1000 width=1380 page subtitle="%s" -->'

m_signin = ('<div class="ag-phone-body" style="justify-content:center;padding:0 24px 40px;gap:14px"><div style="display:flex;justify-content:center;margin-bottom:12px"><span class="ag-mark" style="flex-direction:column;gap:14px;font-size:22px"><b style="width:64px;height:64px;font-size:32px;border-radius:16px">A</b>The Agency</span></div>'
    '<p class="ag-muted" style="text-align:center;margin:0 0 16px">Every company, project and person in one place.</p>'
    '<button class="ag-btn ag-btn-secondary ag-btn-lg ag-btn-block"><b style="font-weight:700">G</b> Continue with Google</button>'
    '<div class="ag-row-x" style="gap:12px"><div class="ag-hr" style="flex:1"></div><span class="ag-sub">or</span><div class="ag-hr" style="flex:1"></div></div>'
    '<div class="ag-input is-lg"><span class="grow ph">Work email</span></div><button class="ag-btn ag-btn-primary ag-btn-lg ag-btn-block">Email me a sign-in link</button>'
    '<p class="ag-sub" style="text-align:center;margin:12px 0 0">Private by default. Only people you invite see your company.</p></div>')
m_check = ('<div class="ag-phone-body" style="justify-content:center;align-items:center;text-align:center;padding:0 32px 60px"><div style="width:72px;height:72px;border-radius:18px;background:var(--accent-soft);color:var(--accent-ink);display:flex;align-items:center;justify-content:center"><i data-i="mail" class="ag-ico" style="width:34px;height:34px"></i></div>'
    '<h1 class="ag-h1">Check your email</h1><p class="ag-muted" style="margin:0">We sent a link to <b style="color:var(--ink)">charis@example.com</b>. Open it on this iPhone.</p>'
    '<button class="ag-btn ag-btn-primary ag-btn-lg ag-btn-block" style="margin-top:12px">Open Mail</button><button class="ag-btn ag-btn-plain" style="height:44px">Resend in 0:42</button></div>')
m_accept = ('<div class="ag-phone-body" style="justify-content:center;align-items:center;text-align:center;padding:0 24px 40px">' + co_tile(COS[0], 'xl') +
    '<div><div class="ag-sub">Wanjiru Kamau invited you to join</div><h1 class="ag-h1" style="margin-top:4px">Kilima Labs</h1></div>' + pill('Member') +
    '<div class="ag-group" style="text-align:left;width:100%;padding:8px 16px">' + perm(True, 'Update tasks assigned to you') + perm(True, 'Comment and post check-ins') + perm(False, 'See flags or other companies') + '</div>'
    '<button class="ag-btn ag-btn-primary ag-btn-lg ag-btn-block"><b>G</b> Join with Google</button><button class="ag-btn ag-btn-secondary ag-btn-lg ag-btn-block">Join with email link</button></div>')
write('Screen-11-iPhone-SignIn', PW % (MOB, 'Sign in, check email, accept invite'),
    '<div class="ag-phones">' + phone(m_signin, 'Sign in', surface=True) + phone(m_check, 'Check your email', surface=True) + phone(m_accept, 'Accept invite') + '</div>',
'''
# Screen 11 · iPhone: sign in, check email, accept invite

The same three entry screens at iPhone size (393 × 852). All buttons are 44px tall. The invite opens straight into the accept screen.
''')

def m_top(title, co=True):
    chip = ('<div class="ag-row-x" style="gap:6px;font:600 15px/20px var(--font-sans)">' + co_tile(COS[0]) + 'Kilima Labs' + I('down', 'ag-ico-sm') + '</div>') if co else '<span></span>'
    return '<div class="ag-navbar">' + chip + '<span class="ag-av sm gold" style="width:32px;height:32px;font-size:12px">CN</span></div><div class="ag-ltitle"><h1 class="ag-lt">' + title + '</h1></div>'
m_today_inner = (m_top('Today') + '<div class="ag-phone-body" style="padding-top:0"><div class="ag-sub" style="margin-top:-6px">Monday, 21 September · Morning, Charis</div>'
    '<div class="ag-group"><div class="ag-lrow flat"><div class="ag-ring" data-p="50"><span>2/4</span></div><div class="body"><div class="t">Get Kilima Labs set up</div><div class="m">2 steps left</div></div>' + I('chevron', 'chev ag-ico-sm') + '</div>'
    + step(False, 'Invite your office team', '3 invites pending') + step(False, 'Add to Home Screen', 'One-tap access, no browser bar') + '</div>'
    '<div class="ag-empty" style="padding:24px">' + I('today') + '<h3 class="ag-h3">Nothing due today</h3><p class="ag-sub">Tasks and check-ins show up here once projects start.</p></div></div>')
m_switch = ('<div style="position:absolute;inset:0;top:0;background:var(--bg)">' + status_bar() + m_top('Today') + '</div><div class="ag-scrim" style="align-items:flex-end"></div>'
    '<div class="ag-isheet"><div class="ag-grabber"></div><div class="ag-row-x" style="justify-content:space-between;margin-bottom:12px"><h2 class="ag-h3">Companies</h2><button class="ag-btn ag-btn-plain">Done</button></div>'
    '<div class="ag-group" style="background:var(--bg)">'
    + ''.join('<div class="ag-lrow">%s<div class="body"><div class="t">%s</div><div class="m">%s</div></div>%s</div>' % (co_tile(c, 'lg'), c[1], c[3] + (' · 5 people' if i == 0 else ' · 3 people' if i == 1 else ' · 7 people'), ('<i data-i="check" style="color:var(--accent)"></i>' if i == 0 else '')) for i, c in enumerate(COS))
    + '</div><div class="ag-group" style="background:var(--bg);margin-top:16px"><div class="ag-lrow flat" style="color:var(--accent)">' + I('plus') + '<span class="t" style="color:var(--accent)">Create company</span></div></div></div>')
m_more = (m_top('More', False) + '<div class="ag-phone-body" style="padding-top:0">'
    '<div class="ag-group">' + ''.join('<div class="ag-lrow">%s<div class="body t">%s</div>%s%s</div>' % ('<span style="width:30px;height:30px;border-radius:7px;background:var(--accent-soft);color:var(--accent-ink);display:flex;align-items:center;justify-content:center"><i data-i="%s" class="ag-ico ag-ico-sm"></i></span>' % k, l, '<span class="ag-sub">Soon</span>' if s else '', I('chevron', 'chev ag-ico-sm')) for k, l, s in [('meetings', 'Meetings', True), ('notebook', 'Notebook', True), ('team', 'Team', False), ('mentor', 'Mentor', True)]) + '</div>'
    '<div class="ag-group">' + ''.join('<div class="ag-lrow">%s<div class="body t">%s</div><span class="ag-sub">%s</span>%s</div>' % ('<span style="width:30px;height:30px;border-radius:7px;background:var(--fill-strong);color:var(--ink);display:flex;align-items:center;justify-content:center"><i data-i="%s" class="ag-ico ag-ico-sm"></i></span>' % k, l, v, I('chevron', 'chev ag-ico-sm')) for k, l, v in [('settings', 'Settings', ''), ('moon', 'Appearance', 'System'), ('bell', 'Notifications', 'Email')]) + '</div>'
    '<div class="ag-group"><div class="ag-lrow flat"><span class="ag-av gold">CN</span><div class="body"><div class="t">Charis N.</div><div class="m">Owner · Kilima Labs</div></div></div><div class="ag-lrow flat" style="color:var(--red)"><i data-i="logout" style="color:var(--red)"></i><span class="t" style="color:var(--red)">Sign out</span></div></div></div>')
write('Screen-12-iPhone-Home', PW % (MOB, 'Today, company switcher, More'),
    '<div class="ag-phones">' + phone(m_today_inner, 'Today (tab bar)', tabs='today') + phone(m_switch, 'Company switcher sheet') + phone(m_more, 'More tab', tabs='moreTab') + '</div>',
'''
# Screen 12 · iPhone: Today, company switcher, More

Large-title iPhone layout with the bottom tab bar (Today · Projects · Capture · Network · More). The company chip above the title opens the switcher as a bottom sheet. More holds the modules that don't fit in the tab bar, plus settings and sign out.
''')

m_team = ('<div class="ag-navbar"><button class="ag-btn ag-btn-plain">' + I('back') + 'More</button><button class="ag-btn ag-btn-plain">' + I('userplus') + '</button></div><div class="ag-ltitle"><h1 class="ag-lt">Team</h1></div>'
    '<div class="ag-phone-body" style="padding-top:0"><div class="ag-seg" style="display:flex"><span class="is-on" style="flex:1;text-align:center">Members 5</span><span style="flex:1;text-align:center">Invites 2</span></div>'
    '<div class="ag-group">' + member_rows(phone_=True) + '</div></div>')
m_inv = ('<div style="position:absolute;inset:0;background:var(--bg)">' + status_bar() + '</div><div class="ag-scrim" style="align-items:flex-end"></div>'
    '<div class="ag-isheet" style="top:60px;background:var(--bg)"><div class="ag-grabber"></div><div class="ag-row-x" style="justify-content:space-between;margin-bottom:16px"><button class="ag-btn ag-btn-plain">Cancel</button><h2 class="ag-h3">Invite</h2><button class="ag-btn ag-btn-plain" style="font-weight:600">Send</button></div>'
    '<div class="ag-stack" style="gap:20px"><div class="ag-seg" style="display:flex"><span style="flex:1;text-align:center">Email</span><span class="is-on" style="flex:1;text-align:center">Link</span></div>'
    '<div><div class="ag-caps" style="padding:0 16px 6px">Joins as</div><div class="ag-group">' + ''.join('<div class="ag-lrow flat"><div class="body"><div class="t">%s</div><div class="m">%s</div></div>%s</div>' % (r, d, ('<i data-i="check" style="color:var(--accent)"></i>' if r == 'Member' else '')) for r, d in [('Admin', 'Manage people and projects'), ('Member', 'Work on their projects'), ('Viewer', 'See only')]) + '</div></div>'
    '<div><div class="ag-caps" style="padding:0 16px 6px">Invite link</div><div class="ag-group"><div class="ag-lrow flat">' + I('link') + '<div class="body"><div class="t" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">theagency.app/join/k7Qm…</div><div class="m">Expires 28 Sep</div></div></div></div></div>'
    '<button class="ag-btn ag-btn-primary ag-btn-lg ag-btn-block">' + I('share') + ' Share link</button><button class="ag-btn ag-btn-secondary ag-btn-lg ag-btn-block">' + I('copy') + ' Copy link</button>'
    '<p class="ag-sub" style="text-align:center;margin:0">Share opens WhatsApp, Messages or Mail.</p></div></div>')
m_member = ('<div class="ag-navbar"><button class="ag-btn ag-btn-plain">' + I('back') + 'Team</button><span></span></div>'
    '<div class="ag-phone-body" style="align-items:center;text-align:center"><span class="ag-av lg gold" style="width:80px;height:80px;font-size:28px">WK</span><div><h1 class="ag-h2">Wanjiru Kamau</h1><div class="ag-sub">Operations lead</div></div>'
    '<div class="ag-row-x" style="justify-content:center;gap:12px">' + ''.join('<div style="width:72px;padding:10px 0;border-radius:var(--radius-card);background:var(--surface);color:var(--accent);display:flex;flex-direction:column;align-items:center;gap:4px;font-size:12px"><i data-i="%s" class="ag-ico"></i>%s</div>' % (k, l) for k, l in [('phone', 'Call'), ('mail', 'Email'), ('share', 'WhatsApp')]) + '</div>'
    '<div class="ag-group" style="width:100%;text-align:left"><div class="ag-lrow flat"><div class="body t">Role</div><span class="ag-sub">Admin</span>' + I('updown', 'chev ag-ico-sm') + '</div><div class="ag-lrow flat"><div class="body t">Joined</div><span class="ag-sub">12 Sep 2026</span></div></div>'
    '<div class="ag-group" style="width:100%;text-align:left;padding:8px 16px"><div class="ag-sub">As an Admin, Wanjiru can</div>' + perm(True, 'Invite people and change roles') + perm(True, 'Manage every project') + perm(True, 'See private flags') + '</div>'
    '<button class="ag-btn ag-btn-danger ag-btn-lg ag-btn-block" style="border:0;background:var(--surface)">Remove from Kilima Labs</button></div>')
write('Screen-13-iPhone-Team', PW % (MOB, 'Team, invite link, member detail'),
    '<div class="ag-phones">' + phone(m_team, 'Team', tabs='moreTab') + phone(m_inv, 'Invite by link') + phone(m_member, 'Member detail') + '</div>',
'''
# Screen 13 · iPhone: Team, invite, member

Team lives under More on iPhone. The invite sheet defaults to a link you can share through the iPhone share sheet (WhatsApp, Messages, Mail). Member detail has quick Call / Email / WhatsApp buttons and the role picker.
''')

m_splash = ('<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:var(--accent);color:var(--on-accent)">'
    '<div style="width:96px;height:96px;border-radius:22px;background:var(--on-accent);color:var(--accent);display:flex;align-items:center;justify-content:center;font:700 48px/1 var(--font-sans)">A</div>'
    '<div style="font:700 24px/1 var(--font-sans);letter-spacing:-.3px">The Agency</div></div>')
m_install = ('<div class="ag-navbar"><span></span><button class="ag-btn ag-btn-plain">Done</button></div><div class="ag-ltitle"><h1 class="ag-lt" style="font-size:28px;line-height:34px">Add to Home Screen</h1></div>'
    '<div class="ag-phone-body" style="padding-top:0"><p class="ag-muted" style="margin:0">Open The Agency like an app: full screen, its own icon, and notifications later.</p>'
    '<div class="ag-group">' + ''.join('<div class="ag-lrow flat" style="align-items:flex-start;padding:14px 16px"><span style="width:26px;height:26px;border-radius:50%%;background:var(--accent-soft);color:var(--accent-ink);display:flex;align-items:center;justify-content:center;font:700 13px/1 var(--font-sans);flex:none">%d</span><div class="body"><div class="t">%s</div><div class="m">%s</div></div>%s</div>' % (i + 1, t, m, ic) for i, (t, m, ic) in enumerate([
        ('Open in Safari', 'This only works from Safari on iPhone.', ''), ('Tap the Share button', 'At the bottom of the screen.', '<i data-i="share" style="color:var(--accent)"></i>'),
        ('Choose "Add to Home Screen"', 'Scroll down the list if you don\'t see it.', '<i data-i="squareplus" style="color:var(--accent)"></i>'), ('Tap Add', 'The Agency icon appears on your Home Screen.', '')])) + '</div>'
    '<div class="ag-row-x" style="gap:14px;justify-content:center;padding:12px 0"><div style="display:flex;flex-direction:column;align-items:center;gap:6px"><div style="width:60px;height:60px;border-radius:14px;background:var(--accent);color:var(--on-accent);display:flex;align-items:center;justify-content:center;font:700 30px/1 var(--font-sans)">A</div><span style="font-size:11px">The Agency</span></div></div></div>')
m_viewer = (m_top('Team') + '<div class="ag-phone-body" style="padding-top:0"><div class="ag-banner is-amber">' + I('eye') + '<span><b>You\'re a Viewer.</b> You can see but not change anything.</span></div>'
    '<div class="ag-group">' + member_rows(phone_=True) + '</div><button class="ag-btn ag-btn-secondary ag-btn-lg ag-btn-block" disabled>' + I('lock') + ' Invite people</button></div>')
m_viewer = m_viewer.replace('<span class="ag-av sm gold" style="width:32px;height:32px;font-size:12px">CN</span>', '<span class="ag-av sm" style="width:32px;height:32px;font-size:12px">BM</span>')
write('Screen-14-iPhone-Install', PW % (MOB, 'Splash, install guide, viewer mode'),
    '<div class="ag-phones">' + phone(m_splash, 'Splash (PWA launch)') + phone(m_install, 'Add to Home Screen guide') + phone(m_viewer, 'Viewer mode', tabs='moreTab') + '</div>',
'''
# Screen 14 · iPhone: splash, install guide, viewer

The splash shows while the installed app opens. The install guide walks through Safari's Share → Add to Home Screen (iPhone has no install button for web apps). Viewer mode mirrors the desktop: a banner, and disabled actions with a lock.
''')
print('ok')
