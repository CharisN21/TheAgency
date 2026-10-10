import type { Database, Note, Role } from "@/lib/data/types"

/**
 * Who can see and change a note or whiteboard.
 *
 * - Only me (no sharing): the author alone. Owners and admins cannot see it.
 * - Everyone in the workspace: anyone in it can open it; anyone who can edit
 *   records can draw on a shared whiteboard.
 * - A project: it shows on the project page. Everyone in the workspace can open
 *   it (projects are open to the whole workspace), but only the project's lead
 *   and members, and owners and admins, can draw on it.
 *
 * A shared written note is read by others and changed only by its author. A
 * shared whiteboard is drawn on together. Sharing, pinning and deleting stay
 * with the author. A note shared to a project that no longer exists is private.
 */
export type Audience = "me" | "workspace" | "project"

export function audienceOf(db: Database, n: Note): Audience {
  if (n.shared === "workspace") return "workspace"
  if (n.shared === "project" && n.project_id && db.projects.some((p) => p.id === n.project_id && p.workspace_id === n.workspace_id)) {
    return "project"
  }
  return "me"
}

const inWorkspace = (db: Database, workspaceId: string, userId: string) =>
  db.memberships.some((m) => m.workspace_id === workspaceId && m.user_id === userId)

export function canSeeNote(db: Database, n: Note, userId: string): boolean {
  if (!inWorkspace(db, n.workspace_id, userId)) return false
  return n.author_id === userId || audienceOf(db, n) !== "me"
}

export function canDrawOn(db: Database, n: Note, userId: string, role: Role): boolean {
  if (n.kind !== "board" || !canSeeNote(db, n, userId)) return false
  if (n.author_id === userId) return true
  if (role === "viewer") return false
  const audience = audienceOf(db, n)
  if (audience === "workspace") return true
  if (audience === "project") {
    if (role === "owner" || role === "admin") return true
    const project = db.projects.find((p) => p.id === n.project_id)!
    return project.lead_id === userId || project.member_ids.includes(userId)
  }
  return false
}
