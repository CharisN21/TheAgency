"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import {
  clearSession,
  getUser,
  requireContext,
  setCurrentCompany,
  setSession,
} from "./session"
import { log, mutate, newId, newToken, readDb, resetDb } from "./store"
import { can, type Role } from "./types"

export type Result = { ok: boolean; message: string }

const now = () => new Date().toISOString()
const titleCase = (email: string) =>
  email
    .split("@")[0]
    .split(/[._-]/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ")

/* ------------------------------------------------------------------ sign in */

/** Local sign-in: an email is enough. Real auth arrives with Supabase. */
export async function signIn(formData: FormData): Promise<Result> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  if (!email.includes("@") || email.endsWith("@") || email.startsWith("@")) {
    return { ok: false, message: "Enter a full email address" }
  }

  const userId = await mutate((db) => {
    const existing = db.profiles.find((p) => p.email.toLowerCase() === email)
    if (existing) return existing.id
    const profile = {
      id: newId(),
      email,
      full_name: titleCase(email),
      created_at: now(),
    }
    db.profiles.push(profile)
    return profile.id
  })

  await setSession(userId)

  const db = await readDb()
  const hasCompany = db.memberships.some((m) => m.user_id === userId)
  redirect(hasCompany ? "/today" : "/new-company")
}

export async function signOut(): Promise<void> {
  await clearSession()
  redirect("/sign-in")
}

export async function switchCompany(companyId: string): Promise<void> {
  const user = await getUser()
  if (!user) redirect("/sign-in")
  const db = await readDb()
  const allowed = db.memberships.some(
    (m) => m.user_id === user.id && m.company_id === companyId
  )
  if (allowed) await setCurrentCompany(companyId)
  revalidatePath("/", "layout")
}

/* --------------------------------------------------------------- companies */

export async function createCompany(formData: FormData): Promise<Result> {
  const user = await getUser()
  if (!user) redirect("/sign-in")

  const name = String(formData.get("name") ?? "").trim()
  const title = String(formData.get("title") ?? "").trim()
  const accent = String(formData.get("accent") ?? "#7c1f35")
  if (name.length < 2) return { ok: false, message: "Give the company a name" }

  const companyId = await mutate((db) => {
    const id = newId()
    db.companies.push({
      id,
      name,
      accent_color: accent,
      created_by: user.id,
      created_at: now(),
    })
    db.memberships.push({
      company_id: id,
      user_id: user.id,
      role: "owner",
      title: title || undefined,
      created_at: now(),
    })
    log(db, id, user.id, `created ${name}`)
    return id
  })

  await setCurrentCompany(companyId)
  revalidatePath("/", "layout")
  redirect("/today?created=1")
}

export async function updateCompany(formData: FormData): Promise<Result> {
  const { user, company, role } = await requireContext()
  if (!can.editCompany(role)) {
    return { ok: false, message: "Only owners and admins can change the company" }
  }
  const name = String(formData.get("name") ?? "").trim()
  if (name.length < 2) return { ok: false, message: "Give the company a name" }

  await mutate((db) => {
    const c = db.companies.find((x) => x.id === company.id)
    if (c) c.name = name
    log(db, company.id, user.id, `renamed the company to ${name}`)
  })

  revalidatePath("/", "layout")
  return { ok: true, message: "Company updated" }
}

/* ----------------------------------------------------------------- invites */

export async function createInvite(formData: FormData): Promise<Result> {
  const { user, company, role } = await requireContext()
  if (!can.invite(role)) {
    return { ok: false, message: "Only owners and admins can invite people" }
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const inviteRole = String(formData.get("role") ?? "member") as Role
  if (!email.includes("@") || email.endsWith("@")) {
    return { ok: false, message: "Enter a full email address" }
  }

  const db = await readDb()
  const already = db.memberships.some((m) => {
    const p = db.profiles.find((x) => x.id === m.user_id)
    return m.company_id === company.id && p?.email.toLowerCase() === email
  })
  if (already) return { ok: false, message: `${email} is already in ${company.name}` }

  const pending = db.invites.find(
    (i) => i.company_id === company.id && i.email === email && !i.accepted_at
  )
  if (pending) return { ok: false, message: `${email} already has an invite waiting` }

  await mutate((d) => {
    d.invites.push({
      id: newId(),
      company_id: company.id,
      email,
      role: inviteRole,
      token: newToken(),
      invited_by: user.id,
      expires_at: new Date(Date.now() + 7 * 864e5).toISOString(),
      created_at: now(),
    })
    log(d, company.id, user.id, `invited ${email} as ${inviteRole}`)
  })

  revalidatePath("/team")
  revalidatePath("/today")
  return { ok: true, message: `Invite ready for ${email}` }
}

export async function revokeInvite(inviteId: string): Promise<Result> {
  const { user, company, role } = await requireContext()
  if (!can.invite(role)) return { ok: false, message: "You cannot manage invites" }

  await mutate((db) => {
    const i = db.invites.find((x) => x.id === inviteId && x.company_id === company.id)
    if (i) {
      db.invites = db.invites.filter((x) => x.id !== inviteId)
      log(db, company.id, user.id, `cancelled the invite for ${i.email}`)
    }
  })

  revalidatePath("/team")
  return { ok: true, message: "Invite cancelled" }
}

export async function acceptInvite(token: string): Promise<Result> {
  const user = await getUser()
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(`/join/${token}`)}`)

  const db = await readDb()
  const invite = db.invites.find((i) => i.token === token)
  if (!invite) return { ok: false, message: "That invite link is not valid" }
  if (invite.accepted_at) return { ok: false, message: "That invite has already been used" }
  if (new Date(invite.expires_at) < new Date()) {
    return { ok: false, message: "That invite has expired. Ask for a new one." }
  }

  await mutate((d) => {
    const i = d.invites.find((x) => x.token === token)!
    i.accepted_at = now()
    const already = d.memberships.some(
      (m) => m.company_id === i.company_id && m.user_id === user.id
    )
    if (!already) {
      d.memberships.push({
        company_id: i.company_id,
        user_id: user.id,
        role: i.role,
        created_at: now(),
      })
    }
    log(d, i.company_id, user.id, `joined as ${i.role}`)
  })

  await setCurrentCompany(invite.company_id)
  revalidatePath("/", "layout")
  redirect("/today?joined=1")
}

/* ----------------------------------------------------------------- members */

export async function changeRole(userId: string, role: Role): Promise<Result> {
  const ctx = await requireContext()
  if (!can.manageRoles(ctx.role)) {
    return { ok: false, message: "Only owners and admins can change roles" }
  }

  const db = await readDb()
  const owners = db.memberships.filter(
    (m) => m.company_id === ctx.company.id && m.role === "owner"
  )
  const target = db.memberships.find(
    (m) => m.company_id === ctx.company.id && m.user_id === userId
  )
  if (!target) return { ok: false, message: "That person is not in this company" }
  if (target.role === "owner" && owners.length === 1 && role !== "owner") {
    return {
      ok: false,
      message: "Make someone else an owner first — a company always needs one.",
    }
  }
  if (role === "owner" && ctx.role !== "owner") {
    return { ok: false, message: "Only an owner can make someone else an owner" }
  }

  const name =
    db.profiles.find((p) => p.id === userId)?.full_name ?? "That person"

  await mutate((d) => {
    const m = d.memberships.find(
      (x) => x.company_id === ctx.company.id && x.user_id === userId
    )
    if (m) m.role = role
    log(d, ctx.company.id, ctx.user.id, `changed ${name}'s role to ${role}`)
  })

  revalidatePath("/team")
  return { ok: true, message: `${name} is now ${role === "admin" ? "an" : "a"} ${role}` }
}

export async function removeMember(userId: string): Promise<Result> {
  const ctx = await requireContext()
  if (!can.removeMember(ctx.role) && userId !== ctx.user.id) {
    return { ok: false, message: "You cannot remove people" }
  }

  const db = await readDb()
  const target = db.memberships.find(
    (m) => m.company_id === ctx.company.id && m.user_id === userId
  )
  if (!target) return { ok: false, message: "That person is not in this company" }

  const owners = db.memberships.filter(
    (m) => m.company_id === ctx.company.id && m.role === "owner"
  )
  if (target.role === "owner" && owners.length === 1) {
    return { ok: false, message: "A company always needs one owner" }
  }

  const name = db.profiles.find((p) => p.id === userId)?.full_name ?? "That person"

  await mutate((d) => {
    d.memberships = d.memberships.filter(
      (m) => !(m.company_id === ctx.company.id && m.user_id === userId)
    )
    log(d, ctx.company.id, ctx.user.id, `removed ${name}`)
  })

  revalidatePath("/team")
  return { ok: true, message: `${name} no longer has access to ${ctx.company.name}` }
}

/* ------------------------------------------------------------------- demo */

export async function resetDemoData(): Promise<Result> {
  await resetDb()
  await clearSession()
  revalidatePath("/", "layout")
  return { ok: true, message: "Demo data reset. Sign in again." }
}
