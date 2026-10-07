/**
 * The shapes the app works with.
 *
 * Naming, settled 24 Sep 2026: a **workspace** is one of your own ventures
 * (Kilima Labs). An **organisation** is a business you deal with — a supplier,
 * a client, a partner. People belong to organisations; deals belong to both.
 */

export type Role = "owner" | "admin" | "member" | "viewer"

export const ROLES: Role[] = ["owner", "admin", "member", "viewer"]

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
}

export const ROLE_HELP: Record<Role, string> = {
  owner: "Everything, including billing and deleting the workspace.",
  admin: "Invite people, change roles, see private flags, manage all work.",
  member: "Work on what they are added to: deals, contacts, tasks, notes.",
  viewer: "See the work and the progress. Cannot create or edit anything.",
}

export type Profile = {
  id: string
  email: string
  full_name: string
  phone?: string
  created_at: string
}

export type Workspace = {
  id: string
  name: string
  accent_color: string
  created_by: string
  created_at: string
}

export type Membership = {
  workspace_id: string
  user_id: string
  role: Role
  title?: string
  created_at: string
}

export type Invite = {
  id: string
  workspace_id: string
  email: string
  role: Role
  token: string
  invited_by: string
  expires_at: string
  accepted_at?: string
  created_at: string
}

/* ------------------------------------------------------------------ CRM */

export type OrgCategory =
  | "supplier"
  | "client"
  | "partner"
  | "prospect"
  | "service"

export const ORG_CATEGORIES: OrgCategory[] = [
  "supplier",
  "client",
  "partner",
  "prospect",
  "service",
]

export const ORG_CATEGORY_LABEL: Record<OrgCategory, string> = {
  supplier: "Supplier",
  client: "Client",
  partner: "Partner",
  prospect: "Prospect",
  service: "Service provider",
}

export type Organisation = {
  id: string
  workspace_id: string
  name: string
  category: OrgCategory
  what_they_do?: string
  location?: string
  phone?: string
  email?: string
  owner_id: string
  tags: string[]
  created_at: string
}

export type Contact = {
  id: string
  workspace_id: string
  organisation_id?: string
  full_name: string
  title?: string
  email?: string
  phone?: string
  tags: string[]
  owner_id: string
  next_touch_at?: string
  created_at: string
}

export type StageId = "new" | "quoted" | "negotiating" | "won" | "lost"

export type Stage = {
  id: StageId
  label: string
  /** What being in this stage means, in one line. Shown as the column's help. */
  meaning: string
  tone: "" | "is-amber" | "is-blue" | "is-green" | "is-red"
  /** Weight used for the forecast. Won is 1, lost is 0. */
  probability: number
}

export const STAGES: Stage[] = [
  { id: "new", label: "New", meaning: "Worth a conversation.", tone: "", probability: 0.1 },
  { id: "quoted", label: "Quoted", meaning: "Price is with them.", tone: "is-amber", probability: 0.4 },
  { id: "negotiating", label: "Negotiating", meaning: "Talking terms.", tone: "is-blue", probability: 0.7 },
  { id: "won", label: "Won", meaning: "Agreed. Deliver it.", tone: "is-green", probability: 1 },
  { id: "lost", label: "Lost", meaning: "Not this time. Say why.", tone: "is-red", probability: 0 },
]

export const OPEN_STAGES: StageId[] = ["new", "quoted", "negotiating"]

export const stageOf = (id: StageId) => STAGES.find((s) => s.id === id) ?? STAGES[0]

export type Deal = {
  id: string
  workspace_id: string
  title: string
  organisation_id?: string
  contact_id?: string
  /** Whole shillings. No cents in this business. */
  value: number
  stage: StageId
  expected_close?: string
  owner_id: string
  lost_reason?: string
  created_at: string
  closed_at?: string
  stage_changed_at: string
}

export type ActivityType =
  | "call"
  | "meeting"
  | "whatsapp"
  | "email"
  | "visit"
  | "note"
  | "system"

export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  call: "Call",
  meeting: "Meeting",
  whatsapp: "WhatsApp",
  email: "Email",
  visit: "Visit",
  note: "Note",
  system: "Change",
}

export type Activity = {
  id: string
  workspace_id: string
  type: ActivityType
  summary: string
  occurred_at: string
  actor_id: string
  organisation_id?: string
  contact_id?: string
  deal_id?: string
}

/** A filter the person built, kept so they can come back to it. */
export type SavedView = {
  id: string
  workspace_id: string
  user_id: string
  object: "organisations" | "people" | "deals"
  name: string
  /** The query string the list page reads, e.g. "category=supplier&stale=30". */
  query: string
  shared: boolean
  created_at: string
}

/** Two records a person looked at and said are different. Never suggested again. */
export type NotDuplicate = {
  id: string
  workspace_id: string
  object: "people" | "organisations"
  /** The two ids, in either order. */
  a_id: string
  b_id: string
  marked_by: string
  created_at: string
}

export type FilterField =
  | "category"
  | "owner"
  | "tag"
  | "stale"
  | "hasDeals"

export const FILTER_LABEL: Record<FilterField, string> = {
  category: "Type",
  owner: "Owner",
  tag: "Tag",
  stale: "Last contact",
  hasDeals: "Open deals",
}

/* ------------------------------------------------------ projects and tasks */

export type TaskStatus = "todo" | "doing" | "review" | "done" | "blocked"

export const TASK_STATUSES: TaskStatus[] = ["todo", "doing", "review", "done", "blocked"]

/** Every status carries its word; the colour only backs it up. */
export const TASK_STATUS: Record<TaskStatus, { label: string; tone: string }> = {
  todo: { label: "To do", tone: "bg-muted text-muted-foreground" },
  doing: { label: "In progress", tone: "bg-warn-soft text-warn" },
  review: { label: "In review", tone: "bg-info-soft text-info" },
  done: { label: "Done", tone: "bg-ok-soft text-ok" },
  blocked: { label: "Blocked", tone: "bg-danger-soft text-destructive" },
}

export type Priority = "low" | "medium" | "high"

export const PRIORITY_LABEL: Record<Priority, string> = { low: "Low", medium: "Medium", high: "High" }

/**
 * A task can stand alone or hang off a project, an organisation, a deal or a
 * person. Whoever it is for sees it on their member page.
 */
export type Task = {
  id: string
  workspace_id: string
  title: string
  notes?: string
  status: TaskStatus
  priority: Priority
  due_at?: string
  assignee_id: string
  created_by: string
  project_id?: string
  organisation_id?: string
  deal_id?: string
  contact_id?: string
  created_at: string
  completed_at?: string
}

export type ProjectHealth = "on_track" | "at_risk" | "blocked"

export const HEALTH: Record<ProjectHealth, { label: string; tone: string }> = {
  on_track: { label: "On track", tone: "bg-ok-soft text-ok" },
  at_risk: { label: "At risk", tone: "bg-warn-soft text-warn" },
  blocked: { label: "Blocked", tone: "bg-danger-soft text-destructive" },
}

export type Cadence = "weekly" | "fortnightly" | "monthly"

export const CADENCE_DAYS: Record<Cadence, number> = { weekly: 7, fortnightly: 14, monthly: 30 }

export type Project = {
  id: string
  workspace_id: string
  name: string
  /** What done looks like, in a few lines. */
  scope?: string
  organisation_id?: string
  deal_id?: string
  lead_id: string
  member_ids: string[]
  status: "active" | "closed"
  health: ProjectHealth
  due_at?: string
  cadence: Cadence
  created_at: string
  closed_at?: string
}

/**
 * A project's progress note on its rhythm: what moved, what is stuck, what is
 * next, and where it stands. Kept as the project's progress history.
 */
export type CheckIn = {
  id: string
  workspace_id: string
  project_id: string
  author_id: string
  moved: string
  stuck: string
  next: string
  /** 0–100, as judged by the person writing it. */
  progress: number
  risks?: string
  health: ProjectHealth
  created_at: string
}

export type FlagSeverity = "note" | "warning" | "serious"

export const SEVERITY: Record<FlagSeverity, { label: string; tone: string; help: string }> = {
  note: { label: "Note", tone: "bg-info-soft text-info", help: "Worth keeping an eye on." },
  warning: { label: "Warning", tone: "bg-warn-soft text-warn", help: "Needs a conversation soon." },
  serious: { label: "Serious", tone: "bg-danger-soft text-destructive", help: "Needs a conversation now." },
}

/**
 * A private concern. Only the person who raised it, and owners and admins
 * who are not the person it is about, ever see it. It never appears on a
 * timeline or any shared record.
 */
export type Flag = {
  id: string
  workspace_id: string
  raised_by: string
  /** The person it is about, if it is about a person. They never see it. */
  about_user_id?: string
  project_id?: string
  task_id?: string
  severity: FlagSeverity
  situation: string
  behaviour: string
  impact: string
  status: "open" | "closed"
  /** Logged after the conversation, which closes the flag. */
  talked_at?: string
  conversation?: string
  agreed_change?: string
  created_at: string
}

/**
 * Written when a project closes: what went well, what went wrong, and the
 * lessons worth carrying into the next one. The Mentor reads the lessons.
 */
export type Retrospective = {
  id: string
  workspace_id: string
  project_id: string
  written_by: string
  went_well: string[]
  went_wrong: string[]
  lessons: string[]
  created_at: string
}

/** A role Claude proposed for a project, for a person or for an AI helper. */
export type SuggestedRole = {
  role: string
  headcount: number
  kind: "person" | "ai"
  why: string
  /** Someone already in the workspace who might fit. Never added without a click. */
  suggested_member_id: string | null
}

export type SuggestedMilestone = { title: string; due_in_days: number }

/**
 * What Claude suggested, kept whole, with which lines a person accepted, so
 * you can always see what was proposed and what you changed.
 */
export type TeamSuggestion = {
  id: string
  workspace_id: string
  project_id: string
  requested_by: string
  roles: SuggestedRole[]
  milestones: SuggestedMilestone[]
  /** Keys like "role:2" or "milestone:0". */
  accepted: string[]
  dismissed: string[]
  created_at: string
}

export type FieldType = "text" | "number" | "money" | "date" | "choice"

export const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  text: "Text",
  number: "Number",
  money: "Amount in KSh",
  date: "Date",
  choice: "A choice from a list",
}

/** Records that can carry custom fields. */
export type FieldObject = "organisations" | "people" | "deals"

export const FIELD_OBJECT_LABEL: Record<FieldObject, string> = {
  organisations: "Organisations",
  people: "People",
  deals: "Deals",
}

/** A field this workspace added to its organisations, people or deals. */
export type CustomField = {
  id: string
  workspace_id: string
  object: FieldObject
  label: string
  type: FieldType
  /** For "choice" fields. */
  options: string[]
  position: number
  created_by: string
  created_at: string
}

/** One record's value for one custom field, always kept as text. */
export type CustomValue = {
  workspace_id: string
  field_id: string
  record_id: string
  value: string
}

export type NotificationType =
  | "deal_moved"
  | "deal_assigned"
  | "task_assigned"
  | "task_done"
  | "check_in_posted"
  | "check_in_due"
  | "people_overdue"
  | "records_assigned"
  | "invite_accepted"
  | "chat_message"
  | "chat_mention"

/** What each kind is called in the settings, in plain words. */
export const NOTIFICATION_LABEL: Record<NotificationType, string> = {
  deal_moved: "A deal you own moves stage",
  deal_assigned: "A deal is handed to you",
  task_assigned: "A task is given to you",
  task_done: "A task you set is finished",
  check_in_posted: "Someone checks in on your project",
  check_in_due: "A check-in is due on a project you lead",
  people_overdue: "People you own are overdue to speak to",
  records_assigned: "People or organisations are handed to you",
  invite_accepted: "Someone accepts your invite",
  chat_message: "A new message in a chat you are in",
  chat_mention: "Someone tags you in a chat",
}

/**
 * Something that happened to your work. The title is safe to read on a lock
 * screen: who did what to which record, never money or private notes.
 */
export type Notification = {
  id: string
  workspace_id: string
  user_id: string
  type: NotificationType
  title: string
  /** Where tapping it goes, e.g. /deals/123. */
  href?: string
  actor_id?: string
  read_at?: string
  created_at: string
  /** For once-a-day kinds: stops the same reminder twice in a day. */
  dedupe_key?: string
}

/** Kinds a person has switched off. Everything is on unless listed here. */
export type NotificationPrefs = {
  workspace_id: string
  user_id: string
  muted: NotificationType[]
}

/**
 * A phone or laptop that has turned notifications on. Belongs to the person,
 * not a workspace: one device gets banners from every workspace they are in,
 * and each banner says which one.
 */
export type PushDevice = {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  /** "iPhone", "Chrome on Windows": so you can tell your devices apart. */
  label: string
  created_at: string
}

export type ObjectivePeriod = "week" | "month" | "year"

export const PERIOD_LABEL: Record<ObjectivePeriod, string> = {
  week: "This week",
  month: "This month",
  year: "This year",
}

/**
 * A goal for one person for a week, a month or a year. Progress is either a
 * number against a target, or simply done. "won" objectives count themselves
 * from the person's won deals in the period.
 */
export type Objective = {
  id: string
  workspace_id: string
  owner_id: string
  set_by: string
  title: string
  period: ObjectivePeriod
  /** First day of the period, YYYY-MM-DD. */
  period_start: string
  measure: "number" | "money" | "done" | "won"
  target?: number
  progress: number
  done: boolean
  created_at: string
}

/** The first day of the week (Monday), month or year that `at` falls in, as YYYY-MM-DD. */
export function periodStart(period: ObjectivePeriod, at = new Date()): string {
  const d = new Date(Date.UTC(at.getFullYear(), at.getMonth(), at.getDate()))
  if (period === "week") d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  if (period === "month") d.setUTCDate(1)
  if (period === "year") d.setUTCMonth(0, 1)
  return d.toISOString().slice(0, 10)
}

/** The day after the period ends, as YYYY-MM-DD. */
export function periodEnd(period: ObjectivePeriod, start: string): string {
  const d = new Date(`${start}T00:00:00Z`)
  if (period === "week") d.setUTCDate(d.getUTCDate() + 7)
  if (period === "month") d.setUTCMonth(d.getUTCMonth() + 1)
  if (period === "year") d.setUTCFullYear(d.getUTCFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

/* ------------------------------------------------------------ team chat (5b) */
// Messages are stored encrypted by the server (lib/chat/at-rest.ts), with a key
// the server holds. Only members of a chat can open it in the app.

/**
 * Announcements: the whole workspace reads, owners and admins post.
 * Group: named, with chosen members. DM: exactly two people.
 */
export type ChannelKind = "announcements" | "group" | "dm"

export const CHANNEL_KIND_LABEL: Record<ChannelKind, string> = {
  announcements: "Announcements",
  group: "Group",
  dm: "Direct message",
}

export type Channel = {
  id: string
  workspace_id: string
  name: string
  kind: ChannelKind
  created_by: string
  created_at: string
  /** A group made from a project's chat button: that project, so there is only ever one. */
  project_id?: string
}

/** Who is in a group or a direct message. Announcements need no rows: it is everyone. */
export type ChannelMember = {
  workspace_id: string
  channel_id: string
  user_id: string
  added_by: string
  added_at: string
}

/** A stored message. `body` is the sealed text, tags and card (see lib/chat/at-rest.ts). */
export type Message = {
  id: string
  workspace_id: string
  channel_id: string
  sender_id: string
  body: string
  created_at: string
}

/** When someone last read a channel, for unread counts. */
export type ChannelRead = {
  workspace_id: string
  channel_id: string
  user_id: string
  read_at: string
}

export type Database = {
  profiles: Profile[]
  workspaces: Workspace[]
  memberships: Membership[]
  invites: Invite[]
  organisations: Organisation[]
  contacts: Contact[]
  deals: Deal[]
  activities: Activity[]
  views: SavedView[]
  not_duplicates: NotDuplicate[]
  projects: Project[]
  tasks: Task[]
  objectives: Objective[]
  check_ins: CheckIn[]
  flags: Flag[]
  retrospectives: Retrospective[]
  team_suggestions: TeamSuggestion[]
  custom_fields: CustomField[]
  custom_values: CustomValue[]
  notifications: Notification[]
  notification_prefs: NotificationPrefs[]
  push_subscriptions: PushDevice[]
  channels: Channel[]
  channel_members: ChannelMember[]
  messages: Message[]
  channel_reads: ChannelRead[]
}

/** Who can do what. The screens and the actions both read this — never one or the other. */
export const can = {
  invite: (r: Role) => r === "owner" || r === "admin",
  manageRoles: (r: Role) => r === "owner" || r === "admin",
  removeMember: (r: Role) => r === "owner" || r === "admin",
  editWorkspace: (r: Role) => r === "owner" || r === "admin",
  deleteWorkspace: (r: Role) => r === "owner",
  /** Viewers read everything they can see, and change nothing. */
  edit: (r: Role) => r !== "viewer",
  seeFlags: (r: Role) => r === "owner" || r === "admin",
  /** Posting in Announcements. Everyone reads it. */
  announce: (r: Role) => r === "owner" || r === "admin",
  /** Starting a team group. Viewers can be added, and can message, but do not start groups. */
  createGroup: (r: Role) => r !== "viewer",
  /**
   * A private flag: the person who raised it, and owners and admins — but never
   * the person it is about, whatever their role.
   */
  seeFlag: (r: Role, viewerId: string, flag: { raised_by: string; about_user_id?: string }) =>
    flag.raised_by === viewerId ||
    ((r === "owner" || r === "admin") && flag.about_user_id !== viewerId),
  /** A member's own page: owners and admins open anyone's; everyone else only their own. */
  viewMember: (r: Role, viewerId: string, memberId: string) =>
    r === "owner" || r === "admin" || viewerId === memberId,
  /** Merging removes a record, so it follows the same rule as deleting. */
  merge: (r: Role) => r === "owner" || r === "admin",
}

/** KSh 480,000 — the way money is written everywhere in this app. */
export function money(value: number): string {
  return `KSh ${Math.round(value).toLocaleString("en-KE")}`
}

/** KSh 1.2M for tight spaces like stage totals. */
export function moneyShort(value: number): string {
  if (value >= 1_000_000) return `KSh ${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`
  if (value >= 1_000) return `KSh ${Math.round(value / 1_000)}k`
  return money(value)
}
