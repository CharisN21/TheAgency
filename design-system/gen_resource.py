# Resource boards from nextlevelbuilder/ui-ux-pro-max-skill (MIT) data catalogue.
import os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'project', 'components')
G = 'Reference &middot; Palette options'
G2 = 'Reference &middot; Borrowable'

CSS = """
.board { padding:32px; display:flex; flex-direction:column; gap:24px; background:var(--bg); }
.grid { display:grid; grid-template-columns:repeat(4,1fr); gap:20px; }
.opt { border-radius:var(--radius-card); overflow:hidden; box-shadow:var(--shadow-card); background:var(--surface); }
.opt .head { display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-bottom:1px solid var(--separator); }
.opt .head b { font:600 13px/18px var(--font-sans); }
.opt .head span { font:500 10px/14px var(--font-mono); color:var(--ink-2); }
.demo { display:flex; height:190px; font-family:var(--font-sans); }
.demo .side { width:64px; padding:8px 6px; display:flex; flex-direction:column; gap:6px; }
.demo .side i { height:10px; border-radius:3px; display:block; opacity:.45; }
.demo .side i.on { opacity:1; height:20px; border-radius:5px; }
.demo .main { flex:1; padding:10px; display:flex; flex-direction:column; gap:8px; }
.demo .card { border-radius:8px; padding:8px; display:flex; flex-direction:column; gap:6px; }
.demo .t { font:600 11px/14px var(--font-sans); }
.demo .m { font:400 10px/13px var(--font-sans); }
.demo .btn { height:22px; border-radius:6px; display:inline-flex; align-items:center; justify-content:center; font:600 10px/1 var(--font-sans); padding:0 10px; }
.demo .chips { display:flex; gap:4px; }
.demo .chip { height:16px; border-radius:999px; padding:0 6px; font:600 9px/16px var(--font-sans); }
.swrow { display:flex; gap:3px; padding:8px 12px; border-top:1px solid var(--separator); }
.swrow i { flex:1; height:16px; border-radius:3px; display:block; }
.note { padding:8px 12px; font:400 11px/15px var(--font-sans); color:var(--ink-2); border-top:1px solid var(--separator); min-height:46px; }
.fail { color:var(--red); font-weight:600; }
.pass { color:var(--green); font-weight:600; }
.rule { display:grid; grid-template-columns:96px 1fr 1fr 84px; gap:12px; padding:10px 0; border-bottom:1px solid var(--separator); font-size:13px; line-height:18px; align-items:start; }
.rule .cat { font:600 11px/16px var(--font-sans); letter-spacing:.3px; text-transform:uppercase; color:var(--ink-2); }
.sev { justify-self:start; }
.mtable { width:100%; border-collapse:collapse; font-size:13px; }
.mtable td, .mtable th { text-align:left; padding:8px 12px 8px 0; border-bottom:1px solid var(--separator); }
.mtable th { font:600 11px/16px var(--font-sans); letter-spacing:.3px; text-transform:uppercase; color:var(--ink-2); }
.lbl { font:600 12px/16px var(--font-sans); letter-spacing:.3px; text-transform:uppercase; color:var(--ink-2); margin-bottom:10px; }
"""


def lum(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    c = [x / 12.92 if x <= .03928 else ((x + .055) / 1.055) ** 2.4 for x in c]
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]


def ratio(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + .05) / (lo + .05)


def I(n, cls=''):
    return '<i data-i="%s"%s></i>' % (n, (' class="ag-ico %s"' % cls) if cls else '')


def write(name, marker, body, readme):
    d = os.path.join(ROOT, name)
    os.makedirs(d, exist_ok=True)
    open(os.path.join(d, 'preview.html'), 'w', encoding='utf-8').write(
        marker + '\n<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><title>' + name + '</title><style>' + CSS + '</style></head>\n<body>\n'
        + body + '\n<script>Agency.ready();</script>\n</body>\n</html>\n')
    open(os.path.join(d, 'README.md'), 'w', encoding='utf-8').write(readme.strip() + '\n')


# name, primary, onPrimary, accent, onAccent, background, foreground, card, muted, mutedFg, border, destructive, note
OPTS = [
    ('The Agency (now)', '#9a6200', '#ffffff', '#1f7a3a', '#ffffff', '#f5f5f7', '#1d1d1f', '#ffffff', '#efeff2', '#636366', '#e3e3e8', '#c0302b', 'Deep gold on neutral grey. Warm, quiet, one hue.'),
    ('SaaS (General)', '#2563eb', '#ffffff', '#ea580c', '#000000', '#f8fafc', '#1e293b', '#ffffff', '#e9eff8', '#475569', '#e2e8f0', '#dc2626', 'Trust blue + orange CTA. The default look of most SaaS.'),
    ('CRM & Client Mgmt', '#2563eb', '#ffffff', '#059669', '#000000', '#f8fafc', '#0f172a', '#ffffff', '#f1f5fd', '#475569', '#e4ecfc', '#dc2626', 'Professional blue + deal green. Fits the Network module.'),
    ('Analytics Dashboard', '#1e40af', '#ffffff', '#d97706', '#000000', '#f8fafc', '#1e3a8a', '#ffffff', '#e9eef6', '#475569', '#dbeafe', '#dc2626', 'Deep blue + amber highlights. Reads as data-heavy.'),
    ('Productivity Tool', '#0d9488', '#000000', '#ea580c', '#000000', '#f0fdfa', '#134e4a', '#ffffff', '#e8f1f4', '#475569', '#99f6e4', '#dc2626', 'Teal focus + action orange. Calm, a bit clinical.'),
    ('Remote Work', '#6366f1', '#000000', '#059669', '#000000', '#f5f3ff', '#312e81', '#ffffff', '#ebeff9', '#475569', '#e0e7ff', '#dc2626', 'Indigo + success green. Collaboration-tool feel.'),
    ('Notes & Writing', '#78716c', '#ffffff', '#d97706', '#000000', '#fffbeb', '#0f172a', '#ffffff', '#f6f6f6', '#475569', '#eeeded', '#dc2626', 'Warm ink + amber on cream. Closest in mood to ours.'),
    ('Financial Dashboard', '#047857', '#ffffff', '#ca8a04', '#000000', '#f8fafc', '#064e3b', '#ffffff', '#e8f2ee', '#475569', '#d1fae5', '#dc2626', 'Money green + gold. Reads as accounting.'),
]

cards = ''
for (name, pri, onp, acc, ona, bg, fg, card, muted, mfg, border, dest, note) in OPTS:
    r_on = ratio(pri, onp)
    r_body = ratio(fg, card)
    r_meta = ratio(mfg, card)
    flag = lambda v, t=4.5: ('<span class="pass">%.1f:1</span>' % v) if v >= t else ('<span class="fail">%.1f:1 ✕</span>' % v)
    cards += ('<div class="opt"><div class="head"><b>%s</b><span>%s</span></div>'
              '<div class="demo" style="background:%s;color:%s">'
              '<div class="side" style="background:%s;border-right:1px solid %s"><i class="on" style="background:%s"></i><i style="background:%s"></i><i style="background:%s"></i><i style="background:%s"></i></div>'
              '<div class="main"><div class="card" style="background:%s;border:1px solid %s">'
              '<div class="t">Get Kilima Labs set up</div><div class="m" style="color:%s">2 of 4 steps done</div>'
              '<div style="height:5px;border-radius:3px;background:%s"><div style="width:50%%;height:5px;border-radius:3px;background:%s"></div></div>'
              '<div style="display:flex;gap:6px;margin-top:2px"><span class="btn" style="background:%s;color:%s">Invite</span><span class="btn" style="background:transparent;color:%s;box-shadow:inset 0 0 0 1px %s">Later</span></div></div>'
              '<div class="chips"><span class="chip" style="background:%s;color:%s">Owner</span><span class="chip" style="background:%s;color:%s">On track</span><span class="chip" style="background:%s;color:#fff">Blocked</span></div></div></div>'
              '<div class="swrow">%s</div>'
              '<div class="note">%s<br>Text on primary %s · body %s · meta %s</div></div>'
              % (name, pri.upper(), bg, fg, card, border, pri, mfg, mfg, mfg, card, border, mfg, muted, pri, pri, onp, pri, border,
                 muted, mfg, acc + '22', acc, dest,
                 ''.join('<i style="background:%s"></i>' % c for c in [pri, acc, bg, card, muted, border, dest]),
                 note, flag(r_on), flag(r_body), flag(r_meta)))

write('Resource-01-Palettes', '<!-- @dsCard group="%s" height=1080 width=1000 page subtitle="Eight palettes applied to the same card" -->' % G,
      '<div class="board"><div><h2 class="ag-h2">Palette options, applied</h2><p class="ag-sub" style="max-width:720px">Seven product-type palettes from the <code>ui-ux-pro-max-skill</code> catalogue (MIT), each painted onto the same Today card next to ours. Every palette carries the same roles as shadcn (primary, accent, background, card, muted, border, destructive), so swapping is a token change, not a redesign. Contrast ratios are measured, not claimed.</p></div>'
      '<div class="grid">' + cards + '</div>'
      '<div class="ag-banner is-gold">' + I('info') + '<span>Catalogue values are used exactly as published. Where a pair falls under 4.5:1 it is marked — those would need darkening before use, the same rule we hold our own tokens to.</span></div></div>',
      '''
# Palette options

Eight palettes on the same card: ours plus seven from the `ui-ux-pro-max-skill` data catalogue (`data/colors.csv`, MIT), chosen for product types close to The Agency — SaaS, CRM, analytics, productivity, remote work, notes, financial.

Each palette uses the same role names as shadcn (`primary`, `accent`, `background`, `card`, `muted`, `border`, `destructive`), so picking one is a token swap.

Measured contrast is shown under each: text on primary, body on card, meta on card. Values marked in red fall below 4.5:1 and would need darkening first — the catalogue's own notes admit some accents were already adjusted for contrast.

**My read:** *Notes & Writing* (warm ink + amber on cream) is the only one with the same warmth as our gold. The blues read as "generic SaaS" and would make The Agency look like every other dashboard; teal and indigo both fight with the green/amber/red status colours. If you want to move off gold, the interesting move is a warmer or deeper gold, not a blue.
''')

# ---------- UX rules ----------
RULES = [('Security / A11y', 'Accessible authentication', 'Allow password managers and paste; offer passkeys, OAuth or another non-cognitive method', 'Force typing a code from another device', 'Critical', 'Met — Google sign-in and email magic link, no passwords'),
         ('Forms', 'Input labels', 'Always show a label above or beside the input', 'Placeholder-only labels', 'High', 'Met — every field in the mockups has a visible label'),
         ('Forms', 'Error placement', 'Specific error below the input, linked with aria-describedby', 'A generic error at the top of the form', 'High', 'Met — "Enter a full email address" sits under the field'),
         ('Forms', 'Submit feedback', 'Show loading, then success or error', 'Nothing happens after a click', 'High', 'Gap — no loading or success state mocked yet'),
         ('Feedback', 'Loading indicators', 'Preserve layout and focus, expose a busy status', 'Spinners that shift the page', 'High', 'Gap — no skeletons mocked yet'),
         ('Touch', 'Touch target size', '44pt on iOS, 48dp on Android', 'Small tap targets in dense rows', 'High', 'Met — touch-target token is 44px'),
         ('A11y', 'Text reflow and spacing', 'Fluid sizes, content-driven height, unitless line height', 'Fixed-height text boxes', 'Critical', 'Partly — our type styles use fixed line heights in px'),
         ('Content', 'Essential text truncation', 'Wrap, stack or give a path to the full detail', 'Truncate names and emails with no way to see them', 'Critical', 'Check — invite links and long company names truncate'),
         ('A11y', 'Compact control semantics', 'Use a button and expose pressed or selected state', 'Divs with click handlers', 'Critical', 'To enforce in code'),
         ('Navigation', 'Back button', 'Preserve navigation history properly', 'Traps in modals and sheets', 'High', 'To enforce in code'),
         ('Onboarding', 'Progressive disclosure', 'Ask for the minimum first, reveal the rest later', 'A long form on first run', 'Medium', 'Met — company name is the only required field')]
rules_html = '<div class="rule" style="border-bottom:2px solid var(--separator)"><span class="cat">Area</span><b>Rule</b><b>Where we stand</b><span class="cat">Severity</span></div>'
for cat, rule, do, dont, sev, stand in RULES:
    pillcls = 'is-red' if sev == 'Critical' else ('is-amber' if sev == 'High' else '')
    mark = 'is-green' if stand.startswith('Met') else ('is-amber' if stand.startswith(('Partly', 'Check')) else ('is-red' if stand.startswith('Gap') else ''))
    rules_html += ('<div class="rule"><span class="cat">%s</span><div><b>%s</b><div class="ag-sub">Do: %s<br>Don\'t: %s</div></div>'
                   '<div><span class="ag-pill %s">%s</span></div><span class="sev"><span class="ag-pill %s">%s</span></span></div>'
                   % (cat, rule, do, dont, mark, stand, pillcls, sev))
MOTION = [('Hover, press feedback', '150–200ms', 'ease-out (power1.out)', 'Keep movement under 2px; transform and opacity only'),
          ('Stagger list appear', '250–350ms', 'ease-out', 'Rows in sequence, e.g. the Team list'),
          ('Page / route transition', '200–300ms', 'ease-in-out', 'Switching company or module'),
          ('Skeleton loading loop', '800–1200ms', 'sine.inOut', 'While Today or Team loads'),
          ('Reveal on scroll', '300–400ms', 'ease-out', 'Rarely — this is an app, not a landing page')]
mrows = ''.join('<tr><td><b>%s</b></td><td><code>%s</code></td><td>%s</td><td class="ag-sub">%s</td></tr>' % r for r in MOTION)
write('Resource-02-UXRules', '<!-- @dsCard group="%s" height=1080 width=1000 page subtitle="Phase 0 checklist and motion spec" -->' % G2,
      '<div class="board"><div><h2 class="ag-h2">Phase 0 UX checklist</h2><p class="ag-sub" style="max-width:720px">The rules from <code>data/ux-guidelines.csv</code> and <code>data/app-interface.csv</code> (120 + 33 rows, MIT) that apply to what Phase 0 actually builds — sign-in, invites, roles, forms — and where the current mockups stand against each.</p></div>'
      '<div class="ag-card ag-card-pad">' + rules_html + '</div>'
      '<div><div class="lbl">Motion, from <code>data/motion.csv</code> — matched to our 150–250ms ease-out envelope</div><div class="ag-card ag-card-pad"><table class="mtable"><tr><th>Where</th><th>Duration</th><th>Easing</th><th>Note</th></tr>' + mrows + '</table></div></div>'
      '<div class="ag-banner is-amber">' + I('alert') + '<span><b>Two gaps in the current mockups:</b> no loading / skeleton state, and no submit feedback (sending an invite, signing in). Both are High severity. Worth mocking before Phase 0 starts.</span></div></div>',
      '''
# Phase 0 UX checklist and motion

Filtered from the catalogue's 120 UX guidelines and 33 app-interface rules down to the ones Phase 0 touches, each with where our mockups currently stand.

**Two real gaps it found in what we have:** no loading / skeleton state anywhere, and no submit feedback after "Send invite" or "Email me a sign-in link". Both rank High. A third to watch: our type styles use fixed px line heights, which the text-reflow rule (Critical) prefers unitless.

The motion table maps their durations onto our own 150–250ms ease-out envelope, so adopting it changes nothing about how the app feels — it just gives Claude Code exact numbers to build to.
''')
print('ok')
