"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import {
  clearSession,
  getUser,
  requireContext,
  setCurrentWorkspace,
  setSession,
} from "./session"
import {
  emailKey,
  ORG_FIELDS,
  orgNameKey,
  pairKey,
  PERSON_FIELDS,
  personNameKey,
  phoneKey,
  REASON_LABEL,
  type MatchReason,
  type OrgField,
  type PersonField,
} from "./match"
import { log, mutate, newId, newToken, readDb, resetDb } from "./store"
import {
  can,
  ORG_CATEGORY_LABEL,
  stageOf,
  type ActivityType,
  type Database,
  type OrgCategory,
  type Role,
  type StageId,
} from "./types"

export type Result = { ok: boolean; message: string }

/** Returned instead of saving when the new record looks like one already here. */
export type Similar = { id: string; name: string; detail: string; href: string; reason: string }
export type AddResult = Result & { similar?: Similar }

const firstReason = (checks: [MatchReason, boolean][]) =>
  checks.find(([, hit]) => hit)?.[0]

/**
 * After "they are different, add anyway", remember that, so the new record and
 * the look-alike are not offered as duplicates straight after.
 */
function rememberDifferent(
  db: Database,
  formData: FormData,
  object: "people" | "organisations",
  workspaceId: string,
  userId: string,
  newRecordId: string
) {
  const other = str(formData, "not_duplicate_of")
  if (str(formData, "confirm") !== "1" || !other) return
  const rows: { id: string; workspace_id: string }[] =
    object === "people" ? db.contacts : db.organisations
  if (!rows.some((r) => r.id === other && r.workspace_id === workspaceId)) return
  db.not_duplicates.push({
    id: newId(),
    workspace_id: workspaceId,
    object,
    a_id: newRecordId,
    b_id: other,
    marked_by: userId,
    created_at: now(),
  })
}

const now = () => new Date().toISOString()
const titleCase = (email: string) =>
  email
    .split("@")[0]
    .split(/[._-]/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ")

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim()
const tags = (f: FormData, k: string) =>
  str(f, k)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)

/* ------------------------------------------------------------------ sign in */

/** Local sign-in: an email is enough. Real auth arrives with Supabase. */
export async function signIn(formData: FormData): Promise<Result> {
  const email = str(formData, "email").toLowerCase()
  if (!email.includes("@") || email.endsWith("@") || email.startsWith("@")) {
    return { ok: false, message: "Enter a full email address" }
  }

  const userId = await mutate((db) => {
    const existing = db.profiles.find((p) => p.email.toLowerCase() === email)
    if (existing) return existing.id
    const profile = { id: newId(), email, full_name: titleCase(email), created_at: now() }
    db.profiles.push(profile)
    return profile.id
  })

  await setSession(userId)

  const db = await readDb()
  const hasWorkspace = db.memberships.some((m) => m.user_id === userId)
  redirect(hasWorkspace ? "/today" : "/new-workspace")
}

export async function signOut(): Promise<void> {
  await clearSession()
  redirect("/sign-in")
}

export async function switchWorkspace(workspaceId: string): Promise<void> {
  const user = await getUser()
  if (!user) redirect("/sign-in")
  const db = await readDb()
  const allowed = db.memberships.some(
    (m) => m.user_id === user.id && m.workspace_id === workspaceId
  )
  if (allowed) await setCurrentWorkspace(workspaceId)
  revalidatePath("/", "layout")
}

/* -------------------------------------------------------------- workspaces */

export async function createWorkspace(formData: FormData): Promise<Result> {
  const user = await getUser()
  if (!user) redirect("/sign-in")

  const name = str(formData, "name")
  const title = str(formData, "title")
  const accent = str(formData, "accent") || "#7c1f35"
  if (name.length < 2) return { ok: false, message: "Give the workspace a name" }

  const workspaceId = await mutate((db) => {
    const id = newId()
    db.workspaces.push({
      id,
      name,
      accent_color: accent,
      created_by: user.id,
      created_at: now(),
    })
    db.memberships.push({
      workspace_id: id,
      user_id: user.id,
      role: "owner",
      title: title || undefined,
      created_at: now(),
    })
    log(db, id, user.id, `created ${name}`)
    return id
  })

  await setCurrentWorkspace(workspaceId)
  revalidatePath("/", "layout")
  redirect("/today?created=1")
}

export async function updateWorkspace(formData: FormData): Promise<Result> {
  const { user, workspace, role } = await requireContext()
  if (!can.editWorkspace(role)) {
    return { ok: false, message: "Only owners and admins can change the workspace" }
  }
  const name = str(formData, "name")
  if (name.length < 2) return { ok: false, message: "Give the workspace a name" }

  await mutate((db) => {
    const w = db.workspaces.find((x) => x.id === workspace.id)
    if (w) w.name = name
    log(db, workspace.id, user.id, `renamed the workspace to ${name}`)
  })

  revalidatePath("/", "layout")
  return { ok: true, message: "Workspace updated" }
}

/* ----------------------------------------------------------------- invites */

export async function createInvite(formData: FormData): Promise<Result> {
  const { user, workspace, role } = await requireContext()
  if (!can.invite(role)) {
    return { ok: false, message: "Only owners and admins can invite people" }
  }

  const email = str(formData, "email").toLowerCase()
  const inviteRole = (str(formData, "role") || "member") as Role
  if (!email.includes("@") || email.endsWith("@")) {
    return { ok: false, message: "Enter a full email address" }
  }

  const db = await readDb()
  const already = db.memberships.some((m) => {
    const p = db.profiles.find((x) => x.id === m.user_id)
    return m.workspace_id === workspace.id && p?.email.toLowerCase() === email
  })
  if (already) return { ok: false, message: `${email} is already in ${workspace.name}` }

  const pending = db.invites.find(
    (i) => i.workspace_id === workspace.id && i.email === email && !i.accepted_at
  )
  if (pending) return { ok: false, message: `${email} already has an invite waiting` }

  await mutate((d) => {
    d.invites.push({
      id: newId(),
      workspace_id: workspace.id,
      email,
      role: inviteRole,
      token: newToken(),
      invited_by: user.id,
      expires_at: new Date(Date.now() + 7 * 864e5).toISOString(),
      created_at: now(),
    })
    log(d, workspace.id, user.id, `invited ${email} as ${inviteRole}`)
  })

  revalidatePath("/team")
  revalidatePath("/today")
  return { ok: true, message: `Invite ready for ${email}` }
}

export async function revokeInvite(inviteId: string): Promise<Result> {
  const { user, workspace, role } = await requireContext()
  if (!can.invite(role)) return { ok: false, message: "You cannot manage invites" }

  await mutate((db) => {
    const i = db.invites.find((x) => x.id === inviteId && x.workspace_id === workspace.id)
    if (i) {
      db.invites = db.invites.filter((x) => x.id !== inviteId)
      log(db, workspace.id, user.id, `cancelled the invite for ${i.email}`)
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
      (m) => m.workspace_id === i.workspace_id && m.user_id === user.id
    )
    if (!already) {
      d.memberships.push({
        workspace_id: i.workspace_id,
        user_id: user.id,
        role: i.role,
        created_at: now(),
      })
    }
    log(d, i.workspace_id, user.id, `joined as ${i.role}`)
  })

  await setCurrentWorkspace(invite.workspace_id)
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
    (m) => m.workspace_id === ctx.workspace.id && m.role === "owner"
  )
  const target = db.memberships.find(
    (m) => m.workspace_id === ctx.workspace.id && m.user_id === userId
  )
  if (!target) return { ok: false, message: "That person is not in this workspace" }
  if (target.role === "owner" && owners.length === 1 && role !== "owner") {
    return {
      ok: false,
      message: "Make someone else an owner first — a workspace always needs one.",
    }
  }
  if (role === "owner" && ctx.role !== "owner") {
    return { ok: false, message: "Only an owner can make someone else an owner" }
  }

  const name = db.profiles.find((p) => p.id === userId)?.full_name ?? "That person"

  await mutate((d) => {
    const m = d.memberships.find(
      (x) => x.workspace_id === ctx.workspace.id && x.user_id === userId
    )
    if (m) m.role = role
    log(d, ctx.workspace.id, ctx.user.id, `changed ${name}'s role to ${role}`)
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
    (m) => m.workspace_id === ctx.workspace.id && m.user_id === userId
  )
  if (!target) return { ok: false, message: "That person is not in this workspace" }

  const owners = db.memberships.filter(
    (m) => m.workspace_id === ctx.workspace.id && m.role === "owner"
  )
  if (target.role === "owner" && owners.length === 1) {
    return { ok: false, message: "A workspace always needs one owner" }
  }

  const name = db.profiles.find((p) => p.id === userId)?.full_name ?? "That person"

  await mutate((d) => {
    d.memberships = d.memberships.filter(
      (m) => !(m.workspace_id === ctx.workspace.id && m.user_id === userId)
    )
    log(d, ctx.workspace.id, ctx.user.id, `removed ${name}`)
  })

  revalidatePath("/team")
  return { ok: true, message: `${name} no longer has access to ${ctx.workspace.name}` }
}

/* ----------------------------------------------------------- organisations */

export async function createOrganisation(formData: FormData): Promise<AddResult> {
  const { user, workspace, role } = await requireContext()
  if (!can.edit(role)) return { ok: false, message: "Viewers cannot add organisations" }

  const name = str(formData, "name")
  if (name.length < 2) return { ok: false, message: "Give the organisation a name" }

  const db = await readDb()
  const clash = db.organisations.find(
    (o) => o.workspace_id === workspace.id && o.name.toLowerCase() === name.toLowerCase()
  )
  if (clash) return { ok: false, message: `${name} is already in ${workspace.name}` }

  // Close enough to ask about. "Add anyway" sends confirm=1 and skips this.
  if (str(formData, "confirm") !== "1") {
    const key = { name: orgNameKey(name), phone: phoneKey(str(formData, "phone")), email: emailKey(str(formData, "email")) }
    for (const o of db.organisations.filter((x) => x.workspace_id === workspace.id)) {
      const reason = firstReason([
        ["phone", Boolean(key.phone && key.phone === phoneKey(o.phone))],
        ["email", Boolean(key.email && key.email === emailKey(o.email))],
        ["name", Boolean(key.name && key.name === orgNameKey(o.name))],
      ])
      if (reason) {
        return {
          ok: false,
          message: `This looks like ${o.name}`,
          similar: {
            id: o.id,
            name: o.name,
            detail: [ORG_CATEGORY_LABEL[o.category], o.location].filter(Boolean).join(" · "),
            href: `/organisations/${o.id}`,
            reason: REASON_LABEL[reason],
          },
        }
      }
    }
  }

  await mutate((d) => {
    const id = newId()
    d.organisations.push({
      id,
      workspace_id: workspace.id,
      name,
      category: (str(formData, "category") || "prospect") as OrgCategory,
      what_they_do: str(formData, "what_they_do") || undefined,
      location: str(formData, "location") || undefined,
      phone: str(formData, "phone") || undefined,
      email: str(formData, "email") || undefined,
      owner_id: user.id,
      tags: tags(formData, "tags"),
      created_at: now(),
    })
    rememberDifferent(d, formData, "organisations", workspace.id, user.id, id)
    log(d, workspace.id, user.id, `added ${name}`, { organisation_id: id })
  })

  revalidatePath("/organisations")
  revalidatePath("/today")
  return { ok: true, message: `${name} added` }
}

export async function updateOrganisation(id: string, formData: FormData): Promise<Result> {
  const { user, workspace, role } = await requireContext()
  if (!can.edit(role)) return { ok: false, message: "Viewers cannot change records" }

  await mutate((db) => {
    const o = db.organisations.find((x) => x.id === id && x.workspace_id === workspace.id)
    if (!o) return
    const name = str(formData, "name")
    if (name) o.name = name
    o.category = (str(formData, "category") || o.category) as OrgCategory
    o.what_they_do = str(formData, "what_they_do") || undefined
    o.location = str(formData, "location") || undefined
    o.phone = str(formData, "phone") || undefined
    o.email = str(formData, "email") || undefined
    if (formData.get("tags") !== null) o.tags = tags(formData, "tags")
    log(db, workspace.id, user.id, `updated ${o.name}`, { organisation_id: id })
  })

  revalidatePath(`/organisations/${id}`)
  revalidatePath("/organisations")
  return { ok: true, message: "Saved" }
}

export async function deleteOrganisation(id: string): Promise<Result> {
  const { user, workspace, role } = await requireContext()
  if (!can.editWorkspace(role)) {
    return { ok: false, message: "Only owners and admins can delete an organisation" }
  }

  const db = await readDb()
  const org = db.organisations.find((o) => o.id === id && o.workspace_id === workspace.id)
  if (!org) return { ok: false, message: "That organisation is not here" }
  const openDeals = db.deals.filter(
    (d) => d.organisation_id === id && !["won", "lost"].includes(d.stage)
  ).length
  if (openDeals > 0) {
    return {
      ok: false,
      message: `${org.name} still has ${openDeals} open ${openDeals === 1 ? "deal" : "deals"}. Close or move them first.`,
    }
  }

  await mutate((d) => {
    d.organisations = d.organisations.filter((o) => o.id !== id)
    d.contacts = d.contacts.map((c) =>
      c.organisation_id === id ? { ...c, organisation_id: undefined } : c
    )
    log(d, workspace.id, user.id, `deleted ${org.name}`)
  })

  revalidatePath("/organisations")
  redirect("/organisations")
}

/* --------------------------------------------------------------- contacts */

export async function createContact(formData: FormData): Promise<AddResult> {
  const { user, workspace, role } = await requireContext()
  if (!can.edit(role)) return { ok: false, message: "Viewers cannot add people" }

  const full_name = str(formData, "full_name")
  if (full_name.length < 2) return { ok: false, message: "Give the person a name" }

  const organisation_id = str(formData, "organisation_id") || undefined

  // Close enough to ask about. "Add anyway" sends confirm=1 and skips this.
  if (str(formData, "confirm") !== "1") {
    const db = await readDb()
    const org = db.organisations.find((o) => o.id === organisation_id)
    // The office line and info@ address belong to everyone there; they prove nothing.
    const phone = phoneKey(str(formData, "phone"))
    const email = emailKey(str(formData, "email"))
    const key = {
      name: personNameKey(full_name),
      phone: phone !== phoneKey(org?.phone) ? phone : null,
      email: email !== emailKey(org?.email) ? email : null,
    }
    for (const c of db.contacts.filter((x) => x.workspace_id === workspace.id)) {
      const reason = firstReason([
        ["phone", Boolean(key.phone && key.phone === phoneKey(c.phone))],
        ["email", Boolean(key.email && key.email === emailKey(c.email))],
        ["name", Boolean(key.name && key.name === personNameKey(c.full_name))],
      ])
      if (reason) {
        const theirOrg = db.organisations.find((o) => o.id === c.organisation_id)
        return {
          ok: false,
          message: `This looks like ${c.full_name}`,
          similar: {
            id: c.id,
            name: c.full_name,
            detail: [c.title, theirOrg?.name].filter(Boolean).join(" · ") || "No organisation",
            href: theirOrg ? `/organisations/${theirOrg.id}` : "/people",
            reason: REASON_LABEL[reason],
          },
        }
      }
    }
  }

  await mutate((db) => {
    const id = newId()
    db.contacts.push({
      id,
      workspace_id: workspace.id,
      organisation_id,
      full_name,
      title: str(formData, "title") || undefined,
      email: str(formData, "email") || undefined,
      phone: str(formData, "phone") || undefined,
      tags: tags(formData, "tags"),
      owner_id: user.id,
      next_touch_at: str(formData, "next_touch_at") || undefined,
      created_at: now(),
    })
    rememberDifferent(db, formData, "people", workspace.id, user.id, id)
    log(db, workspace.id, user.id, `added ${full_name}`, {
      organisation_id,
      contact_id: id,
    })
  })

  if (organisation_id) revalidatePath(`/organisations/${organisation_id}`)
  revalidatePath("/people")
  return { ok: true, message: `${full_name} added` }
}

/* ------------------------------------------------------------------ deals */

export async function createDeal(formData: FormData): Promise<Result> {
  const { user, workspace, role } = await requireContext()
  if (!can.edit(role)) return { ok: false, message: "Viewers cannot add deals" }

  const title = str(formData, "title")
  const value = Number(str(formData, "value").replace(/[^0-9.]/g, ""))
  if (title.length < 2) return { ok: false, message: "Give the deal a name" }
  if (!Number.isFinite(value) || value <= 0) {
    return { ok: false, message: "Put in what it is worth, in shillings" }
  }

  const organisation_id = str(formData, "organisation_id") || undefined
  const stage = (str(formData, "stage") || "new") as StageId

  await mutate((db) => {
    const id = newId()
    db.deals.push({
      id,
      workspace_id: workspace.id,
      title,
      organisation_id,
      contact_id: str(formData, "contact_id") || undefined,
      value,
      stage,
      expected_close: str(formData, "expected_close") || undefined,
      owner_id: user.id,
      created_at: now(),
      stage_changed_at: now(),
    })
    log(db, workspace.id, user.id, `opened ${title}`, { organisation_id, deal_id: id })
  })

  revalidatePath("/deals")
  revalidatePath("/organisations")
  if (organisation_id) revalidatePath(`/organisations/${organisation_id}`)
  return { ok: true, message: `${title} added to ${stageOf(stage).label}` }
}

export async function moveDeal(
  dealId: string,
  stage: StageId,
  lostReason?: string
): Promise<Result> {
  const { user, workspace, role } = await requireContext()
  if (!can.edit(role)) return { ok: false, message: "Viewers cannot move deals" }

  const db = await readDb()
  const deal = db.deals.find((d) => d.id === dealId && d.workspace_id === workspace.id)
  if (!deal) return { ok: false, message: "That deal is not here" }
  if (deal.stage === stage) return { ok: true, message: "" }

  const from = stageOf(deal.stage).label
  const to = stageOf(stage).label

  await mutate((d) => {
    const target = d.deals.find((x) => x.id === dealId)!
    target.stage = stage
    target.stage_changed_at = now()
    target.closed_at = stage === "won" || stage === "lost" ? now() : undefined
    target.lost_reason = stage === "lost" ? lostReason || target.lost_reason : undefined
    log(
      d,
      workspace.id,
      user.id,
      `moved ${target.title} from ${from} to ${to}${stage === "lost" && lostReason ? ` — ${lostReason}` : ""}`,
      { organisation_id: target.organisation_id, deal_id: dealId }
    )
  })

  revalidatePath("/deals")
  revalidatePath("/today")
  if (deal.organisation_id) revalidatePath(`/organisations/${deal.organisation_id}`)
  return {
    ok: true,
    message:
      stage === "won"
        ? `${deal.title} won. Nice.`
        : stage === "lost"
          ? `${deal.title} marked lost`
          : `${deal.title} moved to ${to}`,
  }
}

export async function updateDeal(dealId: string, formData: FormData): Promise<Result> {
  const { user, workspace, role } = await requireContext()
  if (!can.edit(role)) return { ok: false, message: "Viewers cannot change deals" }

  await mutate((db) => {
    const d = db.deals.find((x) => x.id === dealId && x.workspace_id === workspace.id)
    if (!d) return
    const title = str(formData, "title")
    if (title) d.title = title
    const value = Number(str(formData, "value").replace(/[^0-9.]/g, ""))
    if (Number.isFinite(value) && value > 0) d.value = value
    d.expected_close = str(formData, "expected_close") || undefined
    log(db, workspace.id, user.id, `updated ${d.title}`, {
      organisation_id: d.organisation_id,
      deal_id: dealId,
    })
  })

  revalidatePath("/deals")
  return { ok: true, message: "Saved" }
}

/* ------------------------------------------------------------- activities */

export async function logActivity(formData: FormData): Promise<Result> {
  const { user, workspace, role } = await requireContext()
  if (!can.edit(role)) return { ok: false, message: "Viewers cannot log activity" }

  const summary = str(formData, "summary")
  if (summary.length < 2) return { ok: false, message: "Say what happened, in one line" }

  const organisation_id = str(formData, "organisation_id") || undefined
  const contact_id = str(formData, "contact_id") || undefined
  const deal_id = str(formData, "deal_id") || undefined
  const type = (str(formData, "type") || "note") as ActivityType

  await mutate((db) => {
    db.activities.unshift({
      id: newId(),
      workspace_id: workspace.id,
      type,
      summary,
      occurred_at: now(),
      actor_id: user.id,
      organisation_id,
      contact_id,
      deal_id,
    })
  })

  if (organisation_id) revalidatePath(`/organisations/${organisation_id}`)
  revalidatePath("/today")
  return { ok: true, message: "Logged" }
}

/* ------------------------------------------------------------------- demo */

export async function resetDemoData(): Promise<Result> {
  await resetDb()
  await clearSession()
  revalidatePath("/", "layout")
  return { ok: true, message: "Demo data reset. Sign in again." }
}

/* --------------------------------------------------------- bulk + views */

/** Everything that acts on a selection goes through here: authorise once, log once. */
async function bulkGuard(ids: string[]) {
  const ctx = await requireContext()
  if (!can.edit(ctx.role)) {
    return { ctx, error: { ok: false as const, message: "Viewers cannot change records" } }
  }
  if (ids.length === 0) {
    return { ctx, error: { ok: false as const, message: "Nothing selected" } }
  }
  return { ctx, error: null }
}

const countWord = (n: number) => `${n} organisation${n === 1 ? "" : "s"}`

export async function bulkAssignOwner(ids: string[], userId: string): Promise<Result> {
  const { ctx, error } = await bulkGuard(ids)
  if (error) return error

  const db = await readDb()
  const target = db.profiles.find((p) => p.id === userId)
  const isMember = db.memberships.some(
    (m) => m.workspace_id === ctx.workspace.id && m.user_id === userId
  )
  if (!target || !isMember) {
    return { ok: false, message: "That person is not in this workspace" }
  }

  await mutate((d) => {
    for (const o of d.organisations) {
      if (o.workspace_id === ctx.workspace.id && ids.includes(o.id)) o.owner_id = userId
    }
    log(d, ctx.workspace.id, ctx.user.id, `gave ${countWord(ids.length)} to ${target.full_name}`)
  })

  revalidatePath("/organisations")
  return { ok: true, message: `${countWord(ids.length)} now owned by ${target.full_name}` }
}

export async function bulkAddTag(ids: string[], tag: string): Promise<Result> {
  const { ctx, error } = await bulkGuard(ids)
  if (error) return error
  const clean = tag.trim()
  if (!clean) return { ok: false, message: "Type a tag first" }

  await mutate((d) => {
    for (const o of d.organisations) {
      if (o.workspace_id === ctx.workspace.id && ids.includes(o.id)) {
        if (!o.tags.some((t) => t.toLowerCase() === clean.toLowerCase())) o.tags.push(clean)
      }
    }
    log(d, ctx.workspace.id, ctx.user.id, `tagged ${countWord(ids.length)} "${clean}"`)
  })

  revalidatePath("/organisations")
  return { ok: true, message: `Tagged ${countWord(ids.length)} "${clean}"` }
}

export async function bulkSetCategory(ids: string[], category: OrgCategory): Promise<Result> {
  const { ctx, error } = await bulkGuard(ids)
  if (error) return error

  await mutate((d) => {
    for (const o of d.organisations) {
      if (o.workspace_id === ctx.workspace.id && ids.includes(o.id)) o.category = category
    }
    log(d, ctx.workspace.id, ctx.user.id, `set ${countWord(ids.length)} to ${category}`)
  })

  revalidatePath("/organisations")
  return { ok: true, message: `${countWord(ids.length)} updated` }
}

export async function bulkDelete(ids: string[]): Promise<Result> {
  const ctx = await requireContext()
  if (!can.editWorkspace(ctx.role)) {
    return { ok: false, message: "Only owners and admins can delete records" }
  }
  if (ids.length === 0) return { ok: false, message: "Nothing selected" }

  const db = await readDb()
  const blocked = db.organisations.filter(
    (o) =>
      ids.includes(o.id) &&
      db.deals.some(
        (d) => d.organisation_id === o.id && !["won", "lost"].includes(d.stage)
      )
  )
  if (blocked.length > 0) {
    return {
      ok: false,
      message: `${blocked.map((b) => b.name).join(", ")} still ${blocked.length === 1 ? "has" : "have"} open deals. Close those first.`,
    }
  }

  await mutate((d) => {
    d.organisations = d.organisations.filter(
      (o) => !(o.workspace_id === ctx.workspace.id && ids.includes(o.id))
    )
    d.contacts = d.contacts.map((c) =>
      c.organisation_id && ids.includes(c.organisation_id)
        ? { ...c, organisation_id: undefined }
        : c
    )
    log(d, ctx.workspace.id, ctx.user.id, `deleted ${countWord(ids.length)}`)
  })

  revalidatePath("/organisations")
  return { ok: true, message: `${countWord(ids.length)} deleted. Their people were kept.` }
}

/** CSV of what is on screen. Returned as text so the browser can save it. */
export async function exportOrganisations(ids: string[]): Promise<{ filename: string; csv: string }> {
  const { workspace } = await requireContext()
  const db = await readDb()
  const rows = db.organisations.filter(
    (o) => o.workspace_id === workspace.id && (ids.length === 0 || ids.includes(o.id))
  )

  const cell = (v: string | number | undefined) => {
    const s = String(v ?? "")
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }

  const header = ["Name", "Type", "What they do", "Location", "Phone", "Email", "Tags", "Owner", "Open deals", "Open value"]
  const lines = rows.map((o) => {
    const open = db.deals.filter(
      (d) => d.organisation_id === o.id && !["won", "lost"].includes(d.stage)
    )
    return [
      o.name,
      o.category,
      o.what_they_do,
      o.location,
      o.phone,
      o.email,
      o.tags.join(" | "),
      db.profiles.find((p) => p.id === o.owner_id)?.full_name,
      open.length,
      open.reduce((s, d) => s + d.value, 0),
    ]
      .map(cell)
      .join(",")
  })

  return {
    filename: `${workspace.name.toLowerCase().replace(/\s+/g, "-")}-organisations.csv`,
    csv: [header.join(","), ...lines].join("\n"),
  }
}

export async function saveView(
  object: "organisations" | "people" | "deals",
  name: string,
  query: string,
  shared: boolean
): Promise<Result> {
  const { user, workspace, role } = await requireContext()
  const clean = name.trim()
  if (clean.length < 2) return { ok: false, message: "Give the view a name" }
  if (shared && !can.edit(role)) {
    return { ok: false, message: "Viewers can only save views for themselves" }
  }

  await mutate((db) => {
    db.views.push({
      id: newId(),
      workspace_id: workspace.id,
      user_id: user.id,
      object,
      name: clean,
      query,
      shared,
      created_at: now(),
    })
  })

  revalidatePath(`/${object}`)
  return { ok: true, message: `Saved "${clean}"${shared ? " for everyone" : ""}` }
}

export async function deleteView(viewId: string): Promise<Result> {
  const { user, workspace, role } = await requireContext()

  const db = await readDb()
  const view = db.views.find((v) => v.id === viewId && v.workspace_id === workspace.id)
  if (!view) return { ok: false, message: "That view is gone already" }
  if (view.user_id !== user.id && !can.editWorkspace(role)) {
    return { ok: false, message: "Only the person who saved it, or an admin, can remove it" }
  }

  await mutate((d) => {
    d.views = d.views.filter((v) => v.id !== viewId)
  })

  revalidatePath(`/${view.object}`)
  return { ok: true, message: `Removed "${view.name}"` }
}

/* ----------------------------------------------------------------- import */

export type ImportRow = {
  name: string
  category?: string
  what_they_do?: string
  location?: string
  phone?: string
  email?: string
  tags?: string
  contact_name?: string
  contact_title?: string
  contact_phone?: string
  contact_email?: string
}

export type ImportPlan = {
  /** Rows whose name already exists here. */
  duplicates: { row: number; name: string; existingId: string }[]
  /** Rows that repeat a name inside the file itself. */
  repeats: { row: number; name: string }[]
  newCount: number
  peopleCount: number
}

const CATEGORY_WORDS: Record<string, OrgCategory> = {
  supplier: "supplier",
  suppliers: "supplier",
  vendor: "supplier",
  client: "client",
  clients: "client",
  customer: "client",
  buyer: "client",
  partner: "partner",
  partners: "partner",
  prospect: "prospect",
  lead: "prospect",
  service: "service",
  contractor: "service",
}

const readCategory = (raw?: string): OrgCategory =>
  CATEGORY_WORDS[(raw ?? "").trim().toLowerCase()] ?? "prospect"

/** What would happen if we imported this. Nothing is written. */
export async function planImport(rows: ImportRow[]): Promise<ImportPlan> {
  const { workspace } = await requireContext()
  const db = await readDb()
  const existing = new Map(
    db.organisations
      .filter((o) => o.workspace_id === workspace.id)
      .map((o) => [o.name.trim().toLowerCase(), o.id])
  )

  const duplicates: ImportPlan["duplicates"] = []
  const repeats: ImportPlan["repeats"] = []
  const seen = new Set<string>()

  rows.forEach((r, i) => {
    const key = r.name.trim().toLowerCase()
    const hit = existing.get(key)
    if (hit) duplicates.push({ row: i, name: r.name, existingId: hit })
    else if (seen.has(key)) repeats.push({ row: i, name: r.name })
    seen.add(key)
  })

  return {
    duplicates,
    repeats,
    newCount: rows.length - duplicates.length - repeats.length,
    peopleCount: rows.filter((r) => (r.contact_name ?? "").length > 1).length,
  }
}

export type ImportResult = Result & {
  created: number
  updated: number
  skipped: number
  people: number
}

/**
 * Writes the rows. `onDuplicate` decides what happens to names that already
 * exist: leave them alone, or fill in blanks from the file without overwriting
 * anything already filled in.
 */
export async function importOrganisations(
  rows: ImportRow[],
  onDuplicate: "skip" | "fill"
): Promise<ImportResult> {
  const { user, workspace, role } = await requireContext()
  const blank = { created: 0, updated: 0, skipped: 0, people: 0 }
  if (!can.edit(role)) {
    return { ok: false, message: "Viewers cannot import", ...blank }
  }
  if (rows.length === 0) {
    return { ok: false, message: "Nothing to import", ...blank }
  }
  if (rows.length > 2000) {
    return { ok: false, message: "That is over 2,000 rows. Split the file and try again.", ...blank }
  }

  const counts = { ...blank }

  await mutate((db) => {
    const byName = new Map(
      db.organisations
        .filter((o) => o.workspace_id === workspace.id)
        .map((o) => [o.name.trim().toLowerCase(), o])
    )
    // Names that were here before this import started. A second row for a name
    // created *during* this import is not a duplicate — it is another person at
    // the same place, and their row still counts.
    const before = new Set(byName.keys())

    for (const row of rows) {
      const name = row.name.trim()
      if (name.length < 2) {
        counts.skipped++
        continue
      }

      const key = name.toLowerCase()
      let org = byName.get(key)

      if (org) {
        if (before.has(key)) {
          if (onDuplicate === "skip") {
            counts.skipped++
            continue
          }
          // Fill blanks only. What is already there was checked by a person.
          org.what_they_do ||= row.what_they_do
          org.location ||= row.location
          org.phone ||= row.phone
          org.email ||= row.email
          for (const t of (row.tags ?? "").split(/[,|;]/).map((s) => s.trim()).filter(Boolean)) {
            if (!org.tags.some((x) => x.toLowerCase() === t.toLowerCase())) org.tags.push(t)
          }
          counts.updated++
        }
      } else {
        org = {
          id: newId(),
          workspace_id: workspace.id,
          name,
          category: readCategory(row.category),
          what_they_do: row.what_they_do,
          location: row.location,
          phone: row.phone,
          email: row.email,
          owner_id: user.id,
          tags: (row.tags ?? "")
            .split(/[,|;]/)
            .map((s) => s.trim())
            .filter(Boolean),
          created_at: now(),
        }
        db.organisations.push(org)
        byName.set(key, org)
        counts.created++
      }

      const personName = (row.contact_name ?? "").trim()
      if (personName.length > 1) {
        const already = db.contacts.some(
          (c) =>
            c.workspace_id === workspace.id &&
            c.organisation_id === org!.id &&
            c.full_name.trim().toLowerCase() === personName.toLowerCase()
        )
        if (!already) {
          db.contacts.push({
            id: newId(),
            workspace_id: workspace.id,
            organisation_id: org.id,
            full_name: personName,
            title: row.contact_title,
            email: row.contact_email,
            phone: row.contact_phone,
            tags: [],
            owner_id: user.id,
            created_at: now(),
          })
          counts.people++
        }
      }
    }

    log(
      db,
      workspace.id,
      user.id,
      `imported ${counts.created} organisation${counts.created === 1 ? "" : "s"}` +
        (counts.updated ? ` and filled in ${counts.updated}` : "") +
        (counts.people ? ` with ${counts.people} people` : "")
    )
  })

  revalidatePath("/organisations")
  revalidatePath("/people")
  revalidatePath("/today")

  return {
    ok: true,
    message: `${counts.created} added${counts.updated ? `, ${counts.updated} filled in` : ""}${counts.skipped ? `, ${counts.skipped} left alone` : ""}`,
    ...counts,
  }
}

/* ------------------------------------------------------------------ merge */

/** How a stored value reads to a person, for the "not kept" line in the timeline. */
function readable(db: Database, key: string, value: string): string {
  if (key === "owner_id") return db.profiles.find((p) => p.id === value)?.full_name ?? value
  if (key === "organisation_id") return db.organisations.find((o) => o.id === value)?.name ?? value
  if (key === "category") return ORG_CATEGORY_LABEL[value as OrgCategory] ?? value
  if (key === "next_touch_at")
    return new Date(value).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })
  return value
}

const sameValue = (key: string, a: string, b: string) =>
  key === "phone" ? phoneKey(a) === phoneKey(b) : a.trim().toLowerCase() === b.trim().toLowerCase()

/**
 * Folds `from` into `into`, field by field. Blanks are filled from `from`.
 * Where both are filled in and differ, `into` wins unless the field is listed
 * in `take`. Returns the values that were dropped, so the timeline can say so.
 */
function foldFields<T extends Record<string, unknown>>(
  db: Database,
  into: T,
  from: T,
  fields: readonly (readonly [string, string])[],
  take: string[]
): string[] {
  const dropped: string[] = []
  for (const [key, label] of fields) {
    const mine = String(into[key] ?? "")
    const theirs = String(from[key] ?? "")
    if (!theirs) continue
    if (!mine) {
      ;(into as Record<string, unknown>)[key] = from[key]
    } else if (!sameValue(key, mine, theirs)) {
      const loser = take.includes(key) ? mine : theirs
      if (take.includes(key)) (into as Record<string, unknown>)[key] = from[key]
      dropped.push(`${label.toLowerCase()} "${readable(db, key, loser)}"`)
    }
  }
  return dropped
}

const joinTags = (a: string[], b: string[]) => [
  ...a,
  ...b.filter((t) => !a.some((x) => x.toLowerCase() === t.toLowerCase())),
]

/**
 * Two people who are one. Their deals and history move to the one that stays,
 * then the other is removed. Owners and admins only: it removes a record.
 */
export async function mergePeople(
  keepId: string,
  dropId: string,
  take: PersonField[]
): Promise<Result> {
  const { user, workspace, role } = await requireContext()
  if (!can.merge(role)) return { ok: false, message: "Only owners and admins can merge records" }
  if (keepId === dropId) return { ok: false, message: "Pick two different people" }

  const allowed = PERSON_FIELDS.map(([k]) => k as string)
  if (!take.every((f) => allowed.includes(f))) return { ok: false, message: "That merge asked for an unknown field" }

  const db = await readDb()
  const mine = (id: string) => db.contacts.find((c) => c.id === id && c.workspace_id === workspace.id)
  if (!mine(keepId) || !mine(dropId)) {
    return { ok: false, message: "One of these people is no longer here. Refresh and look again." }
  }

  const summary = await mutate((d) => {
    const keep = d.contacts.find((c) => c.id === keepId)!
    const drop = d.contacts.find((c) => c.id === dropId)!

    const dropped = foldFields(d, keep, drop, PERSON_FIELDS, take)
    keep.tags = joinTags(keep.tags, drop.tags)

    let moved = 0
    for (const deal of d.deals) {
      if (deal.contact_id === dropId) {
        deal.contact_id = keepId
        moved++
      }
    }
    for (const a of d.activities) if (a.contact_id === dropId) a.contact_id = keepId

    d.contacts = d.contacts.filter((c) => c.id !== dropId)
    d.not_duplicates = d.not_duplicates.filter((n) => n.a_id !== dropId && n.b_id !== dropId)

    log(
      d,
      workspace.id,
      user.id,
      `merged ${drop.full_name} into ${keep.full_name}` +
        (moved ? `, with ${moved} deal${moved === 1 ? "" : "s"}` : "") +
        (dropped.length ? `. Not kept: ${dropped.join(", ")}` : ""),
      { organisation_id: keep.organisation_id, contact_id: keepId }
    )
    return keep.full_name
  })

  revalidatePath("/people")
  revalidatePath("/people/duplicates")
  revalidatePath("/organisations", "layout")
  revalidatePath("/deals")
  revalidatePath("/today")
  return { ok: true, message: `Merged into ${summary}` }
}

/**
 * Two organisations that are one. Their people, deals and history move to the
 * one that stays, then the other is removed. Owners and admins only.
 */
export async function mergeOrganisations(
  keepId: string,
  dropId: string,
  take: OrgField[]
): Promise<Result> {
  const { user, workspace, role } = await requireContext()
  if (!can.merge(role)) return { ok: false, message: "Only owners and admins can merge records" }
  if (keepId === dropId) return { ok: false, message: "Pick two different organisations" }

  const allowed = ORG_FIELDS.map(([k]) => k as string)
  if (!take.every((f) => allowed.includes(f))) return { ok: false, message: "That merge asked for an unknown field" }

  const db = await readDb()
  const mine = (id: string) => db.organisations.find((o) => o.id === id && o.workspace_id === workspace.id)
  if (!mine(keepId) || !mine(dropId)) {
    return { ok: false, message: "One of these organisations is no longer here. Refresh and look again." }
  }

  const summary = await mutate((d) => {
    const keep = d.organisations.find((o) => o.id === keepId)!
    const drop = d.organisations.find((o) => o.id === dropId)!

    const dropped = foldFields(d, keep, drop, ORG_FIELDS, take)
    keep.tags = joinTags(keep.tags, drop.tags)

    const moved = { people: 0, deals: 0 }
    for (const c of d.contacts) {
      if (c.organisation_id === dropId) {
        c.organisation_id = keepId
        moved.people++
      }
    }
    for (const deal of d.deals) {
      if (deal.organisation_id === dropId) {
        deal.organisation_id = keepId
        moved.deals++
      }
    }
    for (const a of d.activities) if (a.organisation_id === dropId) a.organisation_id = keepId

    d.organisations = d.organisations.filter((o) => o.id !== dropId)
    d.not_duplicates = d.not_duplicates.filter((n) => n.a_id !== dropId && n.b_id !== dropId)

    const brought = [
      moved.people ? `${moved.people} ${moved.people === 1 ? "person" : "people"}` : "",
      moved.deals ? `${moved.deals} deal${moved.deals === 1 ? "" : "s"}` : "",
    ].filter(Boolean)

    log(
      d,
      workspace.id,
      user.id,
      `merged ${drop.name} into ${keep.name}` +
        (brought.length ? `, with ${brought.join(" and ")}` : "") +
        (dropped.length ? `. Not kept: ${dropped.join(", ")}` : ""),
      { organisation_id: keepId }
    )
    return keep.name
  })

  revalidatePath("/organisations", "layout")
  revalidatePath("/people", "layout")
  revalidatePath("/deals")
  revalidatePath("/today")
  return { ok: true, message: `Merged into ${summary}` }
}

/** "These two are different people." The pair is never suggested again. */
export async function markNotDuplicate(
  object: "people" | "organisations",
  aId: string,
  bId: string
): Promise<Result & { id?: string }> {
  const { user, workspace, role } = await requireContext()
  if (!can.merge(role)) return { ok: false, message: "Only owners and admins can review duplicates" }
  if (aId === bId) return { ok: false, message: "Pick two different records" }

  const db = await readDb()
  const rows: { id: string; workspace_id: string }[] =
    object === "people" ? db.contacts : db.organisations
  const here = (id: string) => rows.some((r) => r.id === id && r.workspace_id === workspace.id)
  if (!here(aId) || !here(bId)) {
    return { ok: false, message: "One of these is no longer here. Refresh and look again." }
  }

  const id = await mutate((d) => {
    const key = pairKey(aId, bId)
    const existing = d.not_duplicates.find(
      (n) => n.workspace_id === workspace.id && pairKey(n.a_id, n.b_id) === key
    )
    if (existing) return existing.id
    const row = {
      id: newId(),
      workspace_id: workspace.id,
      object,
      a_id: aId,
      b_id: bId,
      marked_by: user.id,
      created_at: now(),
    }
    d.not_duplicates.push(row)
    return row.id
  })

  revalidatePath(`/${object}`, "layout")
  return { ok: true, message: "Marked as different. It will not be suggested again.", id }
}

/** Undo for the toast. */
export async function unmarkNotDuplicate(id: string): Promise<Result> {
  const { workspace, role } = await requireContext()
  if (!can.merge(role)) return { ok: false, message: "Only owners and admins can review duplicates" }

  const db = await readDb()
  const row = db.not_duplicates.find((n) => n.id === id && n.workspace_id === workspace.id)
  if (!row) return { ok: false, message: "That is already undone" }

  await mutate((d) => {
    d.not_duplicates = d.not_duplicates.filter((n) => n.id !== id)
  })

  revalidatePath(`/${row.object}`, "layout")
  return { ok: true, message: "Back in the list" }
}
