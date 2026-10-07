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
  periodEnd,
  periodStart,
  type Objective,
  type ObjectivePeriod,
  type CheckIn,
  TASK_STATUS,
  can,
  type Flag,
  type CustomField,
  type FieldObject,
  money,
  type Notification,
  type NotificationType,
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
  /** Days until the expected close; negative when late, null with no date. */
  closesInDays: number | null
}

export type DealFilters = {
  owner?: string
  organisation?: string
  q?: string
  /** "late" = past its close date and still open, "week" / "month" = closes within. */
  closing?: string
  /** Smallest value in shillings, e.g. "100000". */
  min?: string
}

export async function listDeals(workspaceId: string, opts: DealFilters = {}): Promise<DealCard[]> {
  const db = await readDb()
  const q = opts.q?.trim().toLowerCase()
  const min = Number(opts.min)
  const closesIn = (d: Deal) =>
    d.expected_close ? Math.ceil((new Date(d.expected_close).getTime() - Date.now()) / 864e5) : null
  return db.deals
    .filter((d) => d.workspace_id === workspaceId)
    .filter((d) => (opts.owner ? d.owner_id === opts.owner : true))
    .filter((d) => (opts.organisation ? d.organisation_id === opts.organisation : true))
    .filter((d) => (Number.isFinite(min) && min > 0 ? d.value >= min : true))
    .filter((d) => {
      if (!opts.closing) return true
      const days = closesIn(d)
      if (days === null || !OPEN_STAGES.includes(d.stage)) return false
      if (opts.closing === "late") return days < 0
      if (opts.closing === "week") return days >= 0 && days <= 7
      if (opts.closing === "month") return days >= 0 && days <= 31
      return true
    })
    .filter((d) => {
      if (!q) return true
      const org = db.organisations.find((o) => o.id === d.organisation_id)
      const person = db.contacts.find((c) => c.id === d.contact_id)
      return `${d.title} ${org?.name ?? ""} ${person?.full_name ?? ""}`.toLowerCase().includes(q)
    })
    .map((d) => ({
      ...d,
      organisation: db.organisations.find((o) => o.id === d.organisation_id),
      contact: db.contacts.find((c) => c.id === d.contact_id),
      owner: db.profiles.find((p) => p.id === d.owner_id),
      daysInStage: daysSince(d.stage_changed_at) ?? 0,
      closesInDays: closesIn(d),
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

export async function getPipeline(workspaceId: string, opts: DealFilters = {}): Promise<Pipeline> {
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

export type ContactFilters = {
  q?: string
  owner?: string
  organisation?: string
  tag?: string
  /** "due" = today or overdue, "week" = within 7 days, "none" = no date set. */
  touch?: string
}

export async function listContacts(
  workspaceId: string,
  f: ContactFilters = {}
): Promise<ContactRow[]> {
  const db = await readDb()
  const q = f.q?.trim().toLowerCase()
  return db.contacts
    .filter((c) => c.workspace_id === workspaceId)
    .filter((c) => (f.owner ? c.owner_id === f.owner : true))
    .filter((c) => (f.organisation ? c.organisation_id === f.organisation : true))
    .filter((c) => (f.tag ? c.tags.some((t) => t.toLowerCase() === f.tag!.toLowerCase()) : true))
    .filter((c) => {
      if (!q) return true
      const org = db.organisations.find((o) => o.id === c.organisation_id)
      return `${c.full_name} ${c.title ?? ""} ${c.email ?? ""} ${c.phone ?? ""} ${org?.name ?? ""} ${c.tags.join(" ")}`
        .toLowerCase()
        .includes(q)
    })
    .map((c) => ({
      ...c,
      organisation: db.organisations.find((o) => o.id === c.organisation_id),
      owner: db.profiles.find((p) => p.id === c.owner_id),
      touchDueInDays: c.next_touch_at
        ? Math.ceil((new Date(c.next_touch_at).getTime() - Date.now()) / 864e5)
        : null,
    }))
    .filter((c) => {
      if (f.touch === "due") return c.touchDueInDays !== null && c.touchDueInDays <= 0
      if (f.touch === "week") return c.touchDueInDays !== null && c.touchDueInDays <= 7
      if (f.touch === "none") return c.touchDueInDays === null
      return true
    })
    .sort((a, b) => (a.touchDueInDays ?? 999) - (b.touchDueInDays ?? 999))
}

/** Every tag in use on people, for the filter. */
export async function listPeopleTags(workspaceId: string): Promise<string[]> {
  const db = await readDb()
  return [...new Set(db.contacts.filter((c) => c.workspace_id === workspaceId).flatMap((c) => c.tags))].sort()
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
      href: `/people/${c.id}`,
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
  contact?: string
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
    .filter((t) => (f.contact ? t.contact_id === f.contact : true))
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
  lastCheckIn?: CheckIn
  dueInDays: number | null
}

function toProjectRow(db: Awaited<ReturnType<typeof readDb>>, p: Project): ProjectRow {
  const tasks = db.tasks.filter((t) => t.project_id === p.id)
  const done = tasks.filter((t) => t.status === "done").length
  // Late means the due day has passed, the same rule the task rows use.
  const overdue = tasks.filter(
    (t) => t.status !== "done" && t.due_at && Math.ceil((new Date(t.due_at).getTime() - Date.now()) / 864e5) < 0
  ).length
  // The next check-in falls one period after the last one, or after the start.
  const every = CADENCE_DAYS[p.cadence]
  const lastCheckIn = db.check_ins
    .filter((c) => c.project_id === p.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  const from = new Date(lastCheckIn?.created_at ?? p.created_at).getTime()
  const since = Math.floor((Date.now() - from) / 864e5)
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
    checkInInDays: every - since,
    lastCheckIn,
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
    retrospective: db.retrospectives.find((r) => r.project_id === id),
    teamSuggestion: db.team_suggestions
      .filter((t) => t.project_id === id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0],
    checkIns: db.check_ins
      .filter((c) => c.project_id === id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
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

/* ------------------------------------------------------------- objectives */

export type ObjectiveRow = Objective & {
  /** What counts as progress right now: typed in, or counted from won deals. */
  current: number
  /** 0–100 */
  percent: number
}

/**
 * One person's objectives for the week, month and year they are in now.
 * Who may see them is decided by the page (`can.viewMember`).
 */
export async function listObjectives(
  workspaceId: string,
  ownerId: string
): Promise<Record<ObjectivePeriod, ObjectiveRow[]>> {
  const db = await readDb()
  const out: Record<ObjectivePeriod, ObjectiveRow[]> = { week: [], month: [], year: [] }
  for (const period of ["week", "month", "year"] as ObjectivePeriod[]) {
    const start = periodStart(period)
    const end = periodEnd(period, start)
    out[period] = db.objectives
      .filter(
        (o) => o.workspace_id === workspaceId && o.owner_id === ownerId && o.period === period && o.period_start === start
      )
      .map((o) => {
        const current =
          o.measure === "won"
            ? db.deals
                .filter(
                  (d) =>
                    d.workspace_id === workspaceId &&
                    d.owner_id === ownerId &&
                    d.stage === "won" &&
                    (d.closed_at ?? "").slice(0, 10) >= start &&
                    (d.closed_at ?? "").slice(0, 10) < end
                )
                .reduce((sum, d) => sum + d.value, 0)
            : o.progress
        const percent =
          o.measure === "done"
            ? o.done
              ? 100
              : 0
            : o.target
              ? Math.min(100, Math.round((current / o.target) * 100))
              : 0
        return { ...o, current, percent }
      })
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
  }
  return out
}

/* -------------------------------------------------------------- check-ins */

/**
 * A starting point for a check-in, written from the project's tasks since the
 * last one. It is a draft: the person edits every line before it is posted.
 */
export async function draftCheckIn(workspaceId: string, projectId: string) {
  const db = await readDb()
  const project = db.projects.find((p) => p.id === projectId && p.workspace_id === workspaceId)
  if (!project) return null
  const row = toProjectRow(db, project)
  const since = row.lastCheckIn?.created_at ?? project.created_at
  const tasks = db.tasks.filter((t) => t.project_id === projectId)
  const who = (id: string) => db.profiles.find((p) => p.id === id)?.full_name.split(" ")[0] ?? "Someone"
  const daysLeft = (t: Task) => (t.due_at ? Math.ceil((new Date(t.due_at).getTime() - Date.now()) / 864e5) : null)
  const line = (items: string[], none: string) => (items.length ? items.map((i) => `- ${i}`).join("\n") : none)

  const moved = tasks.filter((t) => t.status === "done" && (t.completed_at ?? "") >= since)
  const stuck = tasks.filter(
    (t) => t.status === "blocked" || (t.status !== "done" && (daysLeft(t) ?? 1) < 0)
  )
  const horizon = CADENCE_DAYS[project.cadence]
  const next = tasks.filter(
    (t) => t.status !== "done" && !stuck.includes(t) && (daysLeft(t) ?? horizon + 1) <= horizon
  )

  return {
    moved: line(moved.map((t) => `${t.title} (${who(t.assignee_id)})`), ""),
    stuck: line(
      stuck.map((t) =>
        t.status === "blocked"
          ? `${t.title}: ${TASK_STATUS.blocked.label.toLowerCase()} (${who(t.assignee_id)})`
          : `${t.title}: ${Math.abs(daysLeft(t) ?? 0)}d late (${who(t.assignee_id)})`
      ),
      ""
    ),
    next: line(next.map((t) => `${t.title} (${who(t.assignee_id)})`), ""),
    progress: row.progress,
    health: project.health,
    since,
  }
}

/* ------------------------------------------------------------------ flags */

export type FlagRow = Flag & {
  raisedBy?: string
  about?: { id: string; name: string }
  project?: { id: string; name: string }
  task?: { id: string; title: string }
}

type Viewer = { id: string; role: Role }

function toFlagRow(db: Awaited<ReturnType<typeof readDb>>, f: Flag): FlagRow {
  const about = db.profiles.find((p) => p.id === f.about_user_id)
  const project = db.projects.find((p) => p.id === f.project_id)
  const task = db.tasks.find((t) => t.id === f.task_id)
  return {
    ...f,
    raisedBy: db.profiles.find((p) => p.id === f.raised_by)?.full_name,
    about: about ? { id: about.id, name: about.full_name } : undefined,
    project: project ? { id: project.id, name: project.name } : undefined,
    task: task ? { id: task.id, title: task.title } : undefined,
  }
}

/**
 * The flags this viewer may see, and no others: ones they raised, and — for
 * owners and admins — everyone's, except any about the viewer themselves.
 */
export async function listFlags(workspaceId: string, viewer: Viewer): Promise<FlagRow[]> {
  const db = await readDb()
  const weight = { serious: 0, warning: 1, note: 2 }
  return db.flags
    .filter((f) => f.workspace_id === workspaceId && can.seeFlag(viewer.role, viewer.id, f))
    .map((f) => toFlagRow(db, f))
    .sort(
      (a, b) =>
        (a.status === "open" ? 0 : 1) - (b.status === "open" ? 0 : 1) ||
        weight[a.severity] - weight[b.severity] ||
        b.created_at.localeCompare(a.created_at)
    )
}

export async function getFlag(workspaceId: string, viewer: Viewer, id: string): Promise<FlagRow | null> {
  const db = await readDb()
  const f = db.flags.find((x) => x.id === id && x.workspace_id === workspaceId)
  if (!f || !can.seeFlag(viewer.role, viewer.id, f)) return null
  return toFlagRow(db, f)
}

/* ---------------------------------------------------------- retrospective */

export type Noticed = { text: string; lesson?: string }

/**
 * What the app noticed about a project, for the closing retrospective. Only
 * tasks, dates and check-ins are read: private flags are never used here.
 */
export async function noticeForRetro(workspaceId: string, projectId: string) {
  const db = await readDb()
  const project = db.projects.find((p) => p.id === projectId && p.workspace_id === workspaceId)
  if (!project) return null

  const tasks = db.tasks.filter((t) => t.project_id === projectId)
  const done = tasks.filter((t) => t.status === "done")
  const open = tasks.filter((t) => t.status !== "done")
  const day = (iso: string) => iso.slice(0, 10)
  const late = done.filter((t) => t.due_at && t.completed_at && day(t.completed_at) > day(t.due_at))
  const onTime = done.filter((t) => t.due_at && t.completed_at && day(t.completed_at) <= day(t.due_at))
  const noDeadline = tasks.filter((t) => !t.due_at)
  const blocked = open.filter((t) => t.status === "blocked")

  const every = CADENCE_DAYS[project.cadence]
  const ageDays = Math.floor((Date.now() - new Date(project.created_at).getTime()) / 864e5)
  const expected = Math.floor(ageDays / every)
  const posted = db.check_ins.filter((c) => c.project_id === projectId).length
  const missed = Math.max(0, expected - posted)
  const endedLateBy = project.due_at ? Math.floor((Date.now() - new Date(project.due_at).getTime()) / 864e5) : null

  const n = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`
  const wentWell: string[] = []
  const wentWrong: Noticed[] = []

  if (onTime.length > 0) wentWell.push(`${onTime.length} of ${done.length} finished tasks were on time`)
  if (done.length > 0 && open.length === 0) wentWell.push("Every task was finished")
  if (expected > 0 && missed === 0) wentWell.push("Every check-in was posted")
  if (endedLateBy !== null && endedLateBy <= 0) wentWell.push("Finished on or before the end date")

  if (noDeadline.length > 0)
    wentWrong.push({
      text: `${n(noDeadline.length, "task")} had no deadline`,
      lesson: "Give every task a due date when it is created.",
    })
  if (late.length > 0)
    wentWrong.push({
      text: `${n(late.length, "task")} finished late`,
      lesson: "Look at deadlines in each check-in and move them early, not after they pass.",
    })
  if (blocked.length > 0)
    wentWrong.push({
      text: `${n(blocked.length, "task")} still blocked at the end`,
      lesson: "Raise anything blocked for more than a day at once, not at the next check-in.",
    })
  if (open.length > 0)
    wentWrong.push({
      text: `${n(open.length, "task")} still open when it closed`,
      lesson: "Before closing, finish or hand over what is left.",
    })
  if (missed > 0)
    wentWrong.push({
      text: `${n(missed, "check-in")} missed`,
      lesson: "Keep the check-in rhythm, even in a quiet week.",
    })
  if (endedLateBy !== null && endedLateBy > 0)
    wentWrong.push({
      text: `Ended ${n(endedLateBy, "day")} after the end date`,
      lesson: "Set the end date from the tasks, then add a buffer.",
    })

  return { wentWell, wentWrong, openTasks: open.length }
}

/* -------------------------------------------------------------- analytics */

const dayOf = (iso: string) => iso.slice(0, 10)

/**
 * Completion, on-time and overdue across the workspace, by person and by
 * project, with six weeks of trend. For owners and admins: the page checks.
 * People are listed by name, never ranked.
 */
export async function getAnalytics(workspaceId: string) {
  const db = await readDb()
  const tasks = db.tasks.filter((t) => t.workspace_id === workspaceId)
  const now = Date.now()
  const late = (t: Task) =>
    t.status !== "done" && t.due_at && Math.ceil((new Date(t.due_at).getTime() - now) / 864e5) < 0
  const onTime = (t: Task) => t.due_at && t.completed_at && dayOf(t.completed_at) <= dayOf(t.due_at)

  // Week buckets, oldest first: week 0 is six weeks ago, week 5 is this week.
  const weeks = 6
  const weekOf = (iso: string) => Math.floor((now - new Date(iso).getTime()) / (7 * 864e5))
  const trend = (list: Task[]) => {
    const counts = Array.from({ length: weeks }, () => 0)
    for (const t of list) {
      if (!t.completed_at) continue
      const w = weekOf(t.completed_at)
      if (w >= 0 && w < weeks) counts[weeks - 1 - w]++
    }
    return counts
  }

  const rate = (part: number, whole: number) => (whole === 0 ? null : Math.round((part / whole) * 100))
  const summarise = (list: Task[]) => {
    const done = list.filter((t) => t.status === "done")
    const doneWithDue = done.filter((t) => t.due_at)
    const recent = done.filter((t) => t.completed_at && now - new Date(t.completed_at).getTime() < 30 * 864e5)
    return {
      total: list.length,
      open: list.length - done.length,
      done: done.length,
      doneLast30: recent.length,
      overdue: list.filter(late).length,
      completion: rate(done.length, list.length),
      onTime: rate(doneWithDue.filter(onTime).length, doneWithDue.length),
      trend: trend(done),
    }
  }

  const members = (await listMembers(workspaceId)).filter((m) => m.role !== "viewer")
  return {
    overall: summarise(tasks),
    people: members
      .map((m) => ({ id: m.id, name: m.full_name, ...summarise(tasks.filter((t) => t.assignee_id === m.id)) }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    projects: db.projects
      .filter((p) => p.workspace_id === workspaceId && p.status === "active")
      .map((p) => ({ id: p.id, name: p.name, health: p.health, ...summarise(tasks.filter((t) => t.project_id === p.id)) }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    weekLabels: Array.from({ length: weeks }, (_, i) => {
      const d = new Date(now - (weeks - 1 - i) * 7 * 864e5)
      return i === weeks - 1 ? "This week" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    }),
  }
}

/* ---------------------------------------------------------- custom fields */

export async function listCustomFields(workspaceId: string, object?: FieldObject): Promise<CustomField[]> {
  const db = await readDb()
  return db.custom_fields
    .filter((f) => f.workspace_id === workspaceId && (!object || f.object === object))
    .sort((a, b) => a.object.localeCompare(b.object) || a.position - b.position)
}

export type FieldWithValue = CustomField & { value: string; display: string }

/** A record's custom fields with their values, ready to show. */
export async function getCustomValues(
  workspaceId: string,
  object: FieldObject,
  recordId: string
): Promise<FieldWithValue[]> {
  const db = await readDb()
  const fields = await listCustomFields(workspaceId, object)
  return fields.map((f) => {
    const value = db.custom_values.find((v) => v.field_id === f.id && v.record_id === recordId)?.value ?? ""
    const display = !value
      ? ""
      : f.type === "money"
        ? money(Number(value))
        : f.type === "number"
          ? Number(value).toLocaleString("en-KE")
          : f.type === "date"
            ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
            : value
    return { ...f, value, display }
  })
}

/* ------------------------------------------------------------ person page */

/** One person: who they are, their deals, the work around them and what happened. */
export async function getPerson(workspaceId: string, id: string) {
  const db = await readDb()
  const person = db.contacts.find((c) => c.id === id && c.workspace_id === workspaceId)
  if (!person) return null
  const organisation = db.organisations.find((o) => o.id === person.organisation_id)
  return {
    person,
    organisation,
    owner: db.profiles.find((p) => p.id === person.owner_id),
    touchDueInDays: person.next_touch_at
      ? Math.ceil((new Date(person.next_touch_at).getTime() - Date.now()) / 864e5)
      : null,
    deals: db.deals
      .filter((d) => d.contact_id === id)
      .sort((a, b) => b.value - a.value),
    /** Others at the same organisation, to jump between. */
    colleagues: db.contacts
      .filter((c) => c.workspace_id === workspaceId && c.id !== id && c.organisation_id && c.organisation_id === person.organisation_id)
      .sort((a, b) => a.full_name.localeCompare(b.full_name)),
    activities: db.activities
      .filter((a) => a.contact_id === id)
      .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
      .slice(0, 40),
    people: db.profiles,
  }
}

/* ---------------------------------------------------------- notifications */

export type NotificationRow = Notification & { actorName?: string; ago: string; day: string }

/** "just now", "5 min ago", "3 h ago", "yesterday", "12 Sep". */
function ago(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} h ago`
  if (hours < 48) return "yesterday"
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

function dayLabel(iso: string) {
  const d = iso.slice(0, 10)
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10)
  if (d === today) return "Today"
  if (d === yesterday) return "Yesterday"
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
}

/** Your notifications in this workspace, newest first. Only ever your own. */
export async function listNotifications(
  workspaceId: string,
  userId: string,
  f: { unread?: boolean; type?: string; limit?: number } = {}
): Promise<NotificationRow[]> {
  const db = await readDb()
  return db.notifications
    .filter((n) => n.workspace_id === workspaceId && n.user_id === userId)
    .filter((n) => (f.unread ? !n.read_at : true))
    .filter((n) => (f.type ? n.type === f.type : true))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, f.limit ?? 200)
    .map((n) => ({
      ...n,
      actorName: db.profiles.find((p) => p.id === n.actor_id)?.full_name,
      ago: ago(n.created_at),
      day: dayLabel(n.created_at),
    }))
}

export async function unreadNotificationCount(workspaceId: string, userId: string): Promise<number> {
  const db = await readDb()
  return db.notifications.filter((n) => n.workspace_id === workspaceId && n.user_id === userId && !n.read_at).length
}

/** Your own notes in this workspace, pinned first, then newest. Nobody else's, whatever their role. */
export async function listMyNotes(workspaceId: string, userId: string) {
  const db = await readDb()
  return db.notes
    .filter((n) => n.workspace_id === workspaceId && n.author_id === userId)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at))
}

export type BannerSettings = { banners: boolean; quietOn: boolean; quietFrom: string; quietTo: string }

/** This person's banner controls for one workspace. Quiet hours default to 22:00 to 07:00 when first switched on. */
export async function getBannerSettings(workspaceId: string, userId: string): Promise<BannerSettings> {
  const db = await readDb()
  const p = db.notification_prefs.find((x) => x.workspace_id === workspaceId && x.user_id === userId)
  return {
    banners: !p?.banners_off,
    quietOn: Boolean(p?.quiet_from && p?.quiet_to),
    quietFrom: p?.quiet_from ?? "22:00",
    quietTo: p?.quiet_to ?? "07:00",
  }
}

export async function getMutedNotifications(workspaceId: string, userId: string): Promise<NotificationType[]> {
  const db = await readDb()
  return db.notification_prefs.find((p) => p.workspace_id === workspaceId && p.user_id === userId)?.muted ?? []
}
