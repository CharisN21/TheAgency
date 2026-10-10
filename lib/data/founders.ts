import type { Database, Profile, Venture } from "./types"

/**
 * Who may create what.
 *
 * - The platform owner (Charis) appoints founders. Set PLATFORM_OWNER_EMAILS
 *   (comma separated) on the server. On a laptop without it, the demo Charis is
 *   the platform owner so the screens can be tried.
 * - A founder creates ventures, and workspaces inside the ventures they founded
 *   or own a workspace in.
 * - Everyone else only gets into the workspaces they are invited to.
 */
export function platformOwnerEmails(): string[] {
  const fromEnv = process.env.PLATFORM_OWNER_EMAILS
  if (fromEnv) return fromEnv.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
  return process.env.NODE_ENV === "production" ? [] : ["charis@example.com"]
}

export const isPlatformOwner = (p: Pick<Profile, "email">) => platformOwnerEmails().includes(p.email.toLowerCase())

export const isFounder = (p: Pick<Profile, "email" | "founder">) => p.founder === true || isPlatformOwner(p)

/** A founder runs a venture they created, or one where they own a workspace. */
export function runsVenture(db: Database, p: Profile, v: Venture): boolean {
  if (!isFounder(p)) return false
  if (v.created_by === p.id) return true
  return db.workspaces.some(
    (w) => w.venture_id === v.id && db.memberships.some((m) => m.workspace_id === w.id && m.user_id === p.id && m.role === "owner")
  )
}
