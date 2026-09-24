# CRM direction: what a best-in-class CRM has, what The Agency has, and the patterns to add.
import os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'project', 'components')
G = 'CRM direction'


def I(n, cls=''):
    return '<i data-i="%s"%s></i>' % (n, (' class="ag-ico %s"' % cls) if cls else '')


def write(name, height, body, readme, width=None, sub='', style=''):
    d = os.path.join(ROOT, name)
    os.makedirs(d, exist_ok=True)
    marker = '<!-- @dsCard group="%s" height=%d%s page%s -->' % (
        G, height, (' width=%d' % width) if width else '', (' subtitle="%s"' % sub) if sub else '')
    open(os.path.join(d, 'preview.html'), 'w', encoding='utf-8').write(
        marker + '\n<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><title>' + name + '</title>'
        + ('<style>' + style + '</style>' if style else '') + '</head>\n<body>\n<div class="ag-pad">' + body
        + '</div>\n<script>Agency.ready();</script>\n</body>\n</html>\n')
    open(os.path.join(d, 'README.md'), 'w', encoding='utf-8').write(readme.strip() + '\n')


# ---------------------------------------------------------------- 1. the gap
# area, capability, state: have | partial | add, note
ROWS = [
    ("Records", [
        ("People (contacts)", "partial", "Drawn in Phase 3. Needs owner, tags, source, lifecycle stage."),
        ("Organisations (client companies)", "add", "A record of its own, with people under it. Not the same thing as your ventures — see the naming note."),
        ("Deals / opportunities", "add", "Value, stage, expected close, probability, owner. This is the piece that makes it a CRM rather than an address book."),
        ("Pipelines and stages", "add", "Per company, editable stage list with win and loss reasons."),
        ("Activities", "partial", "Calls, meetings, WhatsApp, email, visits — one timeline across every record."),
        ("Notes and files on any record", "partial", "Notes exist for projects; attach to people, organisations and deals too."),
        ("Tags and segments", "add", "Colour tags, plus saved segments like 'PPE suppliers, Nairobi, touched in 30 days'."),
        ("Custom fields", "add", "Per company, per object, AI-suggested and approved by you — already in the plan's data model."),
    ]),
    ("Views", [
        ("Table view with column control", "add", "Choose, reorder and resize columns; sort; inline edit; remembers per view."),
        ("Saved views", "add", "'My suppliers', 'Deals closing this month', shared or private, as a tab strip."),
        ("Filter builder", "add", "Stacked conditions with and/or, on any field including custom ones."),
        ("Pipeline board", "add", "Deals as cards in stage columns, drag to move, totals per stage."),
        ("Split list and detail", "have", "The 3-pane shell already does this."),
        ("Record peek panel", "add", "Open a record beside the list without losing your place."),
        ("Global search and Ctrl K", "partial", "Drawn in Phase 2; needs to reach every CRM record type."),
    ]),
    ("Record page", [
        ("Header with quick actions", "partial", "Call, WhatsApp, email, meeting, log activity — drawn for contacts."),
        ("Properties panel, inline edit", "add", "Edit in place, no separate edit screen, with field history."),
        ("Unified timeline", "partial", "Every interaction, note, task, stage change and file in one stream, filterable."),
        ("Related records", "add", "Deals, projects, people at the same organisation, referrals in and out."),
        ("Ownership", "add", "Who owns this relationship, and who else can see it."),
        ("Next touch and cadence", "have", "Drawn in Phase 3, feeds Today."),
        ("Duplicate detection and merge", "add", "Two Mercy Wambuis is how a CRM dies. Detect on import and on create."),
    ]),
    ("Getting data in and out", [
        ("Import wizard", "add", "Upload, map columns, preview, handle duplicates, import — your Excel sheets on day one."),
        ("Phone contacts (vCard)", "add", "In the plan already."),
        ("Bulk actions", "add", "Select rows, then tag, assign, change stage, schedule a follow-up or export."),
        ("Export and per-contact delete", "partial", "Drawn for Phase 7; the Kenya DPA needs it per contact, not just per company."),
    ]),
    ("Getting work done", [
        ("Tasks against records", "partial", "Phase 1 tasks exist; they need to attach to a person, organisation or deal."),
        ("Follow-up reminders on Today", "have", "The Today sections are drawn."),
        ("Templates for WhatsApp and email", "add", "Pre-filled messages per situation — quote chase, price request, thank you."),
        ("Sequences", "add", "A cadence of touches over weeks. Later than Phase 3; note it so the data model allows it."),
        ("Stale detection", "add", "'No contact in 45 days' as a filter, a badge and a Today section."),
    ]),
    ("Insight", [
        ("Pipeline value and forecast", "add", "By stage, by owner, weighted by probability."),
        ("Conversion and win rate", "add", "Where deals die, and which source brings the good ones."),
        ("Activity volume", "partial", "Analytics v1 covers tasks; add calls and meetings logged per person."),
        ("Source and referral attribution", "partial", "The referral tree is drawn; connect it to won deals."),
    ]),
    ("Trust", [
        ("Per-record permissions", "add", "A viewer sees the relationship but not the price list; an admin sees everything."),
        ("Consent notes", "have", "Drawn in Phase 3."),
        ("Audit trail per record", "partial", "The activity log exists; surface it on the record."),
    ]),
]

STATE = {
    "have": ("is-green", "Have"),
    "partial": ("is-amber", "Partly"),
    "add": ("", "To add"),
}

rows = ''
for area, items in ROWS:
    rows += ('<tr><td colspan="3" style="background:var(--fill);font:600 12px/16px var(--font-sans);'
             'letter-spacing:.3px;text-transform:uppercase;color:var(--ink-2)">%s</td></tr>' % area)
    for cap, st, note in items:
        cls, label = STATE[st]
        rows += ('<tr><td style="width:230px;font-weight:500">%s</td>'
                 '<td style="width:96px"><span class="ag-pill %s">%s</span></td>'
                 '<td class="ag-sub">%s</td></tr>' % (cap, cls, label, note))

counts = {k: 0 for k in STATE}
for _, items in ROWS:
    for _, st, _ in items:
        counts[st] += 1

write('CRM-01-Gap', 1500,
      '<div style="max-width:860px;display:flex;flex-direction:column;gap:16px">'
      '<div><h2 class="ag-h2">Becoming a real CRM</h2>'
      '<p class="ag-sub" style="max-width:680px">Measured against what the strong ones do — HubSpot, Salesforce, Pipedrive, Attio, Folk — '
      'and against what The Agency is for: one person running several ventures in Nairobi, who needs the relationships and the money to be in the same place as the work. '
      '<b>%d already drawn, %d partly there, %d to add.</b></p></div>'
      '<div class="ag-card" style="overflow:hidden"><table class="ag-table">%s</table></div>'
      '<div class="ag-banner is-amber">%s<span><b>One naming decision first.</b> Today "company" means one of your ventures (Kilima Labs). '
      'A CRM also needs a word for the businesses you sell to and buy from. Proposal: your ventures stay <b>companies</b>, the people you deal with belong to '
      '<b>organisations</b>. The alternative is renaming your ventures to workspaces, which is a bigger change and more jargon.</span></div>'
      '</div>' % (counts['have'], counts['partial'], counts['add'], rows, I('alert')),
      '''
# Becoming a real CRM

A capability-by-capability read of The Agency against the CRMs worth copying, split into what is already drawn, what is half there, and what is missing.

The honest summary: the Network module as drawn is a **good contact book with a follow-up cadence**. Three things separate that from a CRM people run their business on — **deals with a pipeline**, **saved views over a real table**, and **organisations as records** with people under them. Everything else on this list is refinement.

**Sequence I would follow:** organisations and deals first (they change the data model), then table views and saved views (they change every list screen), then import and merge (you have real spreadsheets waiting), then reporting. Sequences and templates last.

**The naming decision matters now**, because it lands in the database: your ventures keep the word *company*; the businesses you deal with become *organisations*.
''', width=900, sub='What the strong CRMs do, and where we stand')


# ------------------------------------------------- 2. patterns, in our skin
def pill(cls, text, dot=False):
    return '<span class="ag-pill %s">%s%s</span>' % (cls, '<i></i>' if dot else '', text)


def col(title, count, value, cards):
    return ('<div class="ag-col" style="grid-auto-columns:200px"><div class="ag-col-head">%s<b>%s · %s</b></div>%s'
            '<div class="ag-sub" style="padding:2px 6px">+ Add deal</div></div>'
            % (title, count, value, ''.join(cards)))


def deal(name, org, value, when, avatar, flag=''):
    return ('<div class="ag-tcard"><div class="t">%s</div><div class="ag-sub" style="font-size:11px">%s</div>'
            '<div style="font:600 13px/18px var(--font-sans)">%s</div>'
            '<div class="meta"><span class="ag-av sm">%s</span>%s%s</div></div>'
            % (name, org, value, avatar, when, flag))

table_rows = ''
for name, org, tags, owner, last, next_, stage in [
    ("Mercy Wambui", "Vision Safety", [("PPE", ""), ("Supplier", "")], "CN", "2 days ago", "Today", ("is-amber", "Quote sent")),
    ("James Kiprono", "Safaricom", [("Partner", "")], "WK", "3 days ago", "28 Sep", ("is-green", "Won")),
    ("Peter Njoroge", "Ridge Spares", [("Mechanic", "")], "OO", "14 days ago", "—", ("", "New")),
    ("Grace Atieno", "Kilima Labs", [("Reagents", "")], "AN", "45 days ago", "Overdue", ("is-red", "Stale")),
]:
    table_rows += ('<tr><td><span class="ag-check"></span></td>'
                   '<td><div class="ag-row-x" style="gap:8px"><span class="ag-av sm">%s</span><b>%s</b></div></td>'
                   '<td class="ag-sub">%s</td><td>%s</td><td>%s</td>'
                   '<td class="ag-sub">%s</td><td class="ag-sub">%s</td><td><span class="ag-av sm">%s</span></td></tr>'
                   % (''.join(w[0] for w in name.split()[:2]), name, org,
                      ''.join('<span class="ag-tag">%s</span>' % t[0] for t in tags),
                      pill(stage[0], stage[1]), last, next_, owner))

write('CRM-02-Patterns', 1180,
      '<div style="display:flex;flex-direction:column;gap:28px;max-width:960px">'

      '<div><h2 class="ag-h2">The patterns a CRM needs, in our skin</h2>'
      '<p class="ag-sub" style="max-width:680px">Four screens that do not exist yet. Same maroon, same spacing, same components — '
      'they only add the mechanics that make a list of people usable when there are two thousand of them.</p></div>'

      # saved views + table + bulk bar
      '<div><div class="ag-caps" style="margin-bottom:10px">1 · Saved views, table, bulk actions</div>'
      '<div class="ag-card" style="overflow:hidden">'
      '<div class="ag-row-x" style="justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--separator)">'
      '<div class="ag-row-x" style="gap:4px"><span class="ag-pill is-gold">All people 214</span>'
      '<span class="ag-pill">Suppliers 68</span><span class="ag-pill">Touch due 12</span><span class="ag-pill">Stale 45d</span>'
      '<span class="ag-sub" style="margin-left:6px">+ Save this view</span></div>'
      '<div class="ag-row-x" style="gap:6px">'
      '<span class="ag-tag">' + I('search', 'ag-ico-sm') + 'Search</span>'
      '<span class="ag-tag">' + I('settings', 'ag-ico-sm') + 'Filter: category is Supplier</span>'
      '<span class="ag-tag">' + I('panel', 'ag-ico-sm') + 'Columns</span></div></div>'
      '<div class="ag-row-x" style="justify-content:space-between;padding:8px 14px;background:var(--accent-soft);color:var(--accent-ink);font:500 13px/18px var(--font-sans)">'
      '<span>3 selected</span><div class="ag-row-x" style="gap:6px">'
      + ''.join('<button class="ag-btn ag-btn-secondary" style="height:26px;font-size:12px">%s</button>' % b
                for b in ['Tag', 'Assign owner', 'Schedule follow-up', 'Export', 'Delete'])
      + '</div></div>'
      '<table class="ag-table"><tr><th style="width:28px"></th><th>Name</th><th>Organisation</th><th>Tags</th><th>Stage</th><th>Last contact</th><th>Next touch</th><th>Owner</th></tr>'
      + table_rows + '</table></div></div>'

      # pipeline
      '<div><div class="ag-caps" style="margin-bottom:10px">2 · Pipeline board</div>'
      '<div class="ag-board" style="grid-auto-columns:200px">'
      + col('New', 4, 'KSh 1.2M', [deal('PPE batch 2', 'Safaricom', 'KSh 480,000', 'in 6 days', 'CN')])
      + col('Quoted', 3, 'KSh 2.4M', [deal('Lab reagents Q4', 'Kilima Labs', 'KSh 950,000', 'in 2 days', 'AN', pill('is-amber', 'Chase', True)),
                                      deal('Masks — 500 units', 'Vision Safety', 'KSh 240,000', 'today', 'WK')])
      + col('Negotiating', 2, 'KSh 900k', [deal('Depot lease', 'Ridge Moto', 'KSh 600,000', 'in 9 days', 'OO')])
      + col('Won', 6, 'KSh 3.1M', [deal('First-aid kits', 'County office', 'KSh 310,000', 'closed', 'CN', pill('is-green', 'Won', True))])
      + '</div></div>'

      # record 360
      '<div><div class="ag-caps" style="margin-bottom:10px">3 · Record page — properties, timeline, related</div>'
      '<div class="ag-card" style="overflow:hidden">'
      '<div class="ag-row-x" style="gap:14px;padding:16px;border-bottom:1px solid var(--separator)">'
      '<span class="ag-av lg gold">MW</span><div style="flex:1"><div class="ag-h3">Mercy Wambui</div>'
      '<div class="ag-sub">Sales lead · Vision Safety Ltd · Industrial Area</div></div>'
      '<div class="ag-row-x" style="gap:6px">'
      + ''.join('<button class="ag-btn ag-btn-secondary" style="height:30px">%s%s</button>' % (I(ic, 'ag-ico-sm'), l)
                for ic, l in [('phone', 'Call'), ('share', 'WhatsApp'), ('mail', 'Email'), ('plus', 'Log')])
      + '</div></div>'
      '<div style="display:grid;grid-template-columns:230px 1fr 210px">'
      '<div style="padding:14px;border-right:1px solid var(--separator);display:flex;flex-direction:column;gap:10px">'
      '<span class="ag-caps">Properties</span>'
      + ''.join('<div><div class="ag-sub" style="font-size:11px">%s</div><div style="font-size:13px;line-height:18px">%s</div></div>' % (k, v)
                for k, v in [('Owner', 'Charis N.'), ('Category', 'Supplier · PPE'), ('Lead time', '5–7 days'),
                             ('Credit terms', '30 days'), ('Consent', 'Given 14 Aug 2026')])
      + '<div class="ag-sub" style="color:var(--accent-ink)">+ Add field</div></div>'
      '<div style="padding:14px;display:flex;flex-direction:column;gap:10px">'
      '<div class="ag-row-x" style="justify-content:space-between"><span class="ag-caps">Timeline</span>'
      '<div class="ag-row-x" style="gap:4px"><span class="ag-tag">All</span><span class="ag-tag">Calls</span><span class="ag-tag">Notes</span><span class="ag-tag">Deals</span></div></div>'
      + ''.join('<div style="display:flex;gap:10px"><span style="width:24px;height:24px;border-radius:50%%;background:var(--accent-soft);color:var(--accent-ink);display:flex;align-items:center;justify-content:center;flex:none">%s</span>'
                '<div><div style="font-size:13px;line-height:18px">%s</div><div class="ag-sub" style="font-size:11px">%s</div></div></div>'
                % (I(ic, 'ag-ico-sm'), t, d)
                for ic, t, d in [('projects', 'Deal moved to Quoted — KSh 240,000', 'today, 09:12 · Charis'),
                                 ('phone', 'Called about mask pricing, promised band 3 rates', '18 Sep · 6 min'),
                                 ('notebook', 'Note: will discount at 500 units', '18 Sep'),
                                 ('meetings', 'Site visit, Industrial Area warehouse', '2 Sep · with Wanjiru')])
      + '</div>'
      '<div style="padding:14px;border-left:1px solid var(--separator);display:flex;flex-direction:column;gap:10px">'
      '<span class="ag-caps">Related</span>'
      + ''.join('<div class="ag-card ag-card-pad" style="padding:8px;box-shadow:none;border:1px solid var(--separator)">'
                '<div style="font:500 12px/16px var(--font-sans)">%s</div><div class="ag-sub" style="font-size:11px">%s</div></div>' % (t, m)
                for t, m in [('Masks — 500 units', 'Deal · KSh 240,000'), ('PPE Campaign', 'Project · on track'),
                             ('Vision Safety Ltd', 'Organisation · 3 people'), ('Referred by James K.', 'Referral')])
      + '</div></div></div></div>'

      # import
      '<div><div class="ag-caps" style="margin-bottom:10px">4 · Import wizard — your spreadsheets on day one</div>'
      '<div class="ag-card ag-card-pad" style="display:flex;flex-direction:column;gap:14px">'
      '<div class="ag-steps"><span class="s done"><b>' + I('check', 'ag-ico-sm') + '</b>Upload</span><span class="bar"></span>'
      '<span class="s on"><b>2</b>Map columns</span><span class="bar"></span><span class="s"><b>3</b>Duplicates</span>'
      '<span class="bar"></span><span class="s"><b>4</b>Import</span></div>'
      '<table class="ag-table"><tr><th>Column in your file</th><th>Becomes</th><th>First row</th></tr>'
      + ''.join('<tr><td><b>%s</b></td><td><span class="ag-tag">%s ' % (a, b) + I('down', 'ag-ico-sm') + '</span></td><td class="ag-sub">%s</td></tr>'
                for a, b, c in [('SUPPLIER NAME', 'Organisation', 'Vision Safety Ltd'),
                                ('Contact person', 'Person · full name', 'Mercy Wambui'),
                                ('Tel', 'Phone', '+254 7•• ••• 214'),
                                ('Items', 'Tags', 'PPE, masks'),
                                ('Price list date', 'Custom field · date', '12/09/2026')])
      + '</table>'
      '<div class="ag-banner is-amber">' + I('alert') + '<span><b>2 possible duplicates found.</b> Mercy Wambui already exists with a different phone. Review them at the next step — nothing is written until you say so.</span></div>'
      '<div class="ag-row-x" style="justify-content:flex-end"><button class="ag-btn ag-btn-secondary">Back</button><button class="ag-btn ag-btn-primary">Review duplicates</button></div>'
      '</div></div>'
      '</div>',
      '''
# CRM patterns, in our skin

Four things the current mockups do not have, drawn in the maroon system so you can judge them against what is already there.

1. **Saved views, table and bulk actions.** A tab strip of saved views, a filter that stacks conditions, column control, and a bulk bar that appears when rows are selected. This is what makes 2,000 contacts workable and it changes every list screen in the app.
2. **Pipeline board.** Deals as cards in stage columns with a total per stage, dragged from Quoted to Negotiating to Won. Without this The Agency is an address book with reminders.
3. **Record page.** Properties you edit in place on the left, a filterable timeline of everything that ever happened in the middle, related deals, projects, organisations and referrals on the right.
4. **Import wizard.** Upload, map your own column names, catch duplicates, then import. Your supplier and Safaricom sheets are the first real test of the whole app.

All four reuse components that already exist — table, tags, pills, steps, cards, timeline rows. The new parts are the view strip, the filter builder, the bulk bar and the board.
''', width=1000, sub='Views, pipeline, record page, import')
print('ok')
