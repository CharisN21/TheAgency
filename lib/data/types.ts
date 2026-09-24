/**
 * The shapes the app works with. These match the Supabase tables in
 * supabase/migrations/0001_foundation.sql one-for-one, so moving from the local
 * JSON store to Postgres later is a change of adapter, not of screens.
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
  owner: "Everything, including billing and deleting the company.",
  admin: "Invite people, change roles, see private flags, manage all projects.",
  member: "Work on projects they are added to: tasks, comments, check-ins.",
  viewer: "See projects and progress. Cannot create or edit anything.",
}

export type Profile = {
  id: string
  email: string
  full_name: string
  phone?: string
  created_at: string
}

export type Company = {
  id: string
  name: string
  accent_color: string
  created_by: string
  created_at: string
}

export type Membership = {
  company_id: string
  user_id: string
  role: Role
  title?: string
  created_at: string
}

export type Invite = {
  id: string
  company_id: string
  email: string
  role: Role
  token: string
  invited_by: string
  expires_at: string
  accepted_at?: string
  created_at: string
}

export type Activity = {
  id: string
  company_id: string
  actor_id: string
  action: string
  created_at: string
}

export type Database = {
  profiles: Profile[]
  companies: Company[]
  memberships: Membership[]
  invites: Invite[]
  activity_log: Activity[]
}

/** Who can do what. The UI and the actions both read this — never one or the other. */
export const can = {
  invite: (r: Role) => r === "owner" || r === "admin",
  manageRoles: (r: Role) => r === "owner" || r === "admin",
  removeMember: (r: Role) => r === "owner" || r === "admin",
  editCompany: (r: Role) => r === "owner" || r === "admin",
  deleteCompany: (r: Role) => r === "owner",
  createContent: (r: Role) => r !== "viewer",
  seeFlags: (r: Role) => r === "owner" || r === "admin",
}
