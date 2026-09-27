# Page layout: how every signed-in page is built from full-width bands.
# Mirrors components/app/band.tsx in the app, so the published system matches what ships.
import os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'project', 'components')
G = 'Foundations'


def write(name, height, body, readme, width=None, sub=''):
    d = os.path.join(ROOT, name)
    os.makedirs(d, exist_ok=True)
    marker = '<!-- @dsCard group="%s" height=%d%s page%s -->' % (
        G, height, (' width=%d' % width) if width else '', (' subtitle="%s"' % sub) if sub else '')
    style = (
        '.bd-page{border:1px solid var(--separator);border-radius:var(--radius-card);overflow:hidden;background:var(--bg)}'
        '.bd{padding:18px 22px}'
        '.bd.accent{background:color-mix(in srgb,var(--accent-soft) 70%,transparent);border-bottom:1px solid color-mix(in srgb,var(--accent) 10%,transparent)}'
        '.bd.soft{background:color-mix(in srgb,var(--fill) 60%,transparent);border-top:1px solid var(--separator);border-bottom:1px solid var(--separator)}'
        '.bd-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}'
        '.bd-stat{background:color-mix(in srgb,var(--surface) 70%,transparent);border:1px solid color-mix(in srgb,var(--accent) 10%,transparent);border-radius:var(--radius-card);padding:10px 12px}'
        '.bd-stat b{display:block;font:700 18px/24px var(--font-sans);margin-top:2px}'
        '.bd-stat .w{color:var(--amber)}'
        '.bd-row{display:flex;justify-content:space-between;padding:9px 12px;border-top:1px solid var(--separator);font:13px/18px var(--font-sans)}'
        '.bd-row:first-child{border-top:0}'
        '.bd-grid{display:grid;grid-template-columns:1.1fr 1fr;gap:28px;align-items:start}'
        '.bd-table{width:100%;border-collapse:collapse;font:13px/18px var(--font-sans)}'
        '.bd-table td,.bd-table th{text-align:left;padding:8px 10px;border-top:1px solid var(--separator);vertical-align:top}'
        '.bd-table th{color:var(--ink-2);font-weight:500;border-top:0}'
        '.sw{display:inline-block;width:14px;height:14px;border-radius:4px;border:1px solid var(--separator);vertical-align:-2px;margin-right:6px}'
    )
    open(os.path.join(d, 'preview.html'), 'w', encoding='utf-8').write(
        marker + '\n<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><title>' + name + '</title>'
        + '<style>' + style + '</style></head>\n<body>\n<div class="ag-pad">' + body
        + '</div>\n<script>Agency.ready();</script>\n</body>\n</html>\n')
    open(os.path.join(d, 'README.md'), 'w', encoding='utf-8').write(readme.strip() + '\n')


def stat(label, value, help_, warn=False):
    return ('<div class="bd-stat"><span class="ag-caps">%s</span><b%s>%s</b><span class="ag-sub" style="font-size:11px">%s</span></div>'
            % (label, ' class="w"' if warn else '', value, help_))


page = (
    '<div class="bd-page">'
    # lead band
    '<div class="bd accent"><div class="ag-sub" style="font-size:12px">Friday 25 September</div>'
    '<div class="ag-h3">Morning, Charis</div>'
    '<div class="bd-stats">' + stat('Open pipeline', 'KSh 2.27M', 'KSh 872k weighted') + stat('Speak to today', '2', 'Due today or overdue', True)
    + stat('Going quiet', '0', 'No contact in 30 days') + '</div></div>'
    # plain band
    '<div class="bd"><div class="ag-caps" style="margin-bottom:8px">Your tasks · due soon</div>'
    '<div class="ag-card" style="padding:0"><div class="bd-row"><span>Call Mercy about the band 3 price</span><span class="ag-sub">Due tomorrow</span></div>'
    '<div class="bd-row"><span>Confirm KEBS certificate</span><span class="ag-sub">Due today</span></div></div></div>'
    # soft band
    '<div class="bd soft"><div class="ag-caps" style="margin-bottom:8px">Closing soon</div>'
    '<div class="ag-card" style="padding:0"><div class="bd-row"><span>Masks — 500 units</span><b>KSh 240,000</b></div>'
    '<div class="bd-row"><span>Lab reagents Q4</span><b>KSh 950,000</b></div></div></div>'
    # plain again
    '<div class="bd"><div class="ag-caps" style="margin-bottom:8px">Setting up</div><div class="ag-sub">…and so on, alternating.</div></div>'
    '</div>'
)

rules = (
    '<table class="bd-table">'
    '<tr><th>Tone</th><th>Colour</th><th>Use</th></tr>'
    '<tr><td><b>Lead</b></td><td><span class="sw" style="background:var(--accent-soft)"></span>accent-soft at 70%, hairline of accent at 10% below</td><td>One per page, first. The greeting, the name, the key numbers.</td></tr>'
    '<tr><td><b>Plain</b></td><td><span class="sw" style="background:var(--bg)"></span>bg, no border</td><td>Every other band, starting with the one after the lead.</td></tr>'
    '<tr><td><b>Soft</b></td><td><span class="sw" style="background:var(--fill)"></span>fill at 60%, separator hairlines above and below</td><td>Alternates with plain, so neighbours always differ.</td></tr>'
    '</table>'
)

body = (
    '<div style="display:flex;flex-direction:column;gap:24px;max-width:1000px">'
    '<div><h2 class="ag-h2">Page bands</h2><p class="ag-sub" style="max-width:720px">Every signed-in page is a stack of full-width bands. '
    'Neighbouring bands take different tones, so the eye can tell where one part of a page ends and the next begins. '
    'The idea came from prolithica.com; only existing tokens are used.</p></div>'
    '<div class="bd-grid"><div><div class="ag-caps" style="margin-bottom:10px">1 · A page, top to bottom</div>' + page + '</div>'
    '<div style="display:flex;flex-direction:column;gap:22px">'
    '<div><div class="ag-caps" style="margin-bottom:10px">2 · Three tones</div><div class="ag-card" style="padding:0">' + rules + '</div>'
    '<p class="ag-sub" style="margin-top:8px;font-size:12px">After the lead, tones alternate by position among the bands actually shown, so a missing section never puts two plain bands together.</p></div>'
    '<div><div class="ag-caps" style="margin-bottom:10px">3 · The number tile</div><div class="bd-stats" style="margin:0">'
    + stat('Open deals', 'KSh 240k', '1 deal on the table') + stat('Overdue now', '2', 'Open and past due', True) + stat('Won this month', 'KSh 310k', 'Closed and agreed') +
    '</div><p class="ag-sub" style="margin-top:8px;font-size:12px">Label, figure, one line of help. A status colour on the figure always has its word in the help. '
    'On a phone the tiles sit side by side and the help line is hidden.</p></div>'
    '<div><div class="ag-caps" style="margin-bottom:10px">4 · Widths</div><div class="ag-card" style="padding:0"><table class="bd-table">'
    '<tr><td><b>Narrow</b></td><td>896px column</td><td>Reading pages: Today, Team, Settings, Flags</td></tr>'
    '<tr><td><b>Normal</b></td><td>1024px column</td><td>Record pages: an organisation, a deal, a project</td></tr>'
    '<tr><td><b>Wide</b></td><td>Full width</td><td>Boards and tables: the pipeline, the organisations list</td></tr>'
    '</table></div><p class="ag-sub" style="margin-top:8px;font-size:12px">Side padding 16px on a phone, 32px from tablet up; 24px top and bottom, 32px from tablet up.</p></div>'
    '<div><div class="ag-caps" style="margin-bottom:10px">5 · Motion</div><div class="ag-card" style="padding:0"><table class="bd-table">'
    '<tr><td><b>Arrive</b></td><td>Each band rises 10px and fades in over 240ms, ease-out, 60ms after the one above.</td></tr>'
    '<tr><td><b>Reveal</b></td><td>Bands below the fold rise 14px again as they scroll into view (a scroll timeline; browsers without one simply show them).</td></tr>'
    '<tr><td><b>Less motion</b></td><td>Both are switched off when the reader asks for reduced motion.</td></tr>'
    '</table></div></div>'
    '</div></div></div>'
)

write('Layout-01-Bands', 1060, body, '''
# Page bands

Every signed-in page is built from full-width bands (`components/app/band.tsx` in the app).

## Tones

- **Lead** — `accent-soft` at 70%, with a hairline of `accent` at 10% below. One per page, first: the greeting, the record's name, the key numbers. This is a second use of `accent-soft`, alongside selected rows.
- **Plain** — `bg`, no border.
- **Soft** — `fill` at 60%, with `separator` hairlines above and below.

After the lead, tones alternate plain, soft, plain by position among the bands actually shown (`toneAfterLead`), so neighbours always differ even when a section is hidden.

## Number tile (`BandStat`)

Label in caps, the figure, one line of help. A figure in a status colour always has its meaning in the help line. On a phone the tiles sit side by side and the help line is hidden.

## Widths

Narrow (896px) for reading pages, normal (1024px) for record pages, wide (full width) for boards and tables. Side padding 16px on a phone, 32px from tablet up.

## Motion

Arrive: rise 10px and fade in over 240ms, ease-out, staggered 60ms. Reveal: bands below the fold rise 14px as they scroll into view, via a CSS scroll timeline; unsupported browsers show them as they are. Both are off under `prefers-reduced-motion`.
''', width=1060, sub='Lead, plain and soft; number tiles; widths; motion')

print('wrote Layout-01-Bands')
