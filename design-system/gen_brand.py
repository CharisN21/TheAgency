# Logo, logo motion, landing page and the component inventory.
import os, math
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'project', 'components')
r = 19
CIRC = 2 * math.pi * r
ARC_DASH = '%.1f %.1f' % (CIRC * 0.72, CIRC)


def I(n, cls=''):
    return '<i data-i="%s"%s></i>' % (n, (' class="ag-ico %s"' % cls) if cls else '')


def write(name, group, height, body, readme, width=None, sub='', style='', script=''):
    d = os.path.join(ROOT, name)
    os.makedirs(d, exist_ok=True)
    marker = '<!-- @dsCard group="%s" height=%d%s%s -->' % (group, height, (' width=%d' % width) if width else '', (' subtitle="%s"' % sub) if sub else '')
    open(os.path.join(d, 'preview.html'), 'w', encoding='utf-8').write(
        marker + '\n<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><title>' + name + '</title>'
        + ('<style>' + style + '</style>' if style else '') + '</head>\n<body>\n' + body
        + '\n<script>Agency.ready();' + script + '</script>\n</body>\n</html>\n')
    if readme is not None:
        open(os.path.join(d, 'README.md'), 'w', encoding='utf-8').write(readme.strip() + '\n')


def mark_svg(size=64, tile='var(--accent)', stroke='#ffffff', arc='var(--brass)', ids=False, rx=15):
    p = lambda s: (' id="%s"' % s) if ids else ''
    return ('<svg viewBox="0 0 64 64" width="%d" height="%d" role="img" aria-label="The Agency">' % (size, size)
            + ('<rect%s x="0" y="0" width="64" height="64" rx="%d" fill="%s"/>' % (p('lgTile'), rx, tile) if tile else '')
            + '<circle%s cx="32" cy="34" r="%d" fill="none" stroke="%s" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="%s" transform="rotate(128 32 34)"/>' % (p('lgArc'), r, arc, ARC_DASH)
            + '<path%s d="M21.6 43.4 32 20.6 42.4 43.4" fill="none" stroke="%s" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>' % (p('lgA'), stroke)
            + '<path%s d="M26.2 35.2h11.6" fill="none" stroke="%s" stroke-width="3.2" stroke-linecap="round"/>' % (p('lgBar'), stroke)
            + '</svg>')


BRAND = 'Brand'

# ---------------- 1. BrandMark (replaces the type-only mark) ----------------
misuse = ''.join('<div style="display:flex;flex-direction:column;gap:8px;align-items:center"><div style="width:96px;height:96px;border-radius:var(--radius-card);display:flex;align-items:center;justify-content:center;%s">%s</div>'
                 '<span class="ag-sub" style="text-align:center;max-width:120px">%s</span></div>' % (bg, inner, cap)
                 for bg, inner, cap in [
                     ('background:var(--fill)', '<div style="transform:scaleX(1.3)">' + mark_svg(56) + '</div>', 'Never stretch'),
                     ('background:var(--fill)', mark_svg(56, tile='var(--green)'), 'Never recolour the tile'),
                     ('background:linear-gradient(135deg,#8e2741,#3f5b9c)', mark_svg(56, tile='none'), 'Never on a busy or gradient ground'),
                     ('background:var(--fill)', '<div style="filter:drop-shadow(0 6px 10px rgba(0,0,0,.45))">' + mark_svg(56) + '</div>', 'No shadows or effects')])
write('BrandMark', BRAND, 620,
      '<div class="ag-pad" style="display:flex;flex-direction:column;gap:28px">'
      '<div style="display:flex;gap:40px;align-items:flex-end;flex-wrap:wrap">'
      + ''.join('<div style="display:flex;flex-direction:column;gap:10px;align-items:center">%s<span class="ag-sub">%s</span></div>' % (mark_svg(s), l)
                for s, l in [(120, 'App icon'), (64, 'Standard'), (32, 'Sidebar'), (20, 'Favicon')])
      + '<div style="display:flex;flex-direction:column;gap:10px;align-items:center"><div style="display:flex;align-items:center;gap:14px">' + mark_svg(48)
      + '<span style="font:600 22px/1 var(--font-sans);letter-spacing:4px;color:var(--ink)">THE AGENCY</span></div><span class="ag-sub">Lockup</span></div></div>'
      '<div style="display:flex;gap:24px;flex-wrap:wrap">'
      '<div style="background:var(--accent);border-radius:var(--radius-card);padding:24px 32px;display:flex;align-items:center;gap:14px">' + mark_svg(44, tile='none', stroke='#ffffff', arc='#e6cba0')
      + '<span style="font:600 20px/1 var(--font-sans);letter-spacing:3.6px;color:#fff">THE AGENCY</span></div>'
      '<div style="background:var(--ink);border-radius:var(--radius-card);padding:24px 32px;display:flex;align-items:center;gap:14px">' + mark_svg(44, tile='none', stroke='var(--surface)', arc='var(--brass)')
      + '<span style="font:600 20px/1 var(--font-sans);letter-spacing:3.6px;color:var(--surface)">THE AGENCY</span></div>'
      '<div style="border:1px solid var(--separator);border-radius:var(--radius-card);padding:24px 32px;display:flex;align-items:center;gap:14px">' + mark_svg(44, tile='none', stroke='var(--ink)', arc='var(--brass)')
      + '<span style="font:600 20px/1 var(--font-sans);letter-spacing:3.6px;color:var(--ink)">THE AGENCY</span></div></div>'
      '<div><div class="ag-caps" style="margin-bottom:12px">Never</div><div style="display:flex;gap:24px;flex-wrap:wrap">' + misuse + '</div></div></div>',
      '''
# BrandMark

The Agency's mark: a maroon tile, a white **A** built from three strokes, and an open brass ring behind it — the progress ring the app itself uses, drawn as the brand.

- **Files** (in the Logos asset group): `agency-mark.svg` (full colour), `agency-mark-ink.svg` (single ink, for stamps and dark grounds), `agency-lockup.svg`, `agency-lockup-reverse.svg`, `agency-wordmark.svg`.
- **Clear space**: one quarter of the tile's width on every side. Minimum size 20px; below that use the tile with no ring.
- **Lockup**: mark, then a gap of half the tile width, then THE AGENCY in the system font at 600 weight with 0.18em letterspacing.
- **Grounds**: the full-colour tile on light or dark neutral; the reverse lockup on maroon; the ink version where only one colour is available.
- **Never** stretch it, recolour the tile, put it on a photo or gradient, or add a shadow.

The wordmark is set in the system font for now. When the identity is finalised, convert it to outlines so it renders identically everywhere.
''', width=980, sub='Mark, lockup, clear space, misuse')

# ---------------- 2. Logo motion ----------------
MSTYLE = """
.stage { background: var(--bg); border-radius: var(--radius-sheet); padding: 40px; display: flex; flex-direction: column; align-items: center; gap: 28px; position: relative; overflow: hidden; }
.lock { display: flex; align-items: center; gap: 18px; }
.lock svg { display: block; overflow: visible; }
.word { display: flex; font: 600 30px/1 var(--font-sans); letter-spacing: 5px; color: var(--ink); }
.word span { display: inline-block; white-space: pre; }
.sheen { position: absolute; inset: 0; border-radius: 15px; overflow: hidden; pointer-events: none; }
.sheen i { position: absolute; top: -40%; left: -60%; width: 40%; height: 180%; transform: rotate(18deg); background: linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent); display: block; }
.markwrap { position: relative; }
/* the sequence */
.run #lgTile { animation: tileIn 520ms cubic-bezier(.16,1,.3,1) both; transform-origin: 32px 32px; }
.run #lgArc { animation: arcIn 700ms cubic-bezier(.16,1,.3,1) 120ms both; transform-origin: 32px 34px; }
.run #lgA { animation: draw 460ms cubic-bezier(.16,1,.3,1) 300ms both; }
.run #lgBar { animation: draw 300ms cubic-bezier(.16,1,.3,1) 520ms both; }
.run .sheen i { animation: sweep 900ms cubic-bezier(.4,0,.2,1) 620ms both; }
.run .word span { animation: rise 620ms cubic-bezier(.16,1,.3,1) both; animation-delay: calc(520ms + var(--k) * 26ms); }
.run .lock { animation: settle 700ms cubic-bezier(.16,1,.3,1) 900ms both; }
@keyframes tileIn { from { opacity: 0; transform: scale(.88); filter: blur(10px); } to { opacity: 1; transform: scale(1); filter: blur(0); } }
@keyframes arcIn { from { stroke-dashoffset: 120; transform: rotate(-38deg); opacity: 0; } to { stroke-dashoffset: 0; transform: rotate(0deg); opacity: 1; } }
@keyframes draw { from { stroke-dasharray: 60; stroke-dashoffset: 60; } to { stroke-dasharray: 60; stroke-dashoffset: 0; } }
@keyframes sweep { from { left: -60%; opacity: 0; } 30% { opacity: 1; } to { left: 130%; opacity: 0; } }
@keyframes rise { from { opacity: 0; transform: translateY(14px); filter: blur(7px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
@keyframes settle { 0% { transform: scale(1.03); } 100% { transform: scale(1); } }
.steps { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; width: 100%; max-width: 860px; }
.steps div { background: var(--surface); border-radius: var(--radius-card); padding: 12px; box-shadow: var(--shadow-card); }
.steps b { display: block; font: 600 12px/16px var(--font-sans); color: var(--accent-ink); margin-bottom: 4px; }
.steps span { font-size: 12px; line-height: 17px; color: var(--ink-2); }
@media (prefers-reduced-motion: reduce) { .run * { animation-duration: 1ms !important; } }
"""
word_html = ''.join('<span style="--k:%d">%s</span>' % (i, c) for i, c in enumerate('THE AGENCY'))
write('Brand-02-LogoMotion', BRAND, 520,
      '<div class="ag-pad" style="display:flex;flex-direction:column;gap:20px">'
      '<div class="stage" id="stage">'
      '<div class="lock"><span class="markwrap">' + mark_svg(104, ids=True) + '<span class="sheen"><i></i></span></span><span class="word">' + word_html + '</span></div>'
      '<button class="ag-btn ag-btn-secondary" id="replay">' + I('refresh', 'ag-ico-sm') + ' Replay</button></div>'
      '<div class="steps">'
      + ''.join('<div><b>%s</b><span>%s</span></div>' % (t, s) for t, s in [
          ('0–520ms · Tile', 'Blurs in from 10px and scales 0.88 → 1. No fade-up, no slide.'),
          ('120–820ms · Ring', 'Draws itself while swinging 38° into place.'),
          ('300–820ms · The A', 'Strokes draw on, apex first, then the crossbar.'),
          ('620–1520ms · Sheen', 'One brass sweep across the tile. Once only, never a loop.'),
          ('520–1200ms · Name', 'Letters rise 14px out of a 7px blur, 26ms apart.')]) + '</div>'
      '<div class="ag-banner is-gold">' + I('info') + '<span>Everything eases on <code>cubic-bezier(.16, 1, .3, 1)</code> — a spring-like curve that overshoots slightly and settles, which is what makes it read as current rather than 2016. Under <code>prefers-reduced-motion</code> the whole sequence collapses to a fade.</span></div></div>',
      '''
# Logo motion · the intro

What plays once when the landing page opens, about 1.5 seconds end to end.

**Why it reads as new.** Older intros fade up and slide. This one: blurs in (progressive blur is the current signature), draws its strokes rather than revealing them, rises the name per letter out of a blur with a 26ms stagger, and eases on a spring curve that overshoots and settles instead of a flat ease-out. The brass sheen passes exactly once — a sheen that loops looks like a 2014 banner ad.

Never used inside the app: `duration-brand` is for the landing page and the splash only.
''', width=980, sub='Blur-in, stroke draw, per-letter rise', style=MSTYLE,
      script="""
var st=document.getElementById('stage');function run(){st.classList.remove('run');void st.offsetWidth;st.classList.add('run');}
document.getElementById('replay').addEventListener('click',run);run();setInterval(run,5200);
""")

# ---------------- 3. Landing page ----------------
LSTYLE = """
.win { width: 1280px; border-radius: 14px; overflow: hidden; box-shadow: var(--shadow-sheet); border: 1px solid var(--separator); background: var(--bg); position: relative; }
.navlogo { display: flex; align-items: center; gap: 10px; font: 600 15px/1 var(--font-sans); letter-spacing: 2.6px; opacity: 0; transform: translateY(-6px); transition: opacity 320ms cubic-bezier(.16,1,.3,1), transform 320ms cubic-bezier(.16,1,.3,1); }
.shrunk .navlogo { opacity: 1; transform: translateY(0); }
.herologo { display: flex; flex-direction: column; align-items: center; gap: 18px; transition: transform 620ms cubic-bezier(.16,1,.3,1), opacity 420ms ease-out; transform-origin: top center; }
.shrunk .herologo { transform: scale(.28) translateY(-190px); opacity: 0; }
.hword { font: 600 34px/1 var(--font-sans); letter-spacing: 6px; color: var(--ink); }
.scrollhint { position: absolute; right: 20px; bottom: 16px; font: 500 12px/16px var(--font-sans); color: var(--ink-2); background: var(--surface); border-radius: 999px; padding: 6px 12px; box-shadow: var(--shadow-card); }
.preview-shot { background: var(--surface); border-radius: 12px; box-shadow: var(--shadow-popover); overflow: hidden; margin: 0 32px; border: 1px solid var(--separator); }
"""
feat = ''.join('<div class="f">%s<h3>%s</h3><p>%s</p></div>' % (I(ic), t, b) for ic, t, b in [
    ('projects', 'Projects that report themselves', 'Scope it, let the AI propose the team, then watch progress rings instead of chasing people for updates.'),
    ('network', 'Nobody falls through', 'Every supplier, client and referral remembered, with the next conversation already scheduled.'),
    ('mentor', 'A second opinion at 11pm', 'Describe the problem. Get it restated, compared to real cases, and answered with paths — never one answer.')])
write('Screen-15-Landing', 'Phase 0 · Desktop', 900,
      '<div class="ag-pad" style="display:flex;flex-direction:column;align-items:center;gap:16px">'
      '<div class="win" id="win">'
      '<div class="ag-nav"><span class="navlogo">' + mark_svg(26) + 'THE AGENCY</span><span style="flex:1"></span>'
      '<a href="#">Product</a><a href="#">Pricing</a><a href="#">Sign in</a><button class="ag-btn ag-btn-primary">Start free</button></div>'
      '<div class="ag-hero"><div class="herologo">' + mark_svg(88) + '<span class="hword">THE AGENCY</span></div>'
      '<h1>Run every company you own from one calm place.</h1>'
      '<p>Projects, people, meetings and the leadership coaching that comes from your own decisions. Built for founders running more than one thing at once.</p>'
      '<div class="ag-row-x" style="gap:10px;justify-content:center"><button class="ag-btn ag-btn-primary ag-btn-lg">Start free for 30 days</button>'
      '<button class="ag-btn ag-btn-secondary ag-btn-lg">See how it works</button></div>'
      '<span class="ag-sub">Free while you set it up · M-Pesa when you are ready · your data stays yours</span></div>'
      '<div class="ag-rule" style="margin:0 32px 28px"></div>'
      '<div class="preview-shot"><div style="display:flex;height:220px">'
      '<div style="width:170px;background:var(--sidebar);border-right:1px solid var(--separator);padding:10px 8px;display:flex;flex-direction:column;gap:4px">'
      '<div class="ag-switcher" style="margin-bottom:6px"><span class="ag-co">K</span><span class="name">Kilima Labs</span></div>'
      + ''.join('<div class="ag-side-item %s">%s%s</div>' % ('is-active' if k == 'today' else '', I(k), l) for k, l in [('today', 'Today'), ('projects', 'Projects'), ('network', 'Network'), ('meetings', 'Meetings')]) + '</div>'
      '<div style="flex:1;padding:16px;display:flex;flex-direction:column;gap:10px;background:var(--surface)">'
      '<div class="ag-sub">Monday, 21 September</div><div class="ag-h2">Morning, Charis</div>'
      '<div class="ag-row-x" style="gap:12px"><div class="ag-ring" data-p="72"><span>72%</span></div><div class="ag-ring is-amber" data-p="38"><span>38%</span></div><div class="ag-ring is-green" data-p="100"><span>' + I('check', 'ag-ico-sm') + '</span></div>'
      '<div style="flex:1"><div class="ag-sub">3 projects · 2 check-ins due · 1 flag</div></div></div></div></div></div>'
      '<div class="ag-feat" style="padding-top:28px">' + feat + '</div>'
      '<span class="scrollhint" id="hint">Scroll state: hero</span></div>'
      '<span class="ag-sub">The logo hands off from the hero into the nav as the page scrolls — one element moving, not two crossfading.</span></div>',
      '''
# Screen 15 · Landing page

The public page, in the new maroon and greige. Hero with the logo sequence, one sentence on what it is, two buttons, then a real screenshot of Today rather than an illustration, then three features in the app's own voice.

**The scroll hand-off:** the hero lockup scales down and travels into the navigation bar as you scroll, while the nav version fades in behind it — one element moving, not two crossfading. In the build this is the View Transitions API with a shared element, falling back to a scroll-linked transform where that is unsupported.

The brass hairline under the hero is the only ornament on the page.
''', width=1340, sub='Hero, scroll hand-off, product shot', style=LSTYLE,
      script="""
var w=document.getElementById('win'),h=document.getElementById('hint'),on=false;
setInterval(function(){on=!on;w.classList.toggle('shrunk',on);h.textContent='Scroll state: '+(on?'scrolled — logo in the nav':'hero');},3400);
""")

# ---------------- 4. Inventory ----------------
INV = [
    ('Phase 0', [('App shell · sidebar, tab bar, switcher', 'Built'), ('Sign in, magic link, accept invite', 'Built'), ('Company create, invites, roles', 'Built'),
                 ('Viewer read-only mode', 'Built'), ('PWA install, splash', 'Built'), ('Landing page', 'Built now')]),
    ('Phase 1', [('ProjectCard, ongoing list', 'Built now'), ('Task list / board / timeline', 'Built now'), ('AI team suggestion', 'Built now'),
                 ('Check-in composer', 'Built now'), ('Flags + conversation script', 'Built now'), ('Retrospective wizard', 'Built now'),
                 ('Analytics v1', 'Built now'), ('Task detail pane, comments, activity', 'To draw'), ('Milestones, attachments, issues', 'To draw')]),
    ('Phase 2', [('Command palette', 'Built now'), ('Quick capture + Inbox', 'Built now'), ('Notebook cards', 'Built now'),
                 ('Today sections, full', 'To draw'), ('Rich text editor chrome', 'To draw')]),
    ('Phase 3', [('Contact list, filters, detail, timeline', 'Built now'), ('Supplier scorecard', 'Built now'), ('Referral tree, consent', 'Built now'),
                 ('CSV / vCard import mapper', 'To draw'), ('Next-touch cadence picker', 'To draw')]),
    ('Phase 4', [('Meeting card, agenda, join', 'Built now'), ('Notes → action items → tasks', 'Built now'), ('Schedule sheet with Google Calendar', 'To draw')]),
    ('Phase 5', [('Announcements, pinned', 'Built now'), ('Notification preferences, quiet hours', 'Built now'), ('WhatsApp click-to-chat preview', 'Built now')]),
    ('Phase 6', [('Problem → paths mentor', 'Built now'), ('Weekly recap', 'Built now'), ('Decision log', 'Built now'),
                 ('Patterns from closed projects', 'Built now'), ('Frameworks library', 'To draw')]),
    ('Phase 7', [('Offline + sync banners', 'Built now'), ('Backups, export, delete', 'Built now'), ('Audit log', 'Built now'),
                 ('M-Pesa pricing test', 'Built now'), ('Usage analytics for me', 'To draw')]),
    ('Foundations', [('Buttons, inputs, pills, avatars', 'Built'), ('Sidebar, tab bar, switcher, menus', 'Built'), ('Cards, list rows, sheets, empty states', 'Built'),
                     ('Skeletons', 'Built now'), ('Submit states + toasts', 'Built now'), ('Checkbox, radio, switch, slider, date', 'Built now'),
                     ('Tabs, tables', 'Built now'), ('Steppers, tags, avatar stacks, dropzones', 'Built now'), ('Charts: bars, sparklines, rings', 'Built now'),
                     ('Logo, lockups, logo motion', 'Built now'), ('Toasts in context, tooltips', 'To draw')])]
rows = ''
for phase, items in INV:
    rows += '<tr><td colspan="2" style="background:var(--fill);font:600 12px/16px var(--font-sans);letter-spacing:.3px;text-transform:uppercase;color:var(--ink-2)">%s</td></tr>' % phase
    for name, st in items:
        cls = {'Built': 'is-green', 'Built now': 'is-gold', 'To draw': ''}[st]
        rows += '<tr><td>%s</td><td style="width:120px">%s</td></tr>' % (name, '<span class="ag-pill %s">%s</span>' % (cls, st))
built = sum(1 for _, its in INV for _, s in its if s != 'To draw')
todo = sum(1 for _, its in INV for _, s in its if s == 'To draw')
write('Inventory', 'Overview', 1180,
      '<div class="ag-pad" style="max-width:820px;display:flex;flex-direction:column;gap:16px">'
      '<div><h2 class="ag-h2">Component inventory</h2><p class="ag-sub">Everything the seven phases of the build plan need, and where it stands. %d drawn, %d still to draw.</p></div>'
      '<div class="ag-card" style="overflow:hidden"><table class="ag-table">%s</table></div>'
      % (built, todo, rows)
      + '<div class="ag-banner is-gold">' + I('info') + '<span>The 11 still to draw are variations of patterns already here (a detail pane, a picker, an editor frame). They can wait until the phase that needs them, or be drawn now if you want the full set before coding.</span></div></div>',
      '''
# Component inventory

Every component the seven phases need, checked against what exists in this system.

**Built** — drawn in the Phase 0 pass. **Built now** — drawn in this pass, covering Phases 1–7 and the missing foundations (skeletons, submit states, form controls, tables, charts). **To draw** — 11 items, each a variation of a pattern already in the system.

Nothing in the plan is unaccounted for. The gaps are known and listed, not discovered later.
''', width=860, sub='All seven phases, what exists, what is missing')
print('ok')
