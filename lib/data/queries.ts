import "server-only"

import {
  emailKey,
  findPairs,
  ORG_FIELDS,
  orgNameKey,
  pairKey,
  PERSON_FIELDS,
  personNameKey,
  phoneKey,
  type MatchReason,
} from "./match"
import { readDb } from "./store"
import {
  OPEN_STAGES,
  ORG_CATEGORY_LABEL,
  STAGES,
  type Activity,
  type Contact,
  type Deal,
  type Invite,
  type Organisation,
  type Profile,
  type Role,
  type SavedView,
  type StageId,
  type Task,
  CADENCE_DAYS,
  type Project,
} from "./types"

export type Member = Profile & { role: Role; title?: string; joined: string }

export async function listMembers(workspaceId: string): Promise<Member[]> {
  const db = await readDb()
  const order: Record<Role, number> = { owner: 0, admin: 1, member: 2, viewer: 3 }
  return db.memberships
    .filter((m) => m.workspace_id === workspaceId)
    .map((m) => {
      const p = db.profiles.find((x) => x.id === m.user_id)!
      return { ...p, role: m.role, title: m.title, joined: m.created_at }
    })
    .sort((a, b) => order[a.role] - order[b.role] || a.full_name.localeCompare(b.full_name))
}

export async function listInvites(workspaceId: string): Promise<Invite[]> {
  const db = await readDb()
  return db.invites
    .filter((i) => i.workspace_id === workspaceId && !i.accepted_at)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function getInviteByToken(token: string) {
  const db = await readDb()
  const invite = db.invites.find((i) => i.token === token)
  if (!invite) return null
  const workspace = db.workspaces.find((w) => w.id === invite.workspace_id) ?? null
  const inviter = db.profiles.find((p) => p.id === invite.invited_by) ?? null
  return { invite, workspace, inviter }
}

/* ------------------------------------------------------------ organisations */

export type OrganisationRow = Organisation & {
  owner: Profile | undefined
  people: number
  openDeals: number
  openValue: number
  wonValue: number
  lastActivity?: Activity
  daysSinceContact: number | null
}

const daysSince = (iso?: string) =>
  iso === undefined ? null : Math.floor((Date.now() - new Date(iso).getTime()) / 864e5)

export type OrgFilters = {
  q?: string
  category?: string
  owner?: string
  tag?: string
  /** Days without contact, e.g. 30. */
  stale?: number
  /** "open" = has open deals, "none" = has none. */
  hasDeals?: string
  sort?: string
}

export async function listOrganisations(
  workspaceId: string,
  opts: OrgFilters = {}
): Promise<OrganisationRow[]> {
  const db = await readDb()
  const q = opts.q?.trim().toLowerCase()

  return db.organisations
    .filter((o) => o.workspace_id === workspaceId)
    .map((o) => {
      const deals = db.deals.filter((d) => d.organisation_id === o.id)
      const open = deals.filter((d) => OPEN_STAGES.includes(d.stage))
      const lastActivity = db.activities
        .filter((a) => a.organisation_id === o.id && a.type !== "system")
        .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))[0]
      return {
        ...o,
        owner: db.profiles.find((p) => p.id === o.owner_id),
        people: db.contacts.filter((c) => c.organisation_id === o.id).length,
        openDeals: open.length,
        openValue: open.reduce((sum, d) => sum + d.value, 0),
        wonValue: deals.filter((d) => d.stage === "won").reduce((s, d) => s + d.value, 0),
        lastActivity,
        daysSinceContact: daysSince(lastActivity?.occurred_at),
      }
    })
    .filter((o) => {
      if (q && !`${o.name} ${o.what_they_do ?? ""} ${o.location ?? ""} ${o.tags.join(" ")}`.toLowerCase().includes(q))
        return false
      if (opts.category && o.category !== opts.category) return false
      if (opts.owner && o.owner_id !== opts.owner) return false
      if (opts.tag && !o.tags.some((t) => t.toLowerCase() === opts.tag!.toLowerCase()))
        return false
      if (opts.stale && (o.daysSinceContact ?? 9999) < opts.stale) return false
      if (opts.hasDeals === "open" && o.openDeals === 0) return false
      if (opts.hasDeals === "none" && o.openDeals > 0) return false
      return true
    })
    .sort((a, b) => {
      switch (opts.sort) {
        case "name":
          return a.name.localeCompare(b.name)
        case "recent":
          return (a.daysSinceContact ?? 9999) - (b.daysSinceContact ?? 9999)
        case "quiet":
          return (b.daysSinceContact ?? -1) - (a.daysSinceContact ?? -1)
        default:
          return b.openValue - a.openValue || a.name.localeCompare(b.name)
      }
    })
}

export async function getOrganisation(workspaceId: string, id: string) {
  const db = await readDb()
  const organisation = db.organisations.find((o) => o.id === id && o.workspace_id === workspaceId)
  if (!organisation) return null

  const contacts = db.contacts
    .filter((c) => c.organisation_id === id)
    .sort((a, b) => a.full_name.localeCompare(b.full_name))
  const deals = db.deals
    .filter((d) => d.organisation_id === id)
    .sort((a, b) => b.value - a.value)
  const activities = db.activities
    .filter((a) => a.organisation_id === id)
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
    .slice(0, 40)

  return {
    organisation,
    owner: db.profiles.find((p) => p.id === organisation.owner_id),
    contacts,
    deals,
    activities,
    people: db.profiles,
    openValue: deals.filter((d) => OPEN_STAGES.includes(d.stage)).reduce((s, d) => s + d.value, 0),
    wonValue: deals.filter((d) => d.stage === "won").reduce((s, d) => s + d.value, 0),
  }
}

/* ------------------------------------------------------------------ deals */

export type DealCard = Deal & {
  organisation?: Organisation
  contact?: Contact
  owner?: Profile
  daysInStage: number
}

export async function listDeals(
  workspaceId: string,
  opts: { owner?: string; organisation?: string } = {}
): Promise<DealCard[]> {
  const db = await readDb()
  return db.deals
    .filter((d) => d.workspace_id === workspaceId)
    .filter((d) => (opts.owner ? d.owner_id === opts.owner : true))
    .filter((d) => (opts.organisation ? d.organisation_id === opts.organisation : true))
    .map((d) => ({
      ...d,
      organisation: db.organisations.find((o) => o.id === d.organisation_id),
      contact: db.contacts.find((c) => c.id === d.contact_id),
      owner: db.profiles.find((p) => p.id === d.owner_id),
      daysInStage: daysSince(d.stage_changed_at) ?? 0,
    }))
    .sort((a, b) => b.value - a.value)
}

export type Pipeline = {
  columns: { stage: (typeof STAGES)[number]; deals: DealCard[]; total: number }[]
  openValue: number
  forecast: number
  wonThisMonth: number
  closingSoon: DealCard[]
}

export async function getPipeline(
  workspaceId: string,
  opts: { owner?: string } = {}
): Promise<Pipeline> {
  const deals = await listDeals(workspaceId, opts)
  const columns = STAGES.map((stage) => {
    const inStage = deals.filter((d) => d.stage === stage.id)
    return { stage, deals: inStage, total: inStage.reduce((s, d) => s + d.value, 0) }
  })

  const open = deals.filter((d) => OPEN_STAGES.includes(d.stage))
  const month = new Date().toISOString().slice(0, 7)

  return {
    columns,
    openValue: open.reduce((s, d) => s + d.value, 0),
    forecast: open.reduce(
      (s, d) => s + d.value * (STAGES.find((x) => x.id === d.stage)?.probability ?? 0),
      0
    ),
    wonThisMonth: deals
      .filter((d) => d.stage === "won" && (d.closed_at ?? "").startsWith(month))
      .reduce((s, d) => s + d.value, 0),
    closingSoon: open
      .filter((d) => d.expected_close && daysSince(d.expected_close)! > -14)
      .sort((a, b) => (a.expected_close ?? "").localeCompare(b.expected_close ?? ""))
      .slice(0, 5),
  }
}

export async function getDeal(workspaceId: string, id: string) {
  const db = await readDb()
  const deal = db.deals.find((d) => d.id === id && d.workspace_id === workspaceId)
  if (!deal) return null
  const organisation = db.organisations.find((o) => o.id === deal.organisation_id)
  return {
    deal,
    organisation,
    contact: db.contacts.find((c) => c.id === deal.contact_id),
    owner: db.profiles.find((p) => p.id === deal.owner_id),
    daysInStage: daysSince(deal.stage_changed_at) ?? 0,
    /** Who else works there, for choosing the person on the deal. */
    orgContacts: db.contacts
      .filter((c) => c.workspace_id === workspaceId && c.organisation_id === deal.organisation_id)
      .sort((a, b) => a.full_name.localeCompare(b.full_name)),
    /** Everything else on the table with the same organisation. */
    otherDeals: db.deals
      .filter((d) => d.organisation_id && d.organisation_id === deal.organisation_id && d.id !== id)
      .sort((a, b) => b.value - a.value),
    activities: db.activities
      .filter((a) => a.deal_id === id)
      .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)),
    people: db.profiles,
  }
}

/* --------------------------------------------------------------- contacts */

export type ContactRow = Contact & {
  organisation?: Organisation
  owner?: Profile
  touchDueInDays: number | null
}

export async function listContacts(workspaceId: string): Promise<ContactRow[]> {
  const db = await readDb()
  return db.contacts
    .filter((c) => c.workspace_id === workspaceId)
    .map((c) => ({
      ...c,
      organisation: db.organisations.find((o) => o.id === c.organisation_id),
      owner: db.profiles.find((p) => p.id === c.owner_id),
      touchDueInDays: c.next_touch_at
        ? Math.ceil((new Date(c.next_touch_at).getTime() - Date.now()) / 864e5)
        : null,
    }))
    .sort((a, b) => (a.touchDueInDays ?? 999) - (b.touchDueInDays ?? 999))
}

/* ------------------------------------------------------------------ today */

export type SetupState = {
  hasWorkspace: boolean
  signedIn: boolean
  invitedSomeone: boolean
  addedOrganisation: boolean
  done: number
  total: number
}

export async function getSetupState(workspaceId: string, userId: string): Promise<SetupState> {
  const db = await readDb()
  const steps = {
    hasWorkspace: true,
    signedIn: Boolean(userId),
    invitedSomeone:
      db.invites.some((i) => i.workspace_id === workspaceId) ||
      db.memberships.filter((m) => m.workspace_id === workspaceId).length > 1,
    addedOrganisation: db.organisations.some((o) => o.workspace_id === workspaceId),
  }
  return { ...steps, done: Object.values(steps).filter(Boolean).length, total: 4 }
}

export async function pendingInviteCount(workspaceId: string) {
  const db = await readDb()
  return db.invites.filter((i) => i.workspace_id === workspaceId && !i.accepted_at).length
}

/** The numbers Today leads with. */
export async function getTodayNumbers(workspaceId: string) {
  const [pipeline, contacts] = await Promise.all([
    getPipeline(workspaceId),
    listContacts(workspaceId),
  ])
  const organisations = await listOrganisations(workspaceId)

  return {
    pipeline,
    touchesDue: contacts.filter((c) => (c.touchDueInDays ?? 99) <= 0),
    stale: organisations.filter((o) => (o.daysSinceContact ?? 0) >= 30),
    organisations: organisations.length,
  }
}

export async function stageTotals(workspaceId: string): Promise<Record<StageId, number>> {
  const { columns } = await getPipeline(workspaceId)
  return Object.fromEntries(columns.map((c) => [c.stage.id, c.total])) as Record<StageId, number>
}


/* ------------------------------------------------------------ saved views */

export async function listViews(
  workspaceId: string,
  userId: string,
  object: SavedView["object"]
): Promise<SavedView[]> {
  const db = await readDb()
  return db.views
    .filter(
      (v) =>
        v.workspace_id === workspaceId &&
        v.object === object &&
        (v.shared || v.user_id === userId)
    )
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** Every tag in use, so the filter builder can offer real ones. */
export async function listTags(workspaceId: string): Promise<string[]> {
  const db = await readDb()
  const all = db.organisations
    .filter((o) => o.workspace_id === workspaceId)
    .flatMap((o) => o.tags)
  return [...new Set(all)].sort()
}


/* ------------------------------------------------------------- duplicates */

export type DuplicateSide = {
  id: string
  name: string
  /** One line under the name: where they work, or what the organisation does. */
  subtitle: string
  href?: string
  deals: number
  activities: number
  /** Organisations only. */
  people?: number
  created_at: string
}

export type DuplicateField = {
  key: string
  label: string
  a: string
  b: string
  /** Both sides filled in and different, so the person must pick one. */
  clash: boolean
}

export type DuplicatePair = {
  a: DuplicateSide
  b: DuplicateSide
  reasons: MatchReason[]
  fields: DuplicateField[]
  /** Tags from both, which a merge keeps together. */
  tags: string[]
}

const shortDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })
    : ""

function ignored(db: Awaited<ReturnType<typeof readDb>>, workspaceId: string, object: "people" | "organisations") {
  return new Set(
    db.not_duplicates
      .filter((n) => n.workspace_id === workspaceId && n.object === object)
      .map((n) => pairKey(n.a_id, n.b_id))
  )
}

function fieldRows(
  fields: readonly (readonly [string, string])[],
  show: (key: string, side: "a" | "b") => string
): DuplicateField[] {
  return fields.map(([key, label]) => {
    const a = show(key, "a")
    const b = show(key, "b")
    const same = key === "phone" ? phoneKey(a) === phoneKey(b) : a.toLowerCase() === b.toLowerCase()
    return { key, label, a, b, clash: Boolean(a && b && !same) }
  })
}

const mergedTags = (a: string[], b: string[]) =>
  [...a, ...b.filter((t) => !a.some((x) => x.toLowerCase() === t.toLowerCase()))]

export async function listDuplicatePeople(workspaceId: string): Promise<DuplicatePair[]> {
  const db = await readDb()
  const people = db.contacts.filter((c) => c.workspace_id === workspaceId)
  const orgOf = (id?: string) => db.organisations.find((o) => o.id === id)

  const pairs = findPairs(
    people.map((c) => {
      const org = orgOf(c.organisation_id)
      // The office line or info@ address is shared by everyone there; it proves nothing.
      const phone = phoneKey(c.phone)
      const email = emailKey(c.email)
      return {
        id: c.id,
        keys: {
          phone: phone && phone !== phoneKey(org?.phone) ? phone : null,
          email: email && email !== emailKey(org?.email) ? email : null,
          name: personNameKey(c.full_name),
        },
      }
    }),
    ignored(db, workspaceId, "people")
  )

  return pairs.map(({ a, b, reasons }) => {
    const sides = { a: people.find((c) => c.id === a)!, b: people.find((c) => c.id === b)! }
    const side = (c: (typeof people)[number]): DuplicateSide => ({
      id: c.id,
      name: c.full_name,
      subtitle: [c.title, orgOf(c.organisation_id)?.name].filter(Boolean).join(" · ") || "No organisation",
      href: c.organisation_id ? `/organisations/${c.organisation_id}` : undefined,
      deals: db.deals.filter((d) => d.contact_id === c.id).length,
      activities: db.activities.filter((x) => x.contact_id === c.id && x.type !== "system").length,
      created_at: c.created_at,
    })
    return {
      a: side(sides.a),
      b: side(sides.b),
      reasons,
      tags: mergedTags(sides.a.tags, sides.b.tags),
      fields: fieldRows(PERSON_FIELDS, (key, s) => {
        const c = sides[s]
        if (key === "organisation_id") return orgOf(c.organisation_id)?.name ?? ""
        if (key === "owner_id") return db.profiles.find((p) => p.id === c.owner_id)?.full_name ?? ""
        if (key === "next_touch_at") return shortDate(c.next_touch_at)
        return String(c[key as keyof typeof c] ?? "")
      }),
    }
  })
}

export async function listDuplicateOrganisations(workspaceId: string): Promise<DuplicatePair[]> {
  const db = await readDb()
  const orgs = db.organisations.filter((o) => o.workspace_id === workspaceId)

  const pairs = findPairs(
    orgs.map((o) => ({
      id: o.id,
      keys: { phone: phoneKey(o.phone), email: emailKey(o.email), name: orgNameKey(o.name) },
    })),
    ignored(db, workspaceId, "organisations")
  )

  return pairs.map(({ a, b, reasons }) => {
    const sides = { a: orgs.find((o) => o.id === a)!, b: orgs.find((o) => o.id === b)! }
    const side = (o: (typeof orgs)[number]): DuplicateSide => ({
      id: o.id,
      name: o.name,
      subtitle: [ORG_CATEGORY_LABEL[o.category], o.location].filter(Boolean).join(" · "),
      href: `/organisations/${o.id}`,
      deals: db.deals.filter((d) => d.organisation_id === o.id).length,
      activities: db.activities.filter((x) => x.organisation_id === o.id && x.type !== "system").length,
      people: db.contacts.filter((c) => c.organisation_id === o.id).length,
      created_at: o.created_at,
    })
    return {
      a: side(sides.a),
      b: side(sides.b),
      reasons,
      tags: mergedTags(sides.a.tags, sides.b.tags),
      fields: fieldRows(ORG_FIELDS, (key, s) => {
        const o = sides[s]
        if (key === "category") return ORG_CATEGORY_LABEL[o.category]
        if (key === "owner_id") return db.profiles.find((p) => p.id === o.owner_id)?.full_name ?? ""
        return String(o[key as keyof typeof o] ?? "")
      }),
    }
  })
}

/* ------------------------------------------------------------ member page */

/**
 * Everything one person in the workspace looks after: their organisations, the
 * people they are keeping in touch with, their deals and what they logged.
 * Who may see it is decided by the page (`can.viewMember`), not here.
 */
export async function getMemberOverview(workspaceId: string, memberId: string) {
  const db = await readDb()
  const membership = db.memberships.find(
    (m) => m.workspace_id === workspaceId && m.user_id === memberId
  )
  const profile = db.profiles.find((p) => p.id === memberId)
  if (!membership || !profile) return null

  const month = new Date().toISOString().slice(0, 7)
  const organisations = (await listOrganisations(workspaceId, { owner: memberId, sort: "quiet" }))
  const contacts = (await listContacts(workspaceId)).filter((c) => c.owner_id === memberId)
  const deals = (await listDeals(workspaceId, { owner: memberId }))
  const open = deals.filter((d) => OPEN_STAGES.includes(d.stage))
  const since = Date.now() - 30 * 864e5

  return {
    member: { ...profile, role: membership.role, title: membership.title, joined: membership.created_at },
    organisations,
    contacts,
    openDeals: open,
    closedDeals: deals
      .filter((d) => !OPEN_STAGES.includes(d.stage))
      .sort((a, b) => (b.closed_at ?? "").localeCompare(a.closed_at ?? ""))
      .slice(0, 5),
    openValue: open.reduce((s, d) => s + d.value, 0),
    wonThisMonth: deals
      .filter((d) => d.stage === "won" && (d.closed_at ?? "").startsWith(month))
      .reduce((s, d) => s + d.value, 0),
    touchesDue: contacts.filter((c) => (c.touchDueInDays ?? 99) <= 0).length,
    activities: db.activities
      .filter((a) => a.workspace_id === workspaceId && a.actor_id === memberId)
      .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
      .slice(0, 20),
    loggedLast30Days: db.activities.filter(
      (a) =>
        a.workspace_id === workspaceId &&
        a.actor_id === memberId &&
        a.type !== "system" &&
        new Date(a.occurred_at).getTime() >= since
    ).length,
    people: db.profiles,
  }
}

/* ------------------------------------------------------------------ tasks */

export type TaskRow = Task & {
  assignee?: Profile
  project?: { id: string; name: string }
  /** The record it hangs off, for the small line under the title. */
  link?: { label: string; href: string }
  /** Negative when late, null when there is no due date. */
  dueInDays: number | null
}

export type TaskFilter = {
  assignee?: string
  project?: string
  deal?: string
  organisation?: string
  /** Done tasks are hidden unless asked for; the most recent few come back. */
  withDone?: boolean
}

export async function listTasks(workspaceId: string, f: TaskFilter = {}): Promise<TaskRow[]> {
  const db = await readDb()
  const rows = db.tasks
    .filter((t) => t.workspace_id === workspaceId)
    .filter((t) => (f.assignee ? t.assignee_id === f.assignee : true))
    .filter((t) => (f.project ? t.project_id === f.project : true))
    .filter((t) => (f.deal ? t.deal_id === f.deal : true))
    .filter((t) => (f.organisation ? t.organisation_id === f.organisation : true))
    .map((t): TaskRow => {
      const project = db.projects.find((p) => p.id === t.project_id)
      const deal = db.deals.find((d) => d.id === t.deal_id)
      const org = db.organisations.find((o) => o.id === t.organisation_id)
      const contact = db.contacts.find((c) => c.id === t.contact_id)
      // Name the most specific record, and skip the one the page is already about.
      // Inside a project, its own organisation goes without saying.
      const orgImplied = f.organisation || (project && project.organisation_id === t.organisation_id && f.project)
      const link =
        deal && !f.deal
          ? { label: deal.title, href: `/deals/${deal.id}` }
          : org && !orgImplied
            ? { label: org.name, href: `/organisations/${org.id}` }
            : contact && org
              ? { label: contact.full_name, href: `/organisations/${org.id}` }
              : undefined
      return {
        ...t,
        assignee: db.profiles.find((p) => p.id === t.assignee_id),
        project: project && !f.project ? { id: project.id, name: project.name } : undefined,
        link,
        dueInDays: t.due_at ? Math.ceil((new Date(t.due_at).getTime() - Date.now()) / 864e5) : null,
      }
    })

  const open = rows
    .filter((t) => t.status !== "done")
    .sort(
      (a, b) =>
        (a.dueInDays ?? 9999) - (b.dueInDays ?? 9999) ||
        ["high", "medium", "low"].indexOf(a.priority) - ["high", "medium", "low"].indexOf(b.priority)
    )
  if (!f.withDone) return open
  const done = rows
    .filter((t) => t.status === "done")
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""))
    .slice(0, 5)
  return [...open, ...done]
}

/** People a task can be for: everyone in the workspace who can edit. */
export async function listAssignees(workspaceId: string) {
  return (await listMembers(workspaceId))
    .filter((m) => m.role !== "viewer")
    .map((m) => ({ value: m.id, label: m.full_name }))
}

/* --------------------------------------------------------------- projects */

export type ProjectRow = Project & {
  organisation?: { id: string; name: string }
  deal?: { id: string; title: string }
  lead?: Profile
  members: Profile[]
  tasks: { total: number; done: number; overdue: number }
  /** Share of tasks done, 0–100. */
  progress: number
  /** Days until the next check-in is due; 0 is today, negative is late. */
  checkInInDays: number
  dueInDays: number | null
}

function toProjectRow(db: Awaited<ReturnType<typeof readDb>>, p: Project): ProjectRow {
  const tasks = db.tasks.filter((t) => t.project_id === p.id)
  const done = tasks.filter((t) => t.status === "done").length
  // Late means the due day has passed, the same rule the task rows use.
  const overdue = tasks.filter(
    (t) => t.status !== "done" && t.due_at && Math.ceil((new Date(t.due_at).getTime() - Date.now()) / 864e5) < 0
  ).length
  // Check-ins fall due every cadence period from the day the project started.
  const every = CADENCE_DAYS[p.cadence]
  const age = Math.floor((Date.now() - new Date(p.created_at).getTime()) / 864e5)
  const org = db.organisations.find((o) => o.id === p.organisation_id)
  const deal = db.deals.find((d) => d.id === p.deal_id)
  return {
    ...p,
    organisation: org ? { id: org.id, name: org.name } : undefined,
    deal: deal ? { id: deal.id, title: deal.title } : undefined,
    lead: db.profiles.find((x) => x.id === p.lead_id),
    members: p.member_ids
      .map((id) => db.profiles.find((x) => x.id === id))
      .filter((x): x is Profile => Boolean(x)),
    tasks: { total: tasks.length, done, overdue },
    progress: tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100),
    // The first check-in falls one period after the start, then every period after that.
    checkInInDays: age > 0 && age % every === 0 ? 0 : every - (age % every),
    dueInDays: p.due_at ? Math.ceil((new Date(p.due_at).getTime() - Date.now()) / 864e5) : null,
  }
}

export async function listProjects(workspaceId: string): Promise<ProjectRow[]> {
  const db = await readDb()
  const order = { blocked: 0, at_risk: 1, on_track: 2 }
  return db.projects
    .filter((p) => p.workspace_id === workspaceId)
    .map((p) => toProjectRow(db, p))
    .sort(
      (a, b) =>
        (a.status === "active" ? 0 : 1) - (b.status === "active" ? 0 : 1) ||
        order[a.health] - order[b.health] ||
        (a.dueInDays ?? 9999) - (b.dueInDays ?? 9999)
    )
}

export async function getProject(workspaceId: string, id: string) {
  const db = await readDb()
  const project = db.projects.find((p) => p.id === id && p.workspace_id === workspaceId)
  if (!project) return null
  return {
    project: toProjectRow(db, project),
    // Activity has no project of its own yet: the project's deal, or a mention by name.
    activities: db.activities
      .filter(
        (a) =>
          a.workspace_id === workspaceId &&
          ((project.deal_id && a.deal_id === project.deal_id) || a.summary.includes(project.name))
      )
      .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
      .slice(0, 20),
    people: db.profiles,
  }
}
