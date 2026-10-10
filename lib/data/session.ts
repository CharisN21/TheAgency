import "server-only"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { readDb } from "./store"
import { isFounder } from "./founders"
import type { Membership, Profile, Role, Venture, Workspace } from "./types"

export const SESSION_COOKIE = "agency_user"
export const WORKSPACE_COOKIE = "agency_workspace"

const YEAR = 60 * 60 * 24 * 365

export async function setSession(userId: string) {
  const jar = await cookies()
  jar.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: YEAR,
  })
}

export async function clearSession() {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
  jar.delete(WORKSPACE_COOKIE)
}

export async function setCurrentWorkspace(workspaceId: string) {
  const jar = await cookies()
  jar.set(WORKSPACE_COOKIE, workspaceId, { sameSite: "lax", path: "/", maxAge: YEAR })
}

export async function getUser(): Promise<Profile | null> {
  const jar = await cookies()
  const id = jar.get(SESSION_COOKIE)?.value
  if (!id) return null
  const db = await readDb()
  return db.profiles.find((p) => p.id === id) ?? null
}

export type Context = {
  user: Profile
  workspace: Workspace
  /** The venture the workspace belongs to: its name and mark head the screen. */
  venture: Venture
  role: Role
  workspaces: (Workspace & { role: Role; people: number })[]
}

/**
 * Everything a signed-in screen needs: who you are, which workspace you are in,
 * what you may do there. Sends you to sign-in or onboarding when either is missing.
 */
export async function requireContext(): Promise<Context> {
  const user = await getUser()
  if (!user) redirect("/sign-in")

  const db = await readDb()
  const mine = db.memberships.filter((m) => m.user_id === user.id)
  // Nobody makes their own workspace: founders start ventures, everyone else waits for an invite.
  if (mine.length === 0) redirect(isFounder(user) ? "/ventures" : "/welcome")

  const workspaces = mine
    .map((m: Membership) => {
      const workspace = db.workspaces.find((w) => w.id === m.workspace_id)!
      return {
        ...workspace,
        role: m.role,
        people: db.memberships.filter((x) => x.workspace_id === workspace.id).length,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  const jar = await cookies()
  const wanted = jar.get(WORKSPACE_COOKIE)?.value
  const workspace = workspaces.find((w) => w.id === wanted) ?? workspaces[0]

  const venture =
    db.ventures.find((v) => v.id === workspace.venture_id) ??
    ({ id: workspace.venture_id, name: workspace.name, accent_color: workspace.accent_color, created_by: workspace.created_by, created_at: workspace.created_at } as Venture)

  return { user, workspace, venture, role: workspace.role, workspaces }
}
