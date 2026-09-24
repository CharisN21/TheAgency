import "server-only"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { readDb } from "./store"
import type { Company, Membership, Profile, Role } from "./types"

export const SESSION_COOKIE = "agency_user"
export const COMPANY_COOKIE = "agency_company"

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
  jar.delete(COMPANY_COOKIE)
}

export async function setCurrentCompany(companyId: string) {
  const jar = await cookies()
  jar.set(COMPANY_COOKIE, companyId, { sameSite: "lax", path: "/", maxAge: YEAR })
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
  company: Company
  role: Role
  companies: (Company & { role: Role; people: number })[]
}

/**
 * Everything a signed-in screen needs: who you are, which company you are in,
 * what you may do there. Sends you to sign-in or onboarding when either is missing.
 */
export async function requireContext(): Promise<Context> {
  const user = await getUser()
  if (!user) redirect("/sign-in")

  const db = await readDb()
  const mine = db.memberships.filter((m) => m.user_id === user.id)
  if (mine.length === 0) redirect("/new-company")

  const companies = mine
    .map((m: Membership) => {
      const company = db.companies.find((c) => c.id === m.company_id)!
      return {
        ...company,
        role: m.role,
        people: db.memberships.filter((x) => x.company_id === company.id).length,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  const jar = await cookies()
  const wanted = jar.get(COMPANY_COOKIE)?.value
  const company = companies.find((c) => c.id === wanted) ?? companies[0]

  return { user, company, role: company.role, companies }
}
