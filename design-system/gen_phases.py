# Components for Phases 1-7 of The Agency.
import os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'project', 'components')


def I(n, cls=''):
    return '<i data-i="%s"%s></i>' % (n, (' class="ag-ico %s"' % cls) if cls else '')


def write(name, group, height, body, readme, width=None, sub=''):
    d = os.path.join(ROOT, name)
    os.makedirs(d, exist_ok=True)
    marker = '<!-- @dsCard group="%s" height=%d%s%s -->' % (group, height, (' width=%d' % width) if width else '', (' subtitle="%s"' % sub) if sub else '')
    open(os.path.join(d, 'preview.html'), 'w', encoding='utf-8').write(
        marker + '\n<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><title>' + name + '</title></head>\n<body>\n'
        + '<div class="ag-pad">' + body + '</div>\n<script>Agency.ready();</script>\n</body>\n</html>\n')
    open(os.path.join(d, 'README.md'), 'w', encoding='utf-8').write(readme.strip() + '\n')


P1, P2, P3, P4, P5, P6, P7 = ('Phase 1 · Projects', 'Phase 2 · Today &amp; capture', 'Phase 3 · Network',
                              'Phase 4 · Meetings', 'Phase 5 · Comms', 'Phase 6 · Mentor', 'Phase 7 · Harden')
FND = 'Foundations'

av = lambda i, g='': '<span class="ag-av sm %s">%s</span>' % (g, i)
pill = lambda c, t, dot=True: '<span class="ag-pill %s">%s%s</span>' % (c, '<i></i>' if dot else '', t)

# ---------------- Phase 1 ----------------
def project_card(title, sub, pct, ring, status, scls, checkin, overdue, people):
    return ('<div class="ag-card ag-card-pad" style="display:flex;flex-direction:column;gap:12px;width:300px">'
            '<div style="display:flex;gap:12px;align-items:flex-start"><div class="ag-ring %s" data-p="%d"><span>%d%%</span></div>'
            '<div style="flex:1;min-width:0"><div class="ag-h3" style="font-size:15px">%s</div><div class="ag-sub">%s</div></div>%s</div>'
            '<div class="ag-row-x" style="gap:6px">%s%s</div>'
            '<div style="display:flex;align-items:center;justify-content:space-between"><div class="ag-stackav">%s</div><span class="ag-sub">%s</span></div></div>'
            % (ring, pct, pct, title, sub, I('more', 'chev ag-ico-sm'), pill(scls, status),
               '<span class="ag-pill is-red">%d overdue</span>' % overdue if overdue else '',
               ''.join(av(p) for p in people), checkin))

write('Project-01-Card', P1, 300,
      '<div class="ag-row-x" style="gap:16px;align-items:flex-start">'
      + project_card('PPE Campaign', 'Safaricom partners · closes 30 Oct', 72, '', 'On track', 'is-green', 'Check-in Fri', 0, ['WK', 'OO', 'AN'])
      + project_card('Lab restock Q4', 'Kilima Labs · closes 12 Nov', 38, 'is-amber', 'At risk', 'is-amber', 'Check-in today', 3, ['AN', 'CN'])
      + project_card('Depot move', 'Ridge Moto · closes 5 Dec', 15, 'is-red', 'Blocked', 'is-red', 'Overdue 2 days', 5, ['OO'])
      + '</div>',
      '''
# ProjectCard

One card per project on the Ongoing tab. Progress ring, title, the company and close date, status pill, overdue count, the people on it, and when the next check-in falls.

The ring colour follows status: `accent` on track, `amber` at risk, `red` blocked. Overdue only appears when there is something overdue. Tap opens the project.
''', width=980, sub='Ongoing projects list')

write('Project-02-TaskViews', P1, 460,
      '<div style="display:flex;flex-direction:column;gap:20px">'
      '<div class="ag-tabs"><span class="is-on">List</span><span>Board</span><span>Timeline</span></div>'
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start">'
      '<div><div class="ag-caps" style="margin-bottom:8px">List</div><div class="ag-group">'
      + ''.join('<div class="ag-lrow flat" style="min-height:46px"><span class="ag-check %s">%s</span><div class="body"><div class="t">%s</div><div class="m">%s</div></div>%s%s</div>'
                % (o, I('check', 'ag-ico-sm') if o else '', t, m, pill(c, s), av(a))
                for t, m, o, c, s, a in [('Confirm KEBS certificate', 'Due today · High', '', 'is-amber', 'In progress', 'WK'),
                                         ('Send quote to Safaricom', 'Due 25 Sep', '', '', 'To do', 'OO'),
                                         ('Collect 3 supplier prices', 'Done 20 Sep', 'on', 'is-green', 'Done', 'AN')]) + '</div></div>'
      '<div><div class="ag-caps" style="margin-bottom:8px">Board</div><div class="ag-board" style="grid-auto-columns:150px">'
      + ''.join('<div class="ag-col"><div class="ag-col-head">%s<b>%d</b></div>%s</div>'
                % (h, len(cards), ''.join('<div class="ag-tcard %s"><div class="t">%s</div><div class="meta">%s%s</div></div>' % (dr, t, av(a), p) for t, a, p, dr in cards))
                for h, cards in [('To do', [('Send quote', 'OO', pill('', 'Med', False), ''), ('Book truck', 'WK', '', '')]),
                                 ('In progress', [('KEBS cert', 'WK', pill('is-amber', 'High', False), 'is-drag')]),
                                 ('Done', [('Supplier prices', 'AN', '', '')])]) + '</div></div></div>'
      '<div><div class="ag-caps" style="margin-bottom:8px">Timeline</div><div class="ag-gantt" style="position:relative">'
      + ''.join('<div class="g-row"><span class="ag-sub" style="color:var(--ink)">%s</span><div class="ag-track"><div class="ag-tbar %s" style="left:%d%%;width:%d%%">%s</div></div></div>'
                % (n, c, l, w, lab) for n, c, l, w, lab in [('Scope agreed', 'green', 0, 22, 'Done'), ('Supplier quotes', '', 18, 30, '5 tasks'),
                                                            ('KEBS approval', 'amber', 44, 24, 'At risk'), ('Delivery', 'soft', 66, 30, 'Nov')])
      + '<div class="ag-nowline" style="left:calc(148px + 12px + 40%)"></div></div></div></div>',
      '''
# Task views

Three views of the same tasks, switched with tabs: **List** (checkbox, title, due and priority meta, status, assignee), **Board** (Kanban by status, cards carry assignee and priority, drag tilts the card), **Timeline** (bars by due date with a red "today" line).

Every view shows the same `tasks` rows. Status colours: to do neutral, in progress amber, in review blue, done green, blocked red.
''', width=980, sub='List, Board and Timeline')

write('Project-03-TeamSuggestion', P1, 430,
      '<div style="max-width:620px;display:flex;flex-direction:column;gap:12px">'
      '<div class="ag-banner is-gold">' + I('mentor') + '<span>Claude read your scope and suggests this team. Nothing is assigned until you accept a line.</span></div>'
      '<div class="ag-group">'
      + ''.join('<div class="ag-lrow flat" style="align-items:flex-start"><div class="body"><div class="t">%s %s</div><div class="m">%s</div></div>'
                '<div class="ag-row-x" style="gap:6px"><button class="ag-btn ag-btn-secondary" style="height:28px">Edit</button><button class="ag-btn ag-btn-tinted" style="height:28px">%s Accept</button></div></div>'
                % (role, pill('is-gold', kind, False), why, I('check', 'ag-ico-sm'))
                for role, kind, why in [('Procurement lead · 1 person', 'Person', 'Owns supplier quotes and KEBS paperwork. Suggested: Achieng.'),
                                        ('Field coordinator · 2 people', 'Person', 'Deliveries and site checks in Nairobi and Thika.'),
                                        ('Quote drafting', 'AI tasker', 'Claude drafts quotes from the price list; a person approves before sending.'),
                                        ('Weekly summary', 'AI tasker', 'Claude drafts the check-in from task activity every Friday.')]) + '</div>'
      '<div class="ag-row-x" style="justify-content:space-between"><span class="ag-sub">Milestones suggested: 4 · deadlines proposed from your close date</span>'
      '<div class="ag-row-x"><button class="ag-btn ag-btn-plain">Reject all</button><button class="ag-btn ag-btn-primary">Accept 3 selected</button></div></div></div>',
      '''
# AI team structure

After the scope is written, Claude proposes roles, headcount, which work suits a person versus an AI tasker, and milestones with dates. Each line is accepted, edited or rejected on its own — the app never assigns anyone automatically.

Accepted lines write `project_members` and `milestones`; the whole proposal is kept in `team_suggestions` so you can see what was suggested and what you changed.
''', width=700, sub='Suggest, never impose')

write('Project-04-CheckIn', P1, 450,
      '<div style="max-width:620px;display:flex;flex-direction:column;gap:12px">'
      '<div class="ag-banner is-amber">' + I('clock') + '<span><b>Check-in due today</b> for PPE Campaign. Covers 16–23 Sep.</span></div>'
      '<div class="ag-card ag-card-pad" style="display:flex;flex-direction:column;gap:12px">'
      '<div class="ag-row-x" style="justify-content:space-between"><span class="ag-caps">Progress report</span><button class="ag-btn ag-btn-tinted" style="height:28px">' + I('mentor', 'ag-ico-sm') + ' Draft from activity</button></div>'
      '<div style="border:1px solid var(--separator);border-radius:var(--radius-input);padding:12px;font-size:14px;line-height:20px">'
      '<b>What moved.</b> 8 of 14 tasks closed this week. Supplier quotes are in from 3 of 5 vendors; Achieng closed the price comparison two days early.<br><br>'
      '<b>What is stuck.</b> KEBS certification is waiting on a document from the supplier since 18 Sep. This is the only thing between us and the delivery date.<br><br>'
      '<b>Next week.</b> Chase the certificate, send the Safaricom quote, book the truck.</div>'
      '<div class="ag-row-x" style="gap:16px"><div style="flex:1"><div class="ag-sub" style="margin-bottom:4px">Progress</div><div class="ag-slider"><i style="width:72%"></i><b style="left:calc(72% - 9px)"></b></div></div>'
      '<span class="ag-h3">72%</span></div>'
      '<div class="ag-field"><label class="ag-label">Risks</label><div class="ag-input"><span class="grow">KEBS delay could push delivery past 30 Oct</span></div></div>'
      '<div class="ag-row-x" style="justify-content:flex-end"><button class="ag-btn ag-btn-secondary">Save draft</button><button class="ag-btn ag-btn-primary">Post check-in</button></div></div></div>',
      '''
# Check-in

On the project's cadence (weekly, fortnightly or monthly) a check-in falls due. "Draft from activity" asks Claude to summarise the period's task changes; you edit it before posting. Posted check-ins are kept as the project's progress history.

Three headings, always: what moved, what is stuck, next week. Plus a progress percentage and a risks line.
''', width=700, sub='Drafted from activity, edited by you')

write('Project-05-Flag', P1, 420,
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;max-width:900px">'
      '<div class="ag-card ag-card-pad" style="display:flex;flex-direction:column;gap:12px">'
      '<div class="ag-row-x"><span class="ag-h3">Raise a flag</span><span class="ag-pill is-red">' + I('lock', 'ag-ico-sm') + 'Private</span></div>'
      '<p class="ag-sub" style="margin:0">Only you and the company owner see this. It is never shown to the person, and never on a leaderboard.</p>'
      '<div class="ag-field"><label class="ag-label">About</label><div class="ag-input"><span class="grow">' + 'Otieno Odhiambo · Send quote to Safaricom</span>' + I('down', 'ag-ico-sm') + '</div></div>'
      '<div class="ag-field"><label class="ag-label">Severity</label><div class="ag-row-x" style="gap:8px">'
      '<span class="ag-pill">Note</span><span class="ag-pill is-amber" style="outline:2px solid var(--amber);outline-offset:1px">Warning</span><span class="ag-pill is-red">Serious</span></div></div>'
      '<div class="ag-field"><label class="ag-label">What happened</label><div class="ag-input" style="height:72px;align-items:flex-start;padding-top:8px"><span class="grow" style="white-space:normal">Quote promised Monday, sent Thursday. Third time this month.</span></div></div>'
      '<button class="ag-btn ag-btn-primary ag-btn-block">Save flag</button></div>'
      '<div class="ag-card ag-card-pad" style="display:flex;flex-direction:column;gap:10px;background:var(--accent-soft)">'
      '<div class="ag-row-x">' + I('mentor') + '<span class="ag-h3" style="color:var(--accent-ink)">Suggested conversation</span></div>'
      '<p style="margin:0;font-size:14px;line-height:20px">Situation, behaviour, impact — then ask, don\'t tell:</p>'
      '<ol style="margin:0;padding-left:18px;font-size:14px;line-height:21px">'
      '<li>"The Safaricom quote was due Monday and went out Thursday."</li>'
      '<li>"That pushed their reply past our delivery window."</li>'
      '<li>"What got in the way?" — then listen.</li>'
      '<li>Agree one specific change and a date to review it.</li></ol>'
      '<div class="ag-row-x" style="margin-top:4px"><button class="ag-btn ag-btn-secondary" style="height:28px">Log the conversation</button></div></div></div>',
      '''
# Flags (private)

A flag records a concern about a person, task or project. Severity: note, warning, serious. Visible only to the person who raised it and to owners and admins — never to the person it is about, and never in public.

Every flag comes with a suggested conversation built on situation–behaviour–impact, ending in a question and one agreed change. Logging the conversation afterwards closes the loop.
''', width=940, sub='Severity, and a script for the conversation')

write('Project-06-Retro', P1, 400,
      '<div style="max-width:660px;display:flex;flex-direction:column;gap:14px">'
      '<div class="ag-steps"><span class="s done"><b>' + I('check', 'ag-ico-sm') + '</b>Went well</span><span class="bar"></span><span class="s on"><b>2</b>Went wrong</span><span class="bar"></span><span class="s"><b>3</b>Lessons</span></div>'
      '<div class="ag-card ag-card-pad" style="display:flex;flex-direction:column;gap:12px">'
      '<div class="ag-h3">What went wrong on PPE Campaign?</div>'
      '<div class="ag-group" style="box-shadow:none;border:1px solid var(--separator)">'
      + ''.join('<div class="ag-lrow flat" style="min-height:42px"><span class="ag-check %s">%s</span><div class="body t" style="font-weight:400">%s</div></div>'
                % (o, I('check', 'ag-ico-sm') if o else '', t)
                for t, o in [('KEBS certificate chased too late', 'on'), ('Two tasks had no deadline', 'on'), ('Supplier list was out of date', ''), ('Add your own…', '')]) + '</div>'
      '<div class="ag-banner is-gold">' + I('mentor') + '<span><b>Claude will summarise this into reusable lessons</b> and compare it with your other closed projects.</span></div>'
      '<div class="ag-row-x" style="justify-content:space-between"><button class="ag-btn ag-btn-plain">Back</button><button class="ag-btn ag-btn-primary">Continue</button></div></div></div>',
      '''
# Close project · retrospective

Closing a project walks three steps: what went well, what went wrong, lessons. Items are picked from what the app already noticed (tasks without deadlines, late chases) or typed in.

Claude turns the answers into short reusable lessons, stored on the project and fed to the Mentor module, which looks for patterns across closed projects.
''', width=700, sub='Three steps, then AI lessons')

write('Project-07-Analytics', P1, 400,
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;max-width:940px;align-items:start">'
      '<div class="ag-card ag-card-pad"><div class="ag-row-x" style="justify-content:space-between;margin-bottom:12px"><span class="ag-caps">Tasks closed per week</span><span class="ag-pill is-green">+18%</span></div>'
      '<div class="ag-bars">' + ''.join('<div><i style="height:%d%%" class="%s"></i><span>%s</span></div>' % (h, c, l)
                                        for h, c, l in [(35, 'alt', 'W1'), (52, 'alt', 'W2'), (44, 'alt', 'W3'), (68, 'alt', 'W4'), (60, 'alt', 'W5'), (88, '', 'W6')]) + '</div></div>'
      '<div class="ag-card ag-card-pad"><span class="ag-caps">This quarter</span>'
      '<div style="display:flex;gap:24px;margin-top:12px">'
      + ''.join('<div style="text-align:center"><div class="ag-ring %s" data-p="%d" style="width:64px;height:64px"><span style="font-size:13px">%d%%</span></div><div class="ag-sub" style="margin-top:6px">%s</div></div>'
                for _ in [0] for _, in []) +
      ''.join('<div style="text-align:center"><div class="ag-ring %s" data-p="%d" style="width:64px;height:64px"><span style="font-size:13px">%d%%</span></div><div class="ag-sub" style="margin-top:6px">%s</div></div>'
              % (c, p, p, l) for c, p, l in [('is-green', 86, 'Completion'), ('', 71, 'On time'), ('is-amber', 24, 'Reassigned')]) + '</div></div>'
      '<div class="ag-card" style="grid-column:1 / -1;overflow:hidden"><table class="ag-table">'
      '<tr><th>Person</th><th>Assigned</th><th>Done</th><th>On time</th><th>Overdue</th><th>Trend</th></tr>'
      + ''.join('<tr><td><div class="ag-row-x">%s<span>%s</span></div></td><td class="ag-num">%d</td><td class="ag-num">%d</td><td class="ag-num">%s</td><td>%s</td>'
                '<td><div class="ag-spark">%s</div></td></tr>'
                % (av(i), n, a, d, ot, pill('is-red', str(ov), False) if ov else '<span class="ag-sub">0</span>',
                   ''.join('<i class="%s" style="height:%d%%"></i>' % ('on' if k > 3 else '', h) for k, h in enumerate([30, 45, 40, 62, 70, 85])))
                for i, n, a, d, ot, ov in [('WK', 'Wanjiru Kamau', 24, 22, '92%', 0), ('OO', 'Otieno Odhiambo', 18, 12, '61%', 3),
                                           ('AN', 'Achieng Njeri', 21, 20, '95%', 0)]) + '</table></div></div>',
      '''
# Analytics v1

What the plan asks for: completion rate, on-time rate, and overdue by person and by project — plus a simple trend so you can see direction, not just a number.

Rules: no public leaderboard, no shaming. These numbers are for owners and admins, and they exist to start conversations, not to rank people.
''', width=980, sub='Completion, on-time, overdue by person')

# ---------------- Phase 2 ----------------
write('Today-01-CommandPalette', P2, 440,
      '<div style="display:flex;justify-content:center"><div class="ag-cmd">'
      '<div class="ag-cmd-input">' + I('search') + '<span class="ag-muted">ppe</span><span style="width:1px;height:20px;background:var(--accent);display:inline-block"></span><span class="ag-kbd" style="margin-left:auto">Esc</span></div>'
      '<div class="ag-cmd-sec ag-caps">Projects</div>'
      '<div class="ag-cmd-row is-on">' + I('projects') + 'PPE Campaign — Safaricom Partners<span class="end">Open</span></div>'
      '<div class="ag-cmd-sec ag-caps">Tasks</div>'
      + ''.join('<div class="ag-cmd-row">%s%s<span class="end">%s</span></div>' % (I('check'), t, e)
                for t, e in [('Confirm KEBS certificate for PPE batch', 'Due today'), ('Send PPE quote to Safaricom', 'Otieno')])
      + '<div class="ag-cmd-sec ag-caps">Create</div>'
      + ''.join('<div class="ag-cmd-row">%s%s<span class="end">%s</span></div>' % (I(ic), t, k)
                for ic, t, k in [('plus', 'New task in PPE Campaign', 'Ctrl N'), ('userplus', 'Invite someone to Kilima Labs', ''), ('notebook', 'New note', '')])
      + '</div></div>',
      '''
# Command palette

`Ctrl K` / `⌘ K` anywhere. Typing three letters finds projects, tasks, contacts and notes, and offers create actions for what you typed.

Results are grouped and keyboard-driven: arrows move, Enter opens, Esc closes. The highlighted row uses `accent-soft`.
''', width=700, sub='Ctrl K · find or create anything')

write('Today-02-Capture', P2, 470,
      '<div style="display:grid;grid-template-columns:320px 1fr;gap:24px;align-items:start;max-width:900px">'
      '<div class="ag-card" style="overflow:hidden"><div class="ag-card-pad" style="display:flex;flex-direction:column;gap:10px">'
      '<div class="ag-row-x" style="justify-content:space-between"><span class="ag-h3">Quick capture</span>' + I('x', 'chev') + '</div>'
      '<div class="ag-input" style="height:96px;align-items:flex-start;padding-top:10px"><span class="grow" style="white-space:normal">Ask Wanjiru for the Thika depot rate card before Friday</span></div>'
      '<div class="ag-row-x" style="gap:6px"><span class="ag-tag">' + I('projects', 'ag-ico-sm') + 'PPE Campaign</span><span class="ag-tag">' + I('clock', 'ag-ico-sm') + 'Friday</span><span class="ag-tag">' + I('team', 'ag-ico-sm') + 'Wanjiru</span></div>'
      '<div class="ag-row-x" style="justify-content:space-between"><button class="ag-btn ag-btn-secondary ag-btn-icon" aria-label="Dictate">' + I('mentor') + '</button>'
      '<button class="ag-btn ag-btn-primary">Capture</button></div>'
      '<span class="ag-sub">Goes to your Inbox. Sort it later.</span></div></div>'
      '<div><div class="ag-row-x" style="justify-content:space-between;margin-bottom:8px"><span class="ag-caps">Inbox · 4</span><span class="ag-sub">Sort into task, note, contact or idea</span></div>'
      '<div class="ag-group">'
      + ''.join('<div class="ag-lrow flat" style="align-items:flex-start"><div class="body"><div class="t" style="font-weight:400">%s</div><div class="m">%s</div></div>'
                '<div class="ag-row-x" style="gap:4px">%s</div></div>'
                % (t, m, ''.join('<button class="ag-btn ag-btn-secondary" style="height:26px;font-size:12px">%s</button>' % b for b in bs))
                for t, m, bs in [('Ask Wanjiru for the Thika depot rate card', 'Captured 2 min ago', ['Task', 'Note']),
                                 ('Idea: bundle PPE with first-aid kits', 'Captured today, 08:14', ['Note', 'Idea']),
                                 ('New supplier: Mercy at Vision Safety, 0722…', 'Captured yesterday', ['Contact', 'Task'])]) + '</div></div></div>',
      '''
# Quick capture and Inbox

The plan's five-second rule: type or dictate, press Capture, done. Everything lands in an Inbox and is sorted later into a task, note, contact or idea.

Claude suggests the project, date and person it thinks the text refers to; they show as chips you can remove. Nothing is filed automatically.
''', width=940, sub='Five seconds in, sort later')

write('Today-03-Notebook', P2, 380,
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;max-width:940px">'
      + ''.join('<div class="ag-card ag-card-pad" style="display:flex;flex-direction:column;gap:8px;min-height:180px">'
                '<div class="ag-h3" style="font-size:15px">%s</div><p class="ag-sub" style="margin:0;flex:1">%s</p>'
                '<div class="ag-row-x" style="gap:4px">%s</div><span class="ag-sub" style="font-size:12px">%s</span></div>'
                % (t, b, ''.join('<span class="ag-tag">%s</span>' % g for g in tags), d)
                for t, b, tags, d in [('Depot move — first thoughts', 'Three options: keep Thika, split stock, or move everything to Ruiru. Cost per pallet is the deciding number…', ['depot', 'ridge moto'], 'Edited 2h ago'),
                                      ('PPE pricing ladder', 'Volume bands at 50 / 200 / 500 units. Safaricom sits in band 2 but asked for band 3 pricing…', ['pricing', 'ppe'], 'Edited yesterday'),
                                      ('Questions for the KEBS officer', '1. Which certificate covers imported masks? 2. How long is renewal? 3. Can it be done online?…', ['kebs', 'compliance'], 'Edited 3 days ago')]) + '</div>',
      '''
# Notebook

Scratch thinking that is not yet a task: rich text, tags and search. Notes can be linked to a project or contact, or left loose.

Cards show the title, the first lines, tags and when it was last edited. Apple Notes / Craft feel: quiet, fast, no folders required.
''', width=980, sub='Scratch ideas, tagged and searchable')

# ---------------- Phase 3 ----------------
write('Network-01-Contacts', P3, 470,
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;max-width:960px">'
      '<div><div class="ag-row-x" style="gap:6px;margin-bottom:10px"><span class="ag-pill is-gold">All 214</span><span class="ag-pill">Suppliers 68</span><span class="ag-pill">Clients 41</span><span class="ag-pill">Sales 22</span><span class="ag-pill">Referrals 19</span></div>'
      '<div class="ag-group">'
      + ''.join('<div class="ag-lrow %s"><span class="ag-av %s">%s</span><div class="body"><div class="t">%s</div><div class="m">%s</div></div>%s</div>'
                % (sel, g, i, n, m, p)
                for i, n, m, p, g, sel in [('MW', 'Mercy Wambui', 'Vision Safety · PPE supplier · Industrial Area', pill('is-amber', 'Touch due'), 'gold', 'is-sel'),
                                           ('JK', 'James Kiprono', 'Safaricom · Partner manager · Westlands', pill('is-green', 'Touched 3d'), '', ''),
                                           ('PN', 'Peter Njoroge', 'Ridge spares · Mechanic · Thika', '<span class="ag-sub">14d</span>', '', ''),
                                           ('GA', 'Grace Atieno', 'Kilima Labs · Reagents · Nairobi', '<span class="ag-sub">21d</span>', '', '')]) + '</div></div>'
      '<div class="ag-card ag-card-pad" style="display:flex;flex-direction:column;gap:12px">'
      '<div class="ag-row-x" style="gap:12px"><span class="ag-av lg gold">MW</span><div style="flex:1"><div class="ag-h3">Mercy Wambui</div><div class="ag-sub">Sales lead · Vision Safety Ltd</div></div></div>'
      '<div class="ag-row-x" style="gap:6px">' + ''.join('<button class="ag-btn ag-btn-secondary" style="height:30px">%s%s</button>' % (I(ic, 'ag-ico-sm'), l) for ic, l in [('phone', 'Call'), ('share', 'WhatsApp'), ('mail', 'Email'), ('meetings', 'Meet')]) + '</div>'
      '<div class="ag-banner is-amber">' + I('clock') + '<span>Next touch due today · every 30 days</span></div>'
      '<div><span class="ag-caps">Timeline</span><div style="margin-top:8px;display:flex;flex-direction:column;gap:10px">'
      + ''.join('<div style="display:flex;gap:10px"><span style="width:26px;height:26px;border-radius:50%%;background:var(--accent-soft);color:var(--accent-ink);display:flex;align-items:center;justify-content:center;flex:none">%s</span>'
                '<div><div style="font-size:14px;line-height:19px">%s</div><div class="ag-sub">%s</div></div></div>' % (I(ic, 'ag-ico-sm'), t, d)
                for ic, t, d in [('phone', 'Called about mask pricing — promised band 3 rates', '18 Sep · logged by Charis'),
                                 ('meetings', 'Site visit, Industrial Area warehouse', '2 Sep · with Wanjiru'),
                                 ('mail', 'Sent first enquiry', '14 Aug')]) + '</div></div>'
      '<div class="ag-banner is-gold">' + I('mentor') + '<span><b>Worth calling this week.</b> Her quote expires Friday and she moved on price twice before.</span></div></div></div>',
      '''
# Contacts and interaction timeline

Everyone you deal with: suppliers, workers, sales people, clients, partners, referrals — filtered by category and by nature of work.

The detail pane shows who they are, one-tap call / WhatsApp / email / meeting, the next-touch reminder (a date or a cadence like every 30 days), and the full interaction timeline. Logging a call takes two taps.

The AI suggestion always shows its reasoning, never a bare instruction.
''', width=1000, sub='Categories, timeline, next touch')

write('Network-02-Supplier', P3, 420,
      '<div style="display:grid;grid-template-columns:1.1fr 1fr;gap:24px;align-items:start;max-width:940px">'
      '<div class="ag-card" style="overflow:hidden"><div class="ag-card-pad" style="padding-bottom:8px"><span class="ag-caps">Supplier scorecard · Vision Safety</span></div>'
      '<table class="ag-table">'
      + ''.join('<tr><td class="ag-sub" style="width:44%%">%s</td><td><b>%s</b></td></tr>' % (k, v)
                for k, v in [('Price list', 'KSh 480 / mask · updated 12 Sep'), ('Minimum order', '200 units'), ('Lead time', '5–7 days'),
                             ('Credit terms', '30 days after delivery'), ('Certification', 'KEBS ✓ · ISO 9001 ✓')]) + '</table>'
      '<div class="ag-card-pad" style="display:flex;gap:24px;border-top:1px solid var(--separator)">'
      + ''.join('<div><div class="ag-sub">%s</div><div class="ag-row-x" style="gap:4px;margin-top:4px">%s</div></div>' % (l, ''.join('<span style="width:14px;height:6px;border-radius:3px;background:%s;display:block"></span>' % ('var(--accent)' if k < v else 'var(--fill-strong)') for k in range(5)))
                for l, v in [('Reliability', 4), ('Quality', 5), ('Price', 3)]) + '</div></div>'
      '<div class="ag-card ag-card-pad" style="display:flex;flex-direction:column;gap:12px">'
      '<span class="ag-caps">Referred by</span>'
      '<div style="display:flex;flex-direction:column;gap:8px;font-size:14px">'
      '<div class="ag-row-x">' + av('JK') + '<span>James Kiprono</span><span class="ag-sub">introduced</span></div>'
      '<div class="ag-row-x" style="margin-left:14px;border-left:2px solid var(--separator);padding-left:14px">' + av('MW', 'gold') + '<span><b>Mercy Wambui</b></span></div>'
      '<div class="ag-row-x" style="margin-left:42px;border-left:2px solid var(--separator);padding-left:14px">' + av('PN') + '<span>Peter Njoroge</span><span class="ag-sub">she introduced</span></div></div>'
      '<div class="ag-hr"></div>'
      '<span class="ag-caps">Privacy</span>'
      '<div class="ag-row-x" style="align-items:flex-start;gap:8px">' + I('shield') + '<span class="ag-sub">Consent noted 14 Aug: happy to be contacted about PPE supply. Export or delete her data any time (Kenya DPA 2019).</span></div>'
      '<div class="ag-row-x"><button class="ag-btn ag-btn-secondary" style="height:28px">Export</button><button class="ag-btn ag-btn-danger" style="height:28px">Delete contact</button></div></div></div>',
      '''
# Supplier scorecard, referrals and consent

Supplier fields from the plan: price list with its date, minimum order, lead time, credit terms, certifications, and reliability / quality / price scores.

The referral tree shows who introduced whom, so you can see where business actually comes from.

Every contact carries a consent note and a one-click export or delete, which is what the Kenya Data Protection Act asks for.
''', width=980, sub='Scores, referral tree, consent')

# ---------------- Phase 4 ----------------
write('Meeting-01-Meeting', P4, 450,
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;max-width:960px">'
      '<div class="ag-card ag-card-pad" style="display:flex;flex-direction:column;gap:12px">'
      '<div class="ag-row-x" style="justify-content:space-between"><span class="ag-pill is-green"><i></i>In 20 minutes</span><span class="ag-sub">Thu 24 Sep · 10:00–10:30</span></div>'
      '<div class="ag-h3">PPE Campaign — weekly review</div>'
      '<div class="ag-row-x"><div class="ag-stackav">' + av('CN', 'gold') + av('WK') + av('OO') + av('JK') + '</div><span class="ag-sub">4 attendees</span></div>'
      '<button class="ag-btn ag-btn-primary ag-btn-lg ag-btn-block">' + I('meetings') + ' Join Google Meet</button>'
      '<div><span class="ag-caps">Agenda · suggested from project status</span>'
      '<div class="ag-group" style="box-shadow:none;border:1px solid var(--separator);margin-top:8px">'
      + ''.join('<div class="ag-lrow flat" style="min-height:40px"><span class="ag-check %s">%s</span><div class="body t" style="font-weight:400">%s</div><span class="ag-sub">%s</span></div>'
                % (o, I('check', 'ag-ico-sm') if o else '', t, m)
                for t, m, o in [('KEBS certificate — still blocked', '5 min', 'on'), ('Safaricom quote — ready to send?', '10 min', ''),
                                ('3 overdue tasks with Otieno', '10 min', ''), ('Delivery date: hold or move', '5 min', '')]) + '</div></div></div>'
      '<div class="ag-card ag-card-pad" style="display:flex;flex-direction:column;gap:12px">'
      '<div class="ag-row-x" style="justify-content:space-between"><span class="ag-caps">After the meeting</span><span class="ag-pill is-gold">' + I('mentor', 'ag-ico-sm') + 'From your notes</span></div>'
      '<div><span class="ag-h3" style="font-size:15px">Action items</span>'
      + ''.join('<div class="ag-lrow flat" style="padding-left:0;padding-right:0;min-height:44px"><div class="body"><div class="t" style="font-weight:400">%s</div><div class="m">%s</div></div>'
                '<button class="ag-btn ag-btn-tinted" style="height:28px">%s</button></div>' % (t, m, b)
                for t, m, b in [('Chase KEBS certificate by Friday', 'Wanjiru · from "Wanjiru will call them tomorrow"', 'Make task'),
                                ('Send Safaricom quote at band 3', 'Otieno · due 25 Sep', 'Make task'),
                                ('Move delivery to 6 Nov', 'Changes the project close date', 'Approve change')]) + '</div>'
      '<div class="ag-banner is-amber">' + I('alert') + '<span>Two of these change dates already agreed. Approving updates the project targets and tells the people affected.</span></div>'
      '<button class="ag-btn ag-btn-primary ag-btn-block">Create 2 tasks · apply 1 change</button></div></div>',
      '''
# Meetings

Scheduling creates a Google Calendar event with a Meet link and invites attendees by email. The agenda is suggested from project status and open tasks; you edit it.

Afterwards, Claude reads your notes and proposes action items with an assignee, plus any target or deadline changes the discussion implies. One click turns them into tasks or applies the change — nothing is written without that click.
''', width=1000, sub='Agenda from status, notes to tasks')

# ---------------- Phase 5 ----------------
write('Comms-01-Alerts', P5, 470,
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;max-width:960px">'
      '<div style="display:flex;flex-direction:column;gap:12px">'
      '<div class="ag-card ag-card-pad" style="display:flex;flex-direction:column;gap:10px">'
      '<span class="ag-caps">New announcement</span>'
      '<div class="ag-input" style="height:76px;align-items:flex-start;padding-top:8px"><span class="grow" style="white-space:normal">Depot closed Friday for stock count. Deliveries resume Monday 8am.</span></div>'
      '<div class="ag-row-x" style="justify-content:space-between"><div class="ag-row-x" style="gap:6px"><span class="ag-tag">' + I('team', 'ag-ico-sm') + 'Everyone at Kilima Labs</span><span class="ag-tag">' + I('clock', 'ag-ico-sm') + 'Pin until Mon</span></div>'
      '<button class="ag-btn ag-btn-primary">Post</button></div></div>'
      '<div class="ag-banner is-gold">' + I('info') + '<span><b>Pinned:</b> Depot closed Friday for stock count. <span class="ag-sub">Posted by Charis · until Monday</span></span></div>'
      '<div class="ag-card ag-card-pad"><span class="ag-caps">Delivery</span>'
      '<div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">'
      + ''.join('<div class="ag-row-x" style="justify-content:space-between"><div class="ag-row-x">%s<div><div style="font-size:14px">%s</div><div class="ag-sub">%s</div></div></div><span class="ag-switch %s"><i></i></span></div>'
                % (I(ic), l, s, on) for ic, l, s, on in [('bell', 'In-app', 'Always on for assignments', 'on'),
                                                         ('mail', 'Email', 'Invites, assignments, check-ins due', 'on'),
                                                         ('share', 'WhatsApp', 'Click-to-chat link with the task', 'on'),
                                                         ('phone', 'Push on iPhone', 'Needs Add to Home Screen first', '')]) + '</div></div></div>'
      '<div style="display:flex;flex-direction:column;gap:12px">'
      '<div class="ag-card ag-card-pad" style="display:flex;flex-direction:column;gap:10px">'
      '<span class="ag-caps">Quiet hours</span>'
      '<div class="ag-row-x" style="justify-content:space-between"><span style="font-size:14px">Hold alerts 21:00 – 07:00</span><span class="ag-switch on"><i></i></span></div>'
      '<div class="ag-row-x" style="justify-content:space-between"><span style="font-size:14px">And on Sundays</span><span class="ag-switch on"><i></i></span></div>'
      '<span class="ag-sub">Anything urgent waits until 07:00. Nothing is lost.</span></div>'
      '<div class="ag-card ag-card-pad" style="display:flex;flex-direction:column;gap:10px">'
      '<span class="ag-caps">WhatsApp preview</span>'
      '<div style="background:var(--fill);border-radius:var(--radius-card);padding:12px;font-size:14px;line-height:20px">'
      '<b>The Agency</b><br>Hi Otieno — new task in PPE Campaign: <b>Send quote to Safaricom</b>, due Thu 25 Sep.<br><span style="color:var(--blue)">theagency.app/t/8fQ2</span></div>'
      '<button class="ag-btn ag-btn-secondary">' + I('share', 'ag-ico-sm') + ' Open in WhatsApp</button>'
      '<span class="ag-sub">v1 uses click-to-chat links. Templates through the Business API come later, after Meta verification.</span></div></div></div>',
      '''
# Announcements and alerts

No chat app inside The Agency. Communication is announcements, pinned messages and task comments; alerts leave through email and WhatsApp, where the team already is.

Per-person delivery switches and quiet hours, because people must feel safe being tracked. WhatsApp v1 is a click-to-chat link with the task pre-filled; the Business API comes later.
''', width=1000, sub='Announcements, pins, email and WhatsApp')

# ---------------- Phase 6 ----------------
write('Mentor-01-Paths', P6, 480,
      '<div style="max-width:720px;display:flex;flex-direction:column;gap:14px">'
      '<div class="ag-bubble me">Otieno keeps missing deadlines. Do I let him go?</div>'
      '<div class="ag-bubble"><b>Let me restate it:</b> a salesperson who is good with clients is late on internal deliverables, three times this month, and it is now costing you delivery dates.<br><br>Two questions first: has he ever been told a deadline is hard rather than nice-to-have? And is he late on everything, or only on paperwork?</div>'
      '<div class="ag-bubble" style="background:var(--accent-soft)"><b>A comparable case.</b> Field sales teams often miss admin deadlines because the reward system pays for closing, not for filing. Fixing the incentive usually beats replacing the person.</div>'
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">'
      + ''.join('<div class="ag-path"><span class="n">Path %d · %s</span><div style="font:600 14px/19px var(--font-sans)">%s</div>'
                '<p class="ag-sub" style="margin:0">%s</p><div class="ag-hr"></div><div class="ag-sub"><b>Costs you:</b> %s</div></div>'
                % (i + 1, k, t, b, c)
                for i, (k, t, b, c) in enumerate([('Cheapest', 'One clear conversation', 'Situation–behaviour–impact, agree one change, review in two weeks.', '30 minutes, and some discomfort'),
                                                  ('Structural', 'Move the paperwork', 'Give quote drafting to an AI tasker; he approves and sends.', 'A week of setup, small AI cost'),
                                                  ('Hardest', 'Change the role', 'Commission tied to delivered orders, not signed ones.', 'A difficult renegotiation')])) + '</div>'
      '<div class="ag-banner is-gold">' + I('mentor') + '<span>These are paths, not an answer. You decide, and the decision goes in your log so we can look back at how it turned out.</span></div></div>',
      '''
# Mentor · problem to paths

Describe a problem; the mentor restates it, asks what it still needs to know, offers an analogy or a comparable case, then gives two or three paths with their trade-offs and what each one costs you.

It never gives a single answer, never pretends to be a named person, and always ends with the decision belonging to you.
''', width=760, sub='Restate, ask, compare, then 2–3 paths')

write('Mentor-02-Recap', P6, 440,
      '<div style="display:grid;grid-template-columns:1.1fr 1fr;gap:24px;align-items:start;max-width:960px">'
      '<div class="ag-card ag-card-pad" style="display:flex;flex-direction:column;gap:12px">'
      '<div class="ag-row-x" style="justify-content:space-between"><span class="ag-caps">Weekly recap · 16–23 Sep</span><button class="ag-btn ag-btn-secondary" style="height:28px">Send to owners</button></div>'
      + ''.join('<div><div class="ag-h3" style="font-size:14px;color:%s">%s</div><ul style="margin:6px 0 0;padding-left:18px;font-size:14px;line-height:21px">%s</ul></div>'
                % (col, h, ''.join('<li>%s</li>' % x for x in items))
                for h, col, items in [('Achievements', 'var(--green)', ['8 of 14 PPE tasks closed', 'Supplier prices in from 3 of 5 vendors', 'Wanjiru joined and took procurement']),
                                      ('Negatives', 'var(--red)', ['KEBS certificate stuck 5 days', '3 tasks overdue with one person']),
                                      ('Support needed', 'var(--amber)', ['A second KEBS contact', 'Decision on the Thika depot by Friday']),
                                      ('Next week', 'var(--ink-2)', ['Send Safaricom quote', 'Close the depot decision', 'Start the lab restock scope'])]) + '</div>'
      '<div style="display:flex;flex-direction:column;gap:12px">'
      '<div class="ag-card ag-card-pad"><span class="ag-caps">Decision log</span>'
      + ''.join('<div class="ag-lrow flat" style="padding-left:0;padding-right:0;align-items:flex-start"><div class="body"><div class="t">%s</div><div class="m">%s</div></div>%s</div>' % (t, m, p)
                for t, m, p in [('Use Vision Safety as main PPE supplier', 'Because: KEBS certified, 5-day lead. Alternative: two smaller vendors.', pill('is-green', 'Worked', False)),
                                ('Hold the 30 Oct delivery date', 'Reviewed 23 Sep — at risk from KEBS', pill('is-amber', 'Review due', False)),
                                ('Run the depot move in Q1, not Q4', 'Because: cash is tight before Christmas', pill('', 'Too early', False))]) + '</div>'
      '<div class="ag-card ag-card-pad" style="background:var(--accent-soft)"><div class="ag-row-x" style="margin-bottom:6px">' + I('mentor') + '<b style="color:var(--accent-ink)">Pattern across 6 closed projects</b></div>'
      '<p style="margin:0;font-size:14px;line-height:20px">Tasks you assign without a deadline slip about three times as often as tasks with one. Two of your last three delays started that way.</p>'
      '<div class="ag-row-x" style="margin-top:10px"><button class="ag-btn ag-btn-secondary" style="height:28px">Make deadlines required</button></div></div></div></div>',
      '''
# Weekly recap, decision log, patterns

The recap drafts itself from the week's activity in the four headings you already report to owners: achievements, negatives, support needed, next week's objectives. You edit, then send.

The decision log records what you decided, why, what else you considered — and asks you later how it turned out. Patterns are drawn from closed projects and always name the evidence.
''', width=1000, sub='Drafted from your own week')

# ---------------- Phase 7 ----------------
write('System-01-States', P7, 460,
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;max-width:960px">'
      '<div style="display:flex;flex-direction:column;gap:12px">'
      '<div class="ag-banner is-amber">' + I('refresh') + '<span><b>Offline.</b> You can read and capture. 3 changes will sync when you are back.</span></div>'
      '<div class="ag-banner is-green" style="background:var(--green-soft)">' + I('check') + '<span>Synced just now · 3 changes uploaded</span></div>'
      '<div class="ag-card ag-card-pad"><span class="ag-caps">Data and backups</span>'
      + ''.join('<div class="ag-lrow flat" style="padding-left:0;padding-right:0"><div class="body"><div class="t">%s</div><div class="m">%s</div></div>%s</div>' % (t, m, e)
                for t, m, e in [('Daily backup', 'Last night, 02:00 · 14 kept', pill('is-green', 'Healthy', False)),
                                ('Export my data', 'Everything, as CSV and files', '<button class="ag-btn ag-btn-secondary" style="height:28px">Export</button>'),
                                ('Delete a contact\'s data', 'Kenya DPA 2019 request', '<button class="ag-btn ag-btn-secondary" style="height:28px">Open</button>')]) + '</div></div>'
      '<div style="display:flex;flex-direction:column;gap:12px">'
      '<div class="ag-card ag-card-pad"><span class="ag-caps">Audit log</span>'
      '<table class="ag-table" style="margin-top:8px">'
      + ''.join('<tr><td class="ag-sub" style="white-space:nowrap">%s</td><td>%s</td></tr>' % (d, t)
                for d, t in [('09:12', 'Charis changed Wanjiru\'s role to Admin'), ('08:40', 'Otieno opened PPE Campaign'),
                             ('Yesterday', 'Invite sent to kevin.m@example.com'), ('21 Sep', 'Brian exported the supplier list')]) + '</table></div>'
      '<div class="ag-card ag-card-pad" style="display:flex;flex-direction:column;gap:10px">'
      '<span class="ag-caps">Pricing test · M-Pesa</span>'
      '<div class="ag-row-x" style="justify-content:space-between"><div><div class="ag-h3">Team</div><div class="ag-sub">Up to 10 people, all modules</div></div>'
      '<div style="text-align:right"><div class="ag-h3">KSh 2,500</div><div class="ag-sub">per month</div></div></div>'
      '<button class="ag-btn ag-btn-primary ag-btn-block">Pay with M-Pesa</button>'
      '<span class="ag-sub">Only after 2–3 companies have used it free for 30 days and kept going.</span></div></div></div>',
      '''
# System states

Phase 7 surfaces: offline mode (read and capture, sync later), sync confirmation, daily backup health, data export and per-contact deletion for the Kenya DPA, an audit log of who did what, and the M-Pesa pricing test.

Offline uses the PWA service worker. The audit log is `activity_log`, the same table that powers project timelines.
''', width=1000, sub='Offline, sync, backups, audit, M-Pesa')

# ---------------- Foundations ----------------
write('State-01-Skeleton', FND, 380,
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;max-width:940px">'
      '<div><div class="ag-caps" style="margin-bottom:8px">Loading — Today</div><div class="ag-card ag-card-pad" style="display:flex;flex-direction:column;gap:14px">'
      '<div class="ag-sk line" style="width:120px"></div><div class="ag-sk line" style="width:190px;height:22px"></div>'
      + ''.join('<div class="ag-row-x" style="gap:12px"><div class="ag-sk circle" style="width:44px;height:44px"></div>'
                '<div style="flex:1;display:flex;flex-direction:column;gap:6px"><div class="ag-sk line" style="width:%d%%"></div><div class="ag-sk line sm" style="width:%d%%"></div></div></div>' % (w1, w2)
                for w1, w2 in [(62, 40), (48, 55), (70, 34)]) + '</div></div>'
      '<div><div class="ag-caps" style="margin-bottom:8px">Loading — Team list</div><div class="ag-group">'
      + ''.join('<div class="ag-lrow"><div class="ag-sk circle" style="width:32px;height:32px"></div>'
                '<div class="body" style="display:flex;flex-direction:column;gap:6px"><div class="ag-sk line" style="width:%d%%"></div><div class="ag-sk line sm" style="width:%d%%"></div></div>'
                '<div class="ag-sk" style="width:58px;height:22px;border-radius:999px"></div></div>' % (w1, w2)
                for w1, w2 in [(55, 35), (42, 50), (60, 30), (48, 38)]) + '</div>'
      '<p class="ag-sub" style="margin-top:12px">Skeletons keep the exact shape of the content they replace, so nothing jumps when data arrives. They fade out over 150ms. Under <code>prefers-reduced-motion</code> the shimmer stops.</p></div></div>',
      '''
# Skeletons

Every list and card that waits on the network shows a skeleton of the same shape, not a spinner — so the layout never shifts when data lands.

Shimmer loops at `duration-skeleton` (1100ms) and stops entirely under `prefers-reduced-motion`. Screen readers get `aria-busy="true"` on the region, and focus stays where it was.
''', width=980, sub='Same shape as the content')

write('State-02-ButtonStates', FND, 400,
      '<div style="max-width:720px;display:flex;flex-direction:column;gap:18px">'
      '<div><div class="ag-caps" style="margin-bottom:10px">Sending an invite</div><div class="ag-row-x" style="gap:12px">'
      '<button class="ag-btn ag-btn-primary">Send invite</button>'
      '<button class="ag-btn ag-btn-primary" style="opacity:.9"><span class="ag-spin"></span> Sending…</button>'
      '<button class="ag-btn is-success">' + I('check', 'ag-ico-sm') + ' Invite sent</button>'
      '<button class="ag-btn ag-btn-primary">Try again</button></div>'
      '<p class="ag-sub" style="margin-top:8px">The button keeps its width so nothing reflows. Success holds for 2 seconds, then the row updates and the button returns to rest.</p></div>'
      '<div class="ag-hr"></div>'
      '<div><div class="ag-caps" style="margin-bottom:10px">Results</div><div style="display:flex;flex-direction:column;gap:10px">'
      '<span class="ag-toast">' + I('check', 'ag-ico-sm') + 'Invite sent to kevin.m@example.com</span>'
      '<div class="ag-banner is-red">' + I('alert') + '<span><b>That invite didn\'t send.</b> The address bounced. Check the spelling and try again.</span></div>'
      '<div class="ag-banner is-amber">' + I('refresh') + '<span>Saved on this device. It will sync when you\'re back online.</span></div></div></div>'
      '<div class="ag-hr"></div>'
      '<div><div class="ag-caps" style="margin-bottom:10px">Signing in</div><div class="ag-row-x" style="gap:12px">'
      '<button class="ag-btn ag-btn-primary ag-btn-lg">Email me a sign-in link</button>'
      '<button class="ag-btn ag-btn-primary ag-btn-lg" style="opacity:.9"><span class="ag-spin"></span> Sending link…</button>'
      '<button class="ag-btn is-success ag-btn-lg">' + I('check', 'ag-ico-sm') + ' Link sent</button></div></div></div>',
      '''
# Button and submit states

Every action that touches the network has four states: rest, working, done, failed. The button keeps its size so the layout never jumps, and the label says what is happening in plain words ("Sending…", "Invite sent").

Failures say what went wrong and what to do next, never just "Error". Anything saved offline says so, and says when it will sync.
''', width=760, sub='Rest, working, done, failed')

write('Form-01-Controls', FND, 420,
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;max-width:900px;align-items:start">'
      '<div style="display:flex;flex-direction:column;gap:18px">'
      '<div><div class="ag-caps" style="margin-bottom:10px">Checkbox, radio, switch</div><div style="display:flex;flex-direction:column;gap:12px">'
      '<div class="ag-row-x" style="gap:10px"><span class="ag-check on">' + I('check', 'ag-ico-sm') + '</span><span style="font-size:14px">Require a deadline on every task</span></div>'
      '<div class="ag-row-x" style="gap:10px"><span class="ag-check"></span><span style="font-size:14px">Let members see each other\'s phone numbers</span></div>'
      '<div class="ag-row-x" style="gap:10px"><span class="ag-radio on"></span><span style="font-size:14px">Weekly check-in</span></div>'
      '<div class="ag-row-x" style="gap:10px"><span class="ag-radio"></span><span style="font-size:14px">Fortnightly</span></div>'
      '<div class="ag-row-x" style="gap:10px"><span class="ag-switch on"><i></i></span><span style="font-size:14px">WhatsApp alerts</span></div></div></div>'
      '<div><div class="ag-caps" style="margin-bottom:10px">Priority and progress</div>'
      '<div class="ag-row-x" style="gap:8px;margin-bottom:12px"><span class="ag-pill is-red">High</span><span class="ag-pill is-amber">Medium</span><span class="ag-pill">Low</span></div>'
      '<div class="ag-slider"><i style="width:45%"></i><b style="left:calc(45% - 9px)"></b></div></div></div>'
      '<div><div class="ag-caps" style="margin-bottom:10px">Due date</div>'
      '<div class="ag-card ag-card-pad" style="display:inline-block">'
      '<div class="ag-row-x" style="justify-content:space-between;margin-bottom:10px"><span class="ag-h3" style="font-size:15px">September 2026</span>'
      '<div class="ag-row-x" style="gap:4px">' + I('back', 'chev') + I('chevron', 'chev') + '</div></div>'
      '<div class="ag-cal">' + ''.join('<b>%s</b>' % d for d in ['M', 'T', 'W', 'T', 'F', 'S', 'S'])
      + ''.join('<span class="%s">%s</span>' % (c, d) for d, c in
                [(str(x), ('dim' if x < 21 else ('on' if x == 25 else ('soft' if x in (23, 24) else '')))) for x in range(14, 36)][:21]) + '</div>'
      '<div class="ag-row-x" style="gap:6px;margin-top:12px"><span class="ag-tag">Today</span><span class="ag-tag">Tomorrow</span><span class="ag-tag">Next Monday</span></div></div></div></div>',
      '''
# Form controls

Checkbox, radio, switch, priority pills, slider and the date picker. All 18–26px, all with a 44px tap area on iPhone, all showing a visible focus ring.

The date picker offers Today / Tomorrow / Next Monday shortcuts, because most due dates in this app are one of those three.
''', width=940, sub='Checkbox, radio, switch, slider, date')

write('Data-01-TabsTable', FND, 360,
      '<div style="max-width:900px;display:flex;flex-direction:column;gap:16px">'
      '<div class="ag-tabs"><span class="is-on">Members 5</span><span>Invites 2</span><span>Roles</span><span>Activity</span></div>'
      '<div class="ag-card" style="overflow:hidden"><table class="ag-table">'
      '<tr><th>Task</th><th>Project</th><th>Assignee</th><th>Due</th><th>Status</th></tr>'
      + ''.join('<tr><td>%s</td><td class="ag-sub">%s</td><td><div class="ag-row-x">%s<span>%s</span></div></td><td class="ag-num %s">%s</td><td>%s</td></tr>'
                % (t, p, av(ai), a, dc, d, s)
                for t, p, ai, a, d, dc, s in [('Confirm KEBS certificate', 'PPE Campaign', 'WK', 'Wanjiru', 'Today', '', pill('is-amber', 'In progress')),
                                              ('Send quote to Safaricom', 'PPE Campaign', 'OO', 'Otieno', '25 Sep', '', pill('', 'To do')),
                                              ('Collect supplier prices', 'Lab restock', 'AN', 'Achieng', '20 Sep', '', pill('is-green', 'Done')),
                                              ('Book depot truck', 'Depot move', 'OO', 'Otieno', '18 Sep', 'ag-num" style="color:var(--red)', pill('is-red', 'Overdue'))]) + '</table></div>'
      '<p class="ag-sub" style="margin:0">Tables are for dense views only — analytics, exports, admin. Everywhere else, use list rows: they read better on a phone.</p></div>',
      '''
# Tabs and table

Tabs switch views inside a pane; the active one carries a 2px `accent` underline. Tables are reserved for dense desktop views (analytics, audit, exports) — on iPhone the same data becomes list rows.

Numbers use tabular figures so columns line up. Overdue dates turn red, and always carry the word too.
''', width=940, sub='Dense views, desktop only')
print('ok')
