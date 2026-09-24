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

export type Database = {
  profiles: Profile[]
  workspaces: Workspace[]
  memberships: Membership[]
  invites: Invite[]
  organisations: Organisation[]
  contacts: Contact[]
  deals: Deal[]
  activities: Activity[]
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
