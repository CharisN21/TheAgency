import "server-only"

import { readDb } from "./store"
import type { Invite, Profile, Role } from "./types"

export type Member = Profile & { role: Role; title?: string; joined: string }

export async function listMembers(companyId: string): Promise<Member[]> {
  const db = await readDb()
  const order: Record<Role, number> = { owner: 0, admin: 1, member: 2, viewer: 3 }
  return db.memberships
    .filter((m) => m.company_id === companyId)
    .map((m) => {
      const p = db.profiles.find((x) => x.id === m.user_id)!
      return { ...p, role: m.role, title: m.title, joined: m.created_at }
    })
    .sort((a, b) => order[a.role] - order[b.role] || a.full_name.localeCompare(b.full_name))
}

export async function listInvites(companyId: string): Promise<Invite[]> {
  const db = await readDb()
  return db.invites
    .filter((i) => i.company_id === companyId && !i.accepted_at)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function getInviteByToken(token: string) {
  const db = await readDb()
  const invite = db.invites.find((i) => i.token === token)
  if (!invite) return null
  const company = db.companies.find((c) => c.id === invite.company_id) ?? null
  const inviter = db.profiles.find((p) => p.id === invite.invited_by) ?? null
  return { invite, company, inviter }
}

export type SetupState = {
  hasCompany: boolean
  signedIn: boolean
  invitedSomeone: boolean
  teamJoined: boolean
  done: number
  total: number
}

/** Drives the "Get set up" checklist on Today — real state, not decoration. */
export async function getSetupState(companyId: string, userId: string): Promise<SetupState> {
  const db = await readDb()
  const members = db.memberships.filter((m) => m.company_id === companyId)
  const invites = db.invites.filter((i) => i.company_id === companyId)

  const steps = {
    hasCompany: true,
    signedIn: Boolean(userId),
    invitedSomeone: invites.length > 0 || members.length > 1,
    teamJoined: members.length > 1,
  }

  return {
    ...steps,
    done: Object.values(steps).filter(Boolean).length,
    total: 4,
  }
}

export async function pendingInviteCount(companyId: string) {
  const db = await readDb()
  return db.invites.filter((i) => i.company_id === companyId && !i.accepted_at).length
}
