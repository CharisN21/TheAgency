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
import { z } from "zod"

import { askForJson } from "@/lib/ai/claude"
import { isPublicKeyJwk } from "@/lib/crypto/e2ee"
import { actorName, notify } from "./notify"
import { log, mutate, newId, newToken, readDb, resetDb } from "./store"
import {
  ACTIVITY_LABEL,
  can,
  ORG_CATEGORY_LABEL,
  STAGES,
  stageOf,
  type ActivityType,
  type Database,
  type Channel,
  type OrgCategory,
  type Role,
  type StageId,
  PRIORITY_LABEL,
  TASK_STATUS,
  CADENCE_DAYS,
  HEALTH,
  type Cadence,
  type ProjectHealth,
  PERIOD_LABEL,
  periodStart,
  type ObjectivePeriod,
  SEVERITY,
  type FlagSeverity,
  NOTIFICATION_LABEL,
  type NotificationType,
  type SuggestedMilestone,
  type SuggestedRole,
  FIELD_OBJECT_LABEL,
  FIELD_TYPE_LABEL,
  type CustomField,
  type FieldObject,
  type FieldType,
  type Priority,
  type TaskStatus,
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
    notify(d, {
      workspace_id: i.workspace_id,
      user_id: i.invited_by,
      actor_id: user.id,
      type: "invite_accepted",
      title: `${actorName(d, user.id)} accepted your invite and joined`,
      href: "/team",
    })
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
            href: `/people/${c.id}`,
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
    notify(d, {
      workspace_id: workspace.id,
      user_id: target.owner_id,
      actor_id: user.id,
      type: "deal_moved",
      title: `${actorName(d, user.id)} moved ${target.title} to ${to}`,
      href: `/deals/${dealId}`,
    })
  })

  revalidatePath("/deals", "layout")
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

  const db = await readDb()
  const deal = db.deals.find((x) => x.id === dealId && x.workspace_id === workspace.id)
  if (!deal) return { ok: false, message: "That deal is not here" }

  const title = str(formData, "title")
  if (formData.has("title") && title.length < 2) return { ok: false, message: "Give the deal a name" }
  const rawValue = str(formData, "value")
  const value = Number(rawValue.replace(/[^0-9.]/g, ""))
  if (rawValue && (!Number.isFinite(value) || value <= 0)) {
    return { ok: false, message: "Put in what it is worth, in shillings" }
  }

  // The person must work at the deal's organisation; the owner must be in this workspace.
  const contactId = str(formData, "contact_id")
  if (
    contactId &&
    !db.contacts.some(
      (c) => c.id === contactId && c.workspace_id === workspace.id && c.organisation_id === deal.organisation_id
    )
  ) {
    return { ok: false, message: "That person is not at this organisation" }
  }
  const ownerId = str(formData, "owner_id")
  if (ownerId && !db.memberships.some((m) => m.user_id === ownerId && m.workspace_id === workspace.id)) {
    return { ok: false, message: "The owner has to be someone in this workspace" }
  }

  await mutate((d) => {
    const x = d.deals.find((y) => y.id === dealId)!
    if (title) x.title = title
    if (rawValue) x.value = Math.round(value)
    if (formData.has("expected_close")) x.expected_close = str(formData, "expected_close") || undefined
    if (formData.has("contact_id")) x.contact_id = contactId || undefined
    const handedOver = Boolean(ownerId && ownerId !== x.owner_id)
    if (ownerId) x.owner_id = ownerId
    if (handedOver) {
      notify(d, {
        workspace_id: workspace.id,
        user_id: ownerId,
        actor_id: user.id,
        type: "deal_assigned",
        title: `${actorName(d, user.id)} handed you ${x.title}`,
        href: `/deals/${dealId}`,
      })
    }
    log(d, workspace.id, user.id, `updated ${x.title}`, {
      organisation_id: x.organisation_id,
      deal_id: dealId,
    })
  })

  revalidatePath("/deals", "layout")
  revalidatePath("/today")
  if (deal.organisation_id) revalidatePath(`/organisations/${deal.organisation_id}`)
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
  if (!(type in ACTIVITY_LABEL) || type === "system") return { ok: false, message: "Pick what kind of contact it was" }

  // Everything it points at must be in this workspace.
  const db = await readDb()
  const inHere = (rows: { id: string; workspace_id: string }[], id?: string) =>
    !id || rows.some((r) => r.id === id && r.workspace_id === workspace.id)
  if (!inHere(db.organisations, organisation_id) || !inHere(db.contacts, contact_id) || !inHere(db.deals, deal_id)) {
    return { ok: false, message: "That record is not in this workspace" }
  }

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
  if (deal_id) revalidatePath(`/deals/${deal_id}`)
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
    notify(d, {
      workspace_id: ctx.workspace.id,
      user_id: userId,
      actor_id: ctx.user.id,
      type: "records_assigned",
      title: `${actorName(d, ctx.user.id)} handed you ${countWord(ids.length)}`,
      href: `/organisations?owner=${userId}`,
    })
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

/* ------------------------------------------------------------------ tasks */

/** Where a task notification takes you: its project, deal or organisation, else their list. */
function taskHref(
  t: { project_id?: string; deal_id?: string; organisation_id?: string },
  assigneeId: string
) {
  if (t.project_id) return `/projects/${t.project_id}`
  if (t.deal_id) return `/deals/${t.deal_id}`
  if (t.organisation_id) return `/organisations/${t.organisation_id}`
  return `/team/${assigneeId}`
}

function revalidateWork() {
  revalidatePath("/team", "layout")
  revalidatePath("/projects", "layout")
  revalidatePath("/deals", "layout")
  revalidatePath("/organisations", "layout")
  revalidatePath("/today")
}

/**
 * Checks the parts of a task that point elsewhere: the person it is for must
 * be able to work in this workspace, and every linked record must be here.
 */
function checkTaskLinks(
  db: Database,
  workspaceId: string,
  f: { assignee_id?: string; project_id?: string; organisation_id?: string; deal_id?: string; contact_id?: string }
): string | null {
  if (f.assignee_id) {
    const m = db.memberships.find((x) => x.workspace_id === workspaceId && x.user_id === f.assignee_id)
    if (!m) return "The task has to be for someone in this workspace"
    if (m.role === "viewer") return "Viewers cannot take tasks. Change their role first."
  }
  const here = (rows: { id: string; workspace_id: string }[], id?: string) =>
    !id || rows.some((r) => r.id === id && r.workspace_id === workspaceId)
  if (!here(db.projects, f.project_id)) return "That project is not in this workspace"
  if (f.project_id && db.projects.find((p) => p.id === f.project_id)?.status === "closed") {
    return "That project is closed"
  }
  if (!here(db.organisations, f.organisation_id) || !here(db.deals, f.deal_id) || !here(db.contacts, f.contact_id)) {
    return "That record is not in this workspace"
  }
  return null
}

export async function createTask(formData: FormData): Promise<Result> {
  const { user, workspace, role } = await requireContext()
  if (!can.edit(role)) return { ok: false, message: "Viewers cannot add tasks" }

  const title = str(formData, "title")
  if (title.length < 2) return { ok: false, message: "Say what needs doing" }
  const priority = (str(formData, "priority") || "medium") as Priority
  if (!(priority in PRIORITY_LABEL)) return { ok: false, message: "Pick a priority" }
  const due = str(formData, "due_at")
  if (due && Number.isNaN(Date.parse(due))) return { ok: false, message: "That due date is not a date" }

  const db = await readDb()
  // A deal brings its organisation along, so the task shows on both.
  const deal_id = str(formData, "deal_id") || undefined
  const deal = db.deals.find((d) => d.id === deal_id && d.workspace_id === workspace.id)
  const links = {
    assignee_id: str(formData, "assignee_id") || user.id,
    project_id: str(formData, "project_id") || undefined,
    deal_id,
    organisation_id: str(formData, "organisation_id") || deal?.organisation_id || undefined,
    contact_id: str(formData, "contact_id") || undefined,
  }
  const problem = checkTaskLinks(db, workspace.id, links)
  if (problem) return { ok: false, message: problem }

  const forName = db.profiles.find((p) => p.id === links.assignee_id)?.full_name ?? "someone"

  await mutate((d) => {
    d.tasks.push({
      id: newId(),
      workspace_id: workspace.id,
      title,
      notes: str(formData, "notes") || undefined,
      status: "todo",
      priority,
      due_at: due || undefined,
      created_by: user.id,
      created_at: now(),
      ...links,
    })
    notify(d, {
      workspace_id: workspace.id,
      user_id: links.assignee_id,
      actor_id: user.id,
      type: "task_assigned",
      title: `${actorName(d, user.id)} gave you a task: ${title}`,
      href: taskHref(links, links.assignee_id),
    })
    if (links.deal_id || links.organisation_id) {
      log(d, workspace.id, user.id, `added a task for ${forName}: ${title}`, {
        organisation_id: links.organisation_id,
        deal_id: links.deal_id,
      })
    }
  })

  revalidateWork()
  return {
    ok: true,
    message: links.assignee_id === user.id ? "Task added" : `Task added for ${forName.split(" ")[0]}`,
  }
}

export async function setTaskStatus(taskId: string, status: TaskStatus): Promise<Result> {
  const { user, workspace, role } = await requireContext()
  if (!can.edit(role)) return { ok: false, message: "Viewers cannot change tasks" }
  if (!(status in TASK_STATUS)) return { ok: false, message: "That is not a status" }

  const db = await readDb()
  const task = db.tasks.find((t) => t.id === taskId && t.workspace_id === workspace.id)
  if (!task) return { ok: false, message: "That task is not here" }
  if (task.status === status) return { ok: true, message: "" }

  await mutate((d) => {
    const t = d.tasks.find((x) => x.id === taskId)!
    t.status = status
    t.completed_at = status === "done" ? now() : undefined
    if (status === "done") {
      notify(d, {
        workspace_id: workspace.id,
        user_id: t.created_by,
        actor_id: user.id,
        type: "task_done",
        title: `${actorName(d, user.id)} finished ${t.title}`,
        href: taskHref(t, t.assignee_id),
      })
    }
    if (status === "done" && (t.deal_id || t.organisation_id)) {
      log(d, workspace.id, user.id, `finished: ${t.title}`, {
        organisation_id: t.organisation_id,
        deal_id: t.deal_id,
      })
    }
  })

  revalidateWork()
  return { ok: true, message: status === "done" ? "Done" : `Moved to ${TASK_STATUS[status].label.toLowerCase()}` }
}

export async function updateTask(taskId: string, formData: FormData): Promise<Result> {
  const { user, workspace, role } = await requireContext()
  if (!can.edit(role)) return { ok: false, message: "Viewers cannot change tasks" }

  const db = await readDb()
  const task = db.tasks.find((t) => t.id === taskId && t.workspace_id === workspace.id)
  if (!task) return { ok: false, message: "That task is not here" }

  const title = str(formData, "title")
  if (title.length < 2) return { ok: false, message: "Say what needs doing" }
  const priority = (str(formData, "priority") || task.priority) as Priority
  if (!(priority in PRIORITY_LABEL)) return { ok: false, message: "Pick a priority" }
  const due = str(formData, "due_at")
  if (due && Number.isNaN(Date.parse(due))) return { ok: false, message: "That due date is not a date" }
  const assignee_id = str(formData, "assignee_id") || task.assignee_id
  const problem = checkTaskLinks(db, workspace.id, { assignee_id })
  if (problem) return { ok: false, message: problem }

  await mutate((d) => {
    const t = d.tasks.find((x) => x.id === taskId)!
    t.title = title
    t.priority = priority
    t.due_at = due || undefined
    if (t.assignee_id !== assignee_id) {
      notify(d, {
        workspace_id: workspace.id,
        user_id: assignee_id,
        actor_id: user.id,
        type: "task_assigned",
        title: `${actorName(d, user.id)} gave you a task: ${title}`,
        href: taskHref(t, assignee_id),
      })
    }
    t.assignee_id = assignee_id
    t.notes = str(formData, "notes") || undefined
  })

  revalidateWork()
  return { ok: true, message: "Saved" }
}

export async function deleteTask(taskId: string): Promise<Result> {
  const { user, workspace, role } = await requireContext()
  const db = await readDb()
  const task = db.tasks.find((t) => t.id === taskId && t.workspace_id === workspace.id)
  if (!task) return { ok: false, message: "That task is gone already" }
  if (task.created_by !== user.id && !can.editWorkspace(role)) {
    return { ok: false, message: "Only the person who added it, or an admin, can remove it" }
  }

  await mutate((d) => {
    d.tasks = d.tasks.filter((t) => t.id !== taskId)
  })

  revalidateWork()
  return { ok: true, message: "Task removed" }
}

/* --------------------------------------------------------------- projects */

/** Reads the project form and checks everything it points at. */
function readProjectForm(db: Database, workspaceId: string, formData: FormData, fallbackLead: string) {
  const name = str(formData, "name")
  if (name.length < 2) return { error: "Give the project a name" }
  const cadence = (str(formData, "cadence") || "weekly") as Cadence
  if (!(cadence in CADENCE_DAYS)) return { error: "Pick how often to check in" }
  const due = str(formData, "due_at")
  if (due && Number.isNaN(Date.parse(due))) return { error: "That end date is not a date" }

  const lead_id = str(formData, "lead_id") || fallbackLead
  const member_ids = [
    ...new Set([lead_id, ...formData.getAll("member_ids").map(String).filter(Boolean)]),
  ]
  for (const id of member_ids) {
    const problem = checkTaskLinks(db, workspaceId, { assignee_id: id })
    if (problem) return { error: problem.replace("The task has to be for", "Everyone on it has to be") }
  }

  const deal_id = str(formData, "deal_id") || undefined
  const deal = db.deals.find((d) => d.id === deal_id && d.workspace_id === workspaceId)
  const organisation_id = str(formData, "organisation_id") || deal?.organisation_id || undefined
  const problem = checkTaskLinks(db, workspaceId, { organisation_id, deal_id })
  if (problem) return { error: problem }

  return {
    fields: {
      name,
      scope: str(formData, "scope") || undefined,
      cadence,
      due_at: due || undefined,
      lead_id,
      member_ids,
      organisation_id,
      deal_id,
    },
  }
}

export async function createProject(formData: FormData): Promise<Result & { id?: string }> {
  const { user, workspace, role } = await requireContext()
  if (!can.edit(role)) return { ok: false, message: "Viewers cannot start projects" }

  const db = await readDb()
  const read = readProjectForm(db, workspace.id, formData, user.id)
  if ("error" in read) return { ok: false, message: read.error! }

  const id = newId()
  await mutate((d) => {
    d.projects.push({
      id,
      workspace_id: workspace.id,
      ...read.fields!,
      status: "active",
      health: "on_track",
      created_at: now(),
    })
    log(d, workspace.id, user.id, `started the project ${read.fields!.name}`, {
      organisation_id: read.fields!.organisation_id,
      deal_id: read.fields!.deal_id,
    })
  })

  revalidateWork()
  return { ok: true, message: `${read.fields.name} started`, id }
}

export async function updateProject(projectId: string, formData: FormData): Promise<Result> {
  const { workspace, role } = await requireContext()
  if (!can.edit(role)) return { ok: false, message: "Viewers cannot change projects" }

  const db = await readDb()
  const project = db.projects.find((p) => p.id === projectId && p.workspace_id === workspace.id)
  if (!project) return { ok: false, message: "That project is not here" }
  const read = readProjectForm(db, workspace.id, formData, project.lead_id)
  if ("error" in read) return { ok: false, message: read.error! }

  await mutate((d) => {
    const p = d.projects.find((x) => x.id === projectId)!
    Object.assign(p, read.fields)
  })

  revalidateWork()
  return { ok: true, message: "Saved" }
}

export async function setProjectHealth(projectId: string, health: ProjectHealth): Promise<Result> {
  const { user, workspace, role } = await requireContext()
  if (!can.edit(role)) return { ok: false, message: "Viewers cannot change projects" }
  if (!(health in HEALTH)) return { ok: false, message: "That is not a status" }

  const db = await readDb()
  const project = db.projects.find((p) => p.id === projectId && p.workspace_id === workspace.id)
  if (!project) return { ok: false, message: "That project is not here" }
  if (project.health === health) return { ok: true, message: "" }

  await mutate((d) => {
    const p = d.projects.find((x) => x.id === projectId)!
    p.health = health
    log(d, workspace.id, user.id, `marked ${p.name} ${HEALTH[health].label.toLowerCase()}`, {
      organisation_id: p.organisation_id,
      deal_id: p.deal_id,
    })
  })

  revalidateWork()
  return { ok: true, message: `${project.name}: ${HEALTH[health].label.toLowerCase()}` }
}

/* ------------------------------------------------------------- objectives */

/** Objectives are personal: you set your own, and owners and admins set anyone's. */
function mayTouchObjectives(role: Role, userId: string, ownerId: string) {
  return can.edit(role) && (userId === ownerId || can.editWorkspace(role))
}

const MEASURES = ["number", "money", "done", "won"] as const

export async function createObjective(formData: FormData): Promise<Result> {
  const { user, workspace, role } = await requireContext()
  const owner_id = str(formData, "owner_id") || user.id
  if (!mayTouchObjectives(role, user.id, owner_id)) {
    return { ok: false, message: "You can set your own objectives. Owners and admins can set anyone's." }
  }

  const db = await readDb()
  const member = db.memberships.find((m) => m.workspace_id === workspace.id && m.user_id === owner_id)
  if (!member || member.role === "viewer") return { ok: false, message: "Objectives are for people who can work in this workspace" }

  const title = str(formData, "title")
  if (title.length < 2) return { ok: false, message: "Say what the objective is" }
  const period = str(formData, "period") as ObjectivePeriod
  if (!(period in PERIOD_LABEL)) return { ok: false, message: "Pick the week, the month or the year" }
  const measure = str(formData, "measure") as (typeof MEASURES)[number]
  if (!MEASURES.includes(measure)) return { ok: false, message: "Pick how it is measured" }
  const target = Number(str(formData, "target").replace(/[^0-9.]/g, ""))
  if (measure !== "done" && (!Number.isFinite(target) || target <= 0)) {
    return { ok: false, message: "Give it a target above zero" }
  }

  await mutate((d) => {
    d.objectives.push({
      id: newId(),
      workspace_id: workspace.id,
      owner_id,
      set_by: user.id,
      title,
      period,
      period_start: periodStart(period),
      measure,
      target: measure === "done" ? undefined : Math.round(target),
      progress: 0,
      done: false,
      created_at: now(),
    })
  })

  revalidatePath(`/team/${owner_id}`)
  return { ok: true, message: `Added for ${PERIOD_LABEL[period].toLowerCase()}` }
}

/** Progress typed in by the person, or done / not done. Counted objectives cannot be set by hand. */
export async function updateObjective(
  objectiveId: string,
  change: { progress?: number; done?: boolean }
): Promise<Result> {
  const { user, workspace, role } = await requireContext()
  const db = await readDb()
  const o = db.objectives.find((x) => x.id === objectiveId && x.workspace_id === workspace.id)
  if (!o) return { ok: false, message: "That objective is not here" }
  if (!mayTouchObjectives(role, user.id, o.owner_id)) return { ok: false, message: "That is someone else's objective" }
  if (o.measure === "won") return { ok: false, message: "This one counts itself from won deals" }
  if (change.progress !== undefined && (!Number.isFinite(change.progress) || change.progress < 0)) {
    return { ok: false, message: "Progress has to be zero or more" }
  }

  await mutate((d) => {
    const x = d.objectives.find((y) => y.id === objectiveId)!
    if (change.progress !== undefined) x.progress = Math.round(change.progress)
    if (change.done !== undefined) x.done = change.done
  })

  revalidatePath(`/team/${o.owner_id}`)
  return { ok: true, message: change.done ? "Marked done" : change.done === false ? "Marked not done" : "Progress saved" }
}

export async function deleteObjective(objectiveId: string): Promise<Result> {
  const { user, workspace, role } = await requireContext()
  const db = await readDb()
  const o = db.objectives.find((x) => x.id === objectiveId && x.workspace_id === workspace.id)
  if (!o) return { ok: false, message: "That objective is gone already" }
  if (!mayTouchObjectives(role, user.id, o.owner_id)) return { ok: false, message: "That is someone else's objective" }

  await mutate((d) => {
    d.objectives = d.objectives.filter((x) => x.id !== objectiveId)
  })

  revalidatePath(`/team/${o.owner_id}`)
  return { ok: true, message: "Objective removed" }
}

/* -------------------------------------------------------------- check-ins */

/**
 * Posts a check-in. The people on the project write them, and owners and
 * admins can too. Posting sets the project's health and restarts the clock.
 */
export async function postCheckIn(projectId: string, formData: FormData): Promise<Result> {
  const { user, workspace, role } = await requireContext()
  if (!can.edit(role)) return { ok: false, message: "Viewers cannot post check-ins" }

  const db = await readDb()
  const project = db.projects.find((p) => p.id === projectId && p.workspace_id === workspace.id)
  if (!project) return { ok: false, message: "That project is not here" }
  if (project.status === "closed") return { ok: false, message: "That project is closed" }
  if (!project.member_ids.includes(user.id) && !can.editWorkspace(role)) {
    return { ok: false, message: "Only the people on the project, or an admin, can check in" }
  }

  const moved = str(formData, "moved")
  const stuck = str(formData, "stuck")
  const next = str(formData, "next")
  if (!moved && !stuck && !next) return { ok: false, message: "Write at least one of the three" }
  if ([moved, stuck, next].some((t) => t.length > 4000)) return { ok: false, message: "Keep each part under 4,000 characters" }
  const progress = Number(str(formData, "progress"))
  if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
    return { ok: false, message: "Progress is a number from 0 to 100" }
  }
  const health = (str(formData, "health") || project.health) as ProjectHealth
  if (!(health in HEALTH)) return { ok: false, message: "Pick on track, at risk or blocked" }

  await mutate((d) => {
    d.check_ins.push({
      id: newId(),
      workspace_id: workspace.id,
      project_id: projectId,
      author_id: user.id,
      moved,
      stuck,
      next,
      progress: Math.round(progress),
      risks: str(formData, "risks") || undefined,
      health,
      created_at: now(),
    })
    const p = d.projects.find((x) => x.id === projectId)!
    p.health = health
    log(d, workspace.id, user.id, `checked in on ${p.name}: ${Math.round(progress)}%, ${HEALTH[health].label.toLowerCase()}`, {
      organisation_id: p.organisation_id,
      deal_id: p.deal_id,
    })
    for (const member of new Set([p.lead_id, ...p.member_ids])) {
      notify(d, {
        workspace_id: workspace.id,
        user_id: member,
        actor_id: user.id,
        type: "check_in_posted",
        title: `${actorName(d, user.id)} checked in on ${p.name}`,
        href: `/projects/${p.id}`,
      })
    }
  })

  revalidateWork()
  return { ok: true, message: "Check-in posted" }
}

/* ------------------------------------------------------------------ flags */
// Flags are private. None of these write to the activity timeline, and every
// one of them checks can.seeFlag before touching an existing flag.

export async function raiseFlag(formData: FormData): Promise<Result & { id?: string }> {
  const { user, workspace, role } = await requireContext()
  if (!can.edit(role)) return { ok: false, message: "Viewers cannot raise flags" }

  const severity = str(formData, "severity") as FlagSeverity
  if (!(severity in SEVERITY)) return { ok: false, message: "Pick note, warning or serious" }
  const situation = str(formData, "situation")
  const behaviour = str(formData, "behaviour")
  const impact = str(formData, "impact")
  for (const [label, text] of [["situation", situation], ["what happened", behaviour], ["effect", impact]]) {
    if (text.length < 3) return { ok: false, message: `Describe the ${label} in a few words` }
    if (text.length > 1000) return { ok: false, message: `Keep the ${label} under 1,000 characters` }
  }

  const db = await readDb()
  const about_user_id = str(formData, "about_user_id") || undefined
  if (about_user_id) {
    if (about_user_id === user.id) return { ok: false, message: "A flag is about someone else. Keep your own notes in a task." }
    if (!db.memberships.some((m) => m.workspace_id === workspace.id && m.user_id === about_user_id)) {
      return { ok: false, message: "That person is not in this workspace" }
    }
  }
  const project_id = str(formData, "project_id") || undefined
  const task_id = str(formData, "task_id") || undefined
  const here = (rows: { id: string; workspace_id: string }[], id?: string) =>
    !id || rows.some((r) => r.id === id && r.workspace_id === workspace.id)
  if (!here(db.projects, project_id) || !here(db.tasks, task_id)) {
    return { ok: false, message: "That record is not in this workspace" }
  }
  if (!about_user_id && !project_id && !task_id) {
    return { ok: false, message: "Say who or what the flag is about" }
  }

  const id = newId()
  await mutate((d) => {
    d.flags.push({
      id,
      workspace_id: workspace.id,
      raised_by: user.id,
      about_user_id,
      project_id,
      task_id,
      severity,
      situation,
      behaviour,
      impact,
      status: "open",
      created_at: now(),
    })
  })

  revalidatePath("/flags", "layout")
  revalidatePath("/team", "layout")
  return { ok: true, message: "Flag raised. Only you and owners and admins can see it.", id }
}

/** After the conversation: what was said and the one change agreed. Closes the flag. */
export async function logFlagConversation(flagId: string, formData: FormData): Promise<Result> {
  const { user, workspace, role } = await requireContext()
  if (!can.edit(role)) return { ok: false, message: "Viewers cannot change flags" }
  const db = await readDb()
  const f = db.flags.find((x) => x.id === flagId && x.workspace_id === workspace.id)
  if (!f || !can.seeFlag(role, user.id, f)) return { ok: false, message: "That flag is not here" }

  const conversation = str(formData, "conversation")
  const agreed_change = str(formData, "agreed_change")
  if (agreed_change.length < 3) return { ok: false, message: "Write down the one change you agreed" }
  if (conversation.length > 4000 || agreed_change.length > 1000) {
    return { ok: false, message: "That is too long to keep" }
  }

  await mutate((d) => {
    const x = d.flags.find((y) => y.id === flagId)!
    x.conversation = conversation || undefined
    x.agreed_change = agreed_change
    x.talked_at = now()
    x.status = "closed"
  })

  revalidatePath("/flags", "layout")
  revalidatePath("/team", "layout")
  return { ok: true, message: "Conversation logged. The flag is closed." }
}

export async function reopenFlag(flagId: string): Promise<Result> {
  const { user, workspace, role } = await requireContext()
  if (!can.edit(role)) return { ok: false, message: "Viewers cannot change flags" }
  const db = await readDb()
  const f = db.flags.find((x) => x.id === flagId && x.workspace_id === workspace.id)
  if (!f || !can.seeFlag(role, user.id, f)) return { ok: false, message: "That flag is not here" }

  await mutate((d) => {
    d.flags.find((y) => y.id === flagId)!.status = "open"
  })

  revalidatePath("/flags", "layout")
  revalidatePath("/team", "layout")
  return { ok: true, message: "Flag reopened" }
}

export async function deleteFlag(flagId: string): Promise<Result> {
  const { user, workspace, role } = await requireContext()
  const db = await readDb()
  const f = db.flags.find((x) => x.id === flagId && x.workspace_id === workspace.id)
  if (!f || !can.seeFlag(role, user.id, f)) return { ok: false, message: "That flag is not here" }
  if (f.raised_by !== user.id && !can.editWorkspace(role)) {
    return { ok: false, message: "Only the person who raised it, or an admin, can remove it" }
  }

  await mutate((d) => {
    d.flags = d.flags.filter((y) => y.id !== flagId)
  })

  revalidatePath("/flags", "layout")
  revalidatePath("/team", "layout")
  redirect("/flags")
}

/* ----------------------------------------------------- close and reopen */

const lines = (formData: FormData, key: string) =>
  formData
    .getAll(key)
    .map((v) => String(v).trim())
    .filter(Boolean)
    .slice(0, 30)

/**
 * Closes a project with its retrospective. The lead, or an owner or admin,
 * does it. Open tasks stay on people's lists unless the closer marks them done.
 */
export async function closeProject(projectId: string, formData: FormData): Promise<Result> {
  const { user, workspace, role } = await requireContext()
  if (!can.edit(role)) return { ok: false, message: "Viewers cannot close projects" }

  const db = await readDb()
  const project = db.projects.find((p) => p.id === projectId && p.workspace_id === workspace.id)
  if (!project) return { ok: false, message: "That project is not here" }
  if (project.status === "closed") return { ok: false, message: "That project is closed already" }
  if (project.lead_id !== user.id && !can.editWorkspace(role)) {
    return { ok: false, message: "Only the lead, or an owner or admin, can close a project" }
  }

  const went_well = lines(formData, "went_well")
  const went_wrong = lines(formData, "went_wrong")
  const lessons = lines(formData, "lessons")
  if (went_well.length + went_wrong.length + lessons.length === 0) {
    return { ok: false, message: "Note at least one thing before closing" }
  }
  if ([...went_well, ...went_wrong, ...lessons].some((l) => l.length > 500)) {
    return { ok: false, message: "Keep each line under 500 characters" }
  }
  const finishOpen = str(formData, "finish_open") === "1"

  await mutate((d) => {
    const p = d.projects.find((x) => x.id === projectId)!
    p.status = "closed"
    p.closed_at = now()
    if (finishOpen) {
      for (const t of d.tasks) {
        if (t.project_id === projectId && t.status !== "done") {
          t.status = "done"
          t.completed_at = now()
        }
      }
    }
    d.retrospectives = d.retrospectives.filter((r) => r.project_id !== projectId)
    d.retrospectives.push({
      id: newId(),
      workspace_id: workspace.id,
      project_id: projectId,
      written_by: user.id,
      went_well,
      went_wrong,
      lessons,
      created_at: now(),
    })
    log(d, workspace.id, user.id, `closed the project ${p.name}`, {
      organisation_id: p.organisation_id,
      deal_id: p.deal_id,
    })
  })

  revalidateWork()
  return { ok: true, message: `${project.name} closed. The lessons are kept.` }
}

/** Owners and admins can reopen a closed project. The retrospective is kept. */
export async function reopenProject(projectId: string): Promise<Result> {
  const { user, workspace, role } = await requireContext()
  if (!can.editWorkspace(role)) return { ok: false, message: "Only owners and admins can reopen a project" }

  const db = await readDb()
  const project = db.projects.find((p) => p.id === projectId && p.workspace_id === workspace.id)
  if (!project) return { ok: false, message: "That project is not here" }
  if (project.status === "active") return { ok: true, message: "" }

  await mutate((d) => {
    const p = d.projects.find((x) => x.id === projectId)!
    p.status = "active"
    p.closed_at = undefined
    log(d, workspace.id, user.id, `reopened the project ${p.name}`, {
      organisation_id: p.organisation_id,
      deal_id: p.deal_id,
    })
  })

  revalidateWork()
  return { ok: true, message: `${project.name} reopened` }
}

/* ----------------------------------------------------------------- Claude */
// Claude suggests; people decide. Nothing Claude returns is written until a
// person accepts it, line by line. Private flags are never sent to Claude.

const firstName = (full?: string) => full?.split(" ")[0] ?? "Someone"

/** The lead, or an owner or admin, on an active project in this workspace. */
async function projectForLead(projectId: string) {
  const ctx = await requireContext()
  const db = await readDb()
  const project = db.projects.find((p) => p.id === projectId && p.workspace_id === ctx.workspace.id)
  if (!project) return { error: "That project is not here" }
  if (!can.edit(ctx.role) || (project.lead_id !== ctx.user.id && !can.editWorkspace(ctx.role))) {
    return { error: "Only the lead, or an owner or admin, can ask Claude about this project" }
  }
  if (project.status === "closed") return { error: "That project is closed" }
  return { ctx, db, project }
}

/** The facts Claude sees about a project: work, dates and people. Never flags. */
function projectFacts(db: Database, projectId: string) {
  const p = db.projects.find((x) => x.id === projectId)!
  const org = db.organisations.find((o) => o.id === p.organisation_id)
  const name = (id: string) => firstName(db.profiles.find((x) => x.id === id)?.full_name)
  return {
    today: new Date().toISOString().slice(0, 10),
    project: {
      name: p.name,
      for: org?.name ?? "our own work",
      what_done_looks_like: p.scope ?? "not written",
      ends: p.due_at?.slice(0, 10) ?? "no end date",
      check_in: p.cadence,
      lead: name(p.lead_id),
    },
    tasks: db.tasks
      .filter((t) => t.project_id === projectId)
      .map((t) => ({
        title: t.title,
        status: TASK_STATUS[t.status].label,
        for: name(t.assignee_id),
        due: t.due_at?.slice(0, 10) ?? null,
        finished: t.completed_at?.slice(0, 10) ?? null,
      })),
  }
}

const TeamSchema = z.object({
  roles: z
    .array(
      z.object({
        role: z.string(),
        headcount: z.number().int(),
        kind: z.enum(["person", "ai"]),
        why: z.string(),
        suggested_member_id: z.string().nullable(),
      })
    ),
  milestones: z.array(z.object({ title: z.string(), due_in_days: z.number().int() })),
})

/** Claude proposes roles, person or AI helper, and milestones. Kept whole; nothing is applied. */
export async function suggestTeam(projectId: string): Promise<Result & { id?: string }> {
  const got = await projectForLead(projectId)
  if ("error" in got) return { ok: false, message: got.error ?? "Not allowed" }
  const { ctx, db, project } = got

  const people = db.memberships
    .filter((m) => m.workspace_id === ctx.workspace.id && m.role !== "viewer")
    .map((m) => ({
      id: m.user_id,
      name: firstName(db.profiles.find((x) => x.id === m.user_id)?.full_name),
      title: m.title ?? null,
      open_tasks: db.tasks.filter((t) => t.assignee_id === m.user_id && t.status !== "done").length,
      on_this_project: project.member_ids.includes(m.user_id),
    }))

  const answer = await askForJson(
    TeamSchema,
    "Propose how to staff this project. List the roles it needs (with headcount), and for each say whether the work suits a person or an AI helper that drafts while a person approves. For a person role, you may name someone from the team list by their id if they fit and are not overloaded; otherwise use null. Never assume anyone agrees. Then propose up to five milestones, each due a number of days from today and before the project ends. Keep each reason to one sentence.",
    { ...projectFacts(db, projectId), team: people }
  )
  if (!answer.ok) return { ok: false, message: answer.message }

  // Only people who are really in this workspace can be suggested.
  const known = new Set(people.map((p) => p.id))
  const id = newId()
  await mutate((d) => {
    d.team_suggestions.push({
      id,
      workspace_id: ctx.workspace.id,
      project_id: projectId,
      requested_by: ctx.user.id,
      roles: answer.data.roles.slice(0, 8).map((r) => ({
        ...r,
        headcount: Math.max(1, Math.min(20, r.headcount)),
        suggested_member_id:
          r.kind === "person" && r.suggested_member_id && known.has(r.suggested_member_id)
            ? r.suggested_member_id
            : null,
      })),
      milestones: answer.data.milestones.slice(0, 6).map((m) => ({
        ...m,
        due_in_days: Math.max(1, Math.min(365, m.due_in_days)),
      })),
      accepted: [],
      dismissed: [],
      created_at: now(),
    })
  })

  revalidatePath(`/projects/${projectId}`)
  return { ok: true, message: "Claude has suggestions. Accept the lines you agree with.", id }
}

/**
 * Accepts or dismisses one line. Accepting a person role with a name adds that
 * person to the project; accepting a milestone adds it as a task for the lead.
 */
export async function decideSuggestion(
  suggestionId: string,
  key: string,
  decision: "accept" | "dismiss"
): Promise<Result> {
  const { user, workspace } = await requireContext()
  const db = await readDb()
  const s = db.team_suggestions.find((x) => x.id === suggestionId && x.workspace_id === workspace.id)
  if (!s) return { ok: false, message: "Those suggestions are gone" }
  const got = await projectForLead(s.project_id)
  if ("error" in got) return { ok: false, message: got.error ?? "Not allowed" }
  if (s.accepted.includes(key) || s.dismissed.includes(key)) return { ok: true, message: "" }

  const [kind, raw] = key.split(":")
  const index = Number(raw)
  const line = kind === "role" ? s.roles[index] : kind === "milestone" ? s.milestones[index] : undefined
  if (!line || !Number.isInteger(index)) return { ok: false, message: "That line is not in the suggestions" }

  let message = "Dismissed"
  await mutate((d) => {
    const sug = d.team_suggestions.find((x) => x.id === suggestionId)!
    if (decision === "dismiss") {
      sug.dismissed.push(key)
      return
    }
    sug.accepted.push(key)
    const project = d.projects.find((p) => p.id === sug.project_id)!
    if (kind === "role") {
      const member = (line as SuggestedRole).suggested_member_id
      const canWork = d.memberships.some(
        (m) => m.workspace_id === workspace.id && m.user_id === member && m.role !== "viewer"
      )
      if (member && canWork) {
        if (!project.member_ids.includes(member)) project.member_ids.push(member)
        message = `${firstName(d.profiles.find((p) => p.id === member)?.full_name)} is on the project`
      } else {
        message = "Noted. Choose who takes it in Edit."
      }
    } else {
      const m = line as SuggestedMilestone
      d.tasks.push({
        id: newId(),
        workspace_id: workspace.id,
        title: `Milestone: ${m.title}`,
        status: "todo",
        priority: "high",
        due_at: new Date(Date.now() + m.due_in_days * 864e5).toISOString(),
        assignee_id: project.lead_id,
        created_by: user.id,
        project_id: project.id,
        organisation_id: project.organisation_id,
        deal_id: project.deal_id,
        created_at: now(),
      })
      message = "Milestone added as a task for the lead"
    }
  })

  revalidateWork()
  return { ok: true, message }
}

const CheckInSchema = z.object({
  moved: z.string(),
  stuck: z.string(),
  next: z.string(),
  risks: z.string(),
})

/** Claude writes a check-in draft from the tasks and the last check-ins. Nothing is posted. */
export async function draftCheckInWithClaude(
  projectId: string
): Promise<Result & { draft?: z.infer<typeof CheckInSchema> }> {
  const { user, workspace, role } = await requireContext()
  const db = await readDb()
  const project = db.projects.find((p) => p.id === projectId && p.workspace_id === workspace.id)
  if (!project || project.status === "closed") return { ok: false, message: "That project is not open" }
  if (!can.edit(role) || (!project.member_ids.includes(user.id) && !can.editWorkspace(role))) {
    return { ok: false, message: "Only the people on the project, or an admin, can check in" }
  }

  const last = db.check_ins
    .filter((c) => c.project_id === projectId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 2)
    .map((c) => ({
      date: c.created_at.slice(0, 10),
      moved: c.moved,
      stuck: c.stuck,
      next: c.next,
      risks: c.risks ?? "",
    }))

  const answer = await askForJson(
    CheckInSchema,
    "Draft this project's check-in, covering the time since the last check-in, or since it started. Write each part as short lines starting with \"- \", naming who is doing what by first name. moved: what got done. stuck: what is blocked or late, and what it is waiting on. next: what should happen before the next check-in. risks: one line on the biggest risk, or an empty string if there is none. Do not repeat what the last check-ins already said unless it is still true.",
    { ...projectFacts(db, projectId), last_check_ins: last }
  )
  if (!answer.ok) return { ok: false, message: answer.message }
  return {
    ok: true,
    message: "Drafted by Claude. Read it and change anything before posting.",
    draft: answer.data,
  }
}

const LessonsSchema = z.object({ lessons: z.array(z.string()) })

/** Claude turns what went well and wrong into short lessons to pick from. Nothing is saved. */
export async function suggestLessons(
  projectId: string,
  wentWell: string[],
  wentWrong: string[]
): Promise<Result & { lessons?: string[] }> {
  const got = await projectForLead(projectId)
  if ("error" in got) return { ok: false, message: got.error ?? "Not allowed" }
  const clean = (l: string[]) => l.map((x) => String(x).slice(0, 500)).slice(0, 30)

  const answer = await askForJson(
    LessonsSchema,
    "This project is closing. From what went well and what went wrong, suggest up to five short lessons worth carrying into the next project. Each lesson is one sentence saying what to do differently or keep doing, written as an instruction, for example: Give every task a due date when it is created. Do not blame anyone by name.",
    { ...projectFacts(got.db, projectId), went_well: clean(wentWell), went_wrong: clean(wentWrong) }
  )
  if (!answer.ok) return { ok: false, message: answer.message }
  return {
    ok: true,
    message: "Claude suggested some lessons. Tick the ones you agree with.",
    lessons: answer.data.lessons.slice(0, 5),
  }
}

/* ------------------------------------------------------- people, in bulk */
// Every id is checked against this workspace; anything else is ignored.

const peopleWord = (n: number) => `${n} ${n === 1 ? "person" : "people"}`

async function peopleGuard(ids: string[]) {
  const ctx = await requireContext()
  if (!can.edit(ctx.role)) return { error: "Viewers cannot change people" }
  const db = await readDb()
  const mine = db.contacts.filter((c) => c.workspace_id === ctx.workspace.id && ids.includes(c.id))
  if (mine.length === 0) return { error: "Nothing selected" }
  return { ctx, db, ids: mine.map((c) => c.id) }
}

export async function bulkPeopleOwner(ids: string[], userId: string): Promise<Result> {
  const g = await peopleGuard(ids)
  if ("error" in g) return { ok: false, message: g.error ?? "Not allowed" }
  const member = g.db.memberships.find((m) => m.workspace_id === g.ctx.workspace.id && m.user_id === userId)
  const target = g.db.profiles.find((p) => p.id === userId)
  if (!member || !target || member.role === "viewer") {
    return { ok: false, message: "The owner has to be someone who can work in this workspace" }
  }

  await mutate((d) => {
    for (const c of d.contacts) if (g.ids.includes(c.id)) c.owner_id = userId
    log(d, g.ctx.workspace.id, g.ctx.user.id, `gave ${peopleWord(g.ids.length)} to ${target.full_name}`)
    notify(d, {
      workspace_id: g.ctx.workspace.id,
      user_id: userId,
      actor_id: g.ctx.user.id,
      type: "records_assigned",
      title: `${actorName(d, g.ctx.user.id)} handed you ${peopleWord(g.ids.length)}`,
      href: `/people?owner=${userId}`,
    })
  })
  revalidatePath("/people", "layout")
  revalidatePath("/team", "layout")
  return { ok: true, message: `${peopleWord(g.ids.length)} now with ${target.full_name.split(" ")[0]}` }
}

export async function bulkPeopleTag(ids: string[], tag: string): Promise<Result> {
  const g = await peopleGuard(ids)
  if ("error" in g) return { ok: false, message: g.error ?? "Not allowed" }
  const clean = tag.trim()
  if (clean.length < 1 || clean.length > 40) return { ok: false, message: "A tag is 1 to 40 characters" }

  await mutate((d) => {
    for (const c of d.contacts) {
      if (g.ids.includes(c.id) && !c.tags.some((t) => t.toLowerCase() === clean.toLowerCase())) c.tags.push(clean)
    }
  })
  revalidatePath("/people", "layout")
  return { ok: true, message: `Tagged ${peopleWord(g.ids.length)} ${clean}` }
}

/** "Speak again on" for everyone selected; an empty date clears it. */
export async function bulkPeopleNextTouch(ids: string[], date: string): Promise<Result> {
  const g = await peopleGuard(ids)
  if ("error" in g) return { ok: false, message: g.error ?? "Not allowed" }
  if (date && Number.isNaN(Date.parse(date))) return { ok: false, message: "That is not a date" }

  await mutate((d) => {
    for (const c of d.contacts) if (g.ids.includes(c.id)) c.next_touch_at = date || undefined
  })
  revalidatePath("/people", "layout")
  revalidatePath("/today")
  return {
    ok: true,
    message: date
      ? `Speak to ${peopleWord(g.ids.length)} on ${new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
      : `Cleared the date for ${peopleWord(g.ids.length)}`,
  }
}

/**
 * Owners and admins only. Deals, tasks and history are kept and lose the link
 * to the person; nothing else is removed.
 */
export async function bulkPeopleDelete(ids: string[]): Promise<Result> {
  const g = await peopleGuard(ids)
  if ("error" in g) return { ok: false, message: g.error ?? "Not allowed" }
  if (!can.editWorkspace(g.ctx.role)) return { ok: false, message: "Only owners and admins can delete people" }

  await mutate((d) => {
    d.contacts = d.contacts.filter((c) => !g.ids.includes(c.id))
    for (const deal of d.deals) if (deal.contact_id && g.ids.includes(deal.contact_id)) deal.contact_id = undefined
    for (const t of d.tasks) if (t.contact_id && g.ids.includes(t.contact_id)) t.contact_id = undefined
    for (const a of d.activities) if (a.contact_id && g.ids.includes(a.contact_id)) a.contact_id = undefined
    d.not_duplicates = d.not_duplicates.filter((n) => !g.ids.includes(n.a_id) && !g.ids.includes(n.b_id))
    log(d, g.ctx.workspace.id, g.ctx.user.id, `deleted ${peopleWord(g.ids.length)}`)
  })
  revalidatePath("/people", "layout")
  revalidatePath("/organisations", "layout")
  revalidatePath("/deals", "layout")
  revalidatePath("/today")
  return { ok: true, message: `${peopleWord(g.ids.length)} deleted. Their deals and history were kept.` }
}

/** CSV of the people selected, or everyone when nothing is. */
export async function exportPeople(ids: string[]): Promise<{ filename: string; csv: string }> {
  const { workspace } = await requireContext()
  const db = await readDb()
  const rows = db.contacts.filter(
    (c) => c.workspace_id === workspace.id && (ids.length === 0 || ids.includes(c.id))
  )
  const cell = (v: string | undefined) => {
    const s = String(v ?? "")
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = ["Name", "Role", "Organisation", "Phone", "Email", "Tags", "Speak again on", "Owner"]
  const lines = rows.map((c) =>
    [
      c.full_name,
      c.title,
      db.organisations.find((o) => o.id === c.organisation_id)?.name,
      c.phone,
      c.email,
      c.tags.join(" | "),
      c.next_touch_at?.slice(0, 10),
      db.profiles.find((p) => p.id === c.owner_id)?.full_name,
    ]
      .map(cell)
      .join(",")
  )
  return {
    filename: `${workspace.name.toLowerCase().replace(/\s+/g, "-")}-people.csv`,
    csv: [header.join(","), ...lines].join("\n"),
  }
}

/* -------------------------------------------------------- deals, in bulk */

const STAGE_IDS = STAGES.map((st) => st.id)
// Every id is checked against this workspace; anything else is ignored.

const dealWord = (n: number) => `${n} deal${n === 1 ? "" : "s"}`

async function dealsGuard(ids: string[]) {
  const ctx = await requireContext()
  if (!can.edit(ctx.role)) return { error: "Viewers cannot change deals" }
  const db = await readDb()
  const mine = db.deals.filter((d) => d.workspace_id === ctx.workspace.id && ids.includes(d.id))
  if (mine.length === 0) return { error: "Nothing selected" }
  return { ctx, db, ids: mine.map((d) => d.id) }
}

function revalidateDeals() {
  revalidatePath("/deals", "layout")
  revalidatePath("/organisations", "layout")
  revalidatePath("/team", "layout")
  revalidatePath("/today")
}

export async function bulkDealsOwner(ids: string[], userId: string): Promise<Result> {
  const g = await dealsGuard(ids)
  if ("error" in g) return { ok: false, message: g.error ?? "Not allowed" }
  const member = g.db.memberships.find((m) => m.workspace_id === g.ctx.workspace.id && m.user_id === userId)
  const target = g.db.profiles.find((p) => p.id === userId)
  if (!member || !target || member.role === "viewer") {
    return { ok: false, message: "The owner has to be someone who can work in this workspace" }
  }

  await mutate((d) => {
    for (const deal of d.deals) if (g.ids.includes(deal.id)) deal.owner_id = userId
    log(d, g.ctx.workspace.id, g.ctx.user.id, `gave ${dealWord(g.ids.length)} to ${target.full_name}`)
    notify(d, {
      workspace_id: g.ctx.workspace.id,
      user_id: userId,
      actor_id: g.ctx.user.id,
      type: "deal_assigned",
      title: `${actorName(d, g.ctx.user.id)} handed you ${dealWord(g.ids.length)}`,
      href: `/deals?view=list&owner=${userId}`,
    })
  })
  revalidateDeals()
  return { ok: true, message: `${dealWord(g.ids.length)} now with ${target.full_name.split(" ")[0]}` }
}

/** Moves every selected deal to one stage. Lost always needs a reason, given once for all of them. */
export async function bulkDealsStage(ids: string[], stage: StageId, reason = ""): Promise<Result> {
  const g = await dealsGuard(ids)
  if ("error" in g) return { ok: false, message: g.error ?? "Not allowed" }
  if (!STAGE_IDS.includes(stage)) return { ok: false, message: "That is not a stage" }
  const why = reason.trim()
  if (stage === "lost" && why.length < 3) return { ok: false, message: "Say why they were lost" }

  const to = stageOf(stage).label
  let moved = 0
  await mutate((d) => {
    for (const deal of d.deals) {
      if (!g.ids.includes(deal.id) || deal.stage === stage) continue
      const from = stageOf(deal.stage).label
      deal.stage = stage
      deal.stage_changed_at = now()
      deal.closed_at = stage === "won" || stage === "lost" ? now() : undefined
      deal.lost_reason = stage === "lost" ? why : undefined
      moved++
      log(d, g.ctx.workspace.id, g.ctx.user.id, `moved ${deal.title} from ${from} to ${to}${stage === "lost" ? ` — ${why}` : ""}`, {
        organisation_id: deal.organisation_id,
        deal_id: deal.id,
      })
      notify(d, {
        workspace_id: g.ctx.workspace.id,
        user_id: deal.owner_id,
        actor_id: g.ctx.user.id,
        type: "deal_moved",
        title: `${actorName(d, g.ctx.user.id)} moved ${deal.title} to ${to}`,
        href: `/deals/${deal.id}`,
      })
    }
  })
  revalidateDeals()
  return { ok: true, message: moved ? `${dealWord(moved)} moved to ${to}` : `They were already in ${to}` }
}

/** One expected close date for everything selected; an empty date clears it. */
export async function bulkDealsClose(ids: string[], date: string): Promise<Result> {
  const g = await dealsGuard(ids)
  if ("error" in g) return { ok: false, message: g.error ?? "Not allowed" }
  if (date && Number.isNaN(Date.parse(date))) return { ok: false, message: "That is not a date" }

  await mutate((d) => {
    for (const deal of d.deals) if (g.ids.includes(deal.id)) deal.expected_close = date || undefined
  })
  revalidateDeals()
  return {
    ok: true,
    message: date
      ? `${dealWord(g.ids.length)} expected to close ${new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
      : `Cleared the close date on ${dealWord(g.ids.length)}`,
  }
}

/**
 * Owners and admins only. Tasks, projects and history are kept and lose the
 * link to the deal.
 */
export async function bulkDealsDelete(ids: string[]): Promise<Result> {
  const g = await dealsGuard(ids)
  if ("error" in g) return { ok: false, message: g.error ?? "Not allowed" }
  if (!can.editWorkspace(g.ctx.role)) return { ok: false, message: "Only owners and admins can delete deals" }

  await mutate((d) => {
    d.deals = d.deals.filter((deal) => !g.ids.includes(deal.id))
    for (const t of d.tasks) if (t.deal_id && g.ids.includes(t.deal_id)) t.deal_id = undefined
    for (const p of d.projects) if (p.deal_id && g.ids.includes(p.deal_id)) p.deal_id = undefined
    for (const a of d.activities) if (a.deal_id && g.ids.includes(a.deal_id)) a.deal_id = undefined
    log(d, g.ctx.workspace.id, g.ctx.user.id, `deleted ${dealWord(g.ids.length)}`)
  })
  revalidateDeals()
  revalidatePath("/projects", "layout")
  return { ok: true, message: `${dealWord(g.ids.length)} deleted. Their tasks and history were kept.` }
}

/** CSV of the deals selected, or every deal when nothing is. */
export async function exportDeals(ids: string[]): Promise<{ filename: string; csv: string }> {
  const { workspace } = await requireContext()
  const db = await readDb()
  const rows = db.deals.filter((d) => d.workspace_id === workspace.id && (ids.length === 0 || ids.includes(d.id)))
  const cell = (v: string | number | undefined) => {
    const s = String(v ?? "")
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = ["Deal", "Organisation", "Person", "Value (KSh)", "Stage", "Expected close", "Owner", "Lost because"]
  const lines = rows.map((d) =>
    [
      d.title,
      db.organisations.find((o) => o.id === d.organisation_id)?.name,
      db.contacts.find((c) => c.id === d.contact_id)?.full_name,
      d.value,
      stageOf(d.stage).label,
      d.expected_close?.slice(0, 10),
      db.profiles.find((p) => p.id === d.owner_id)?.full_name,
      d.lost_reason,
    ]
      .map(cell)
      .join(",")
  )
  return {
    filename: `${workspace.name.toLowerCase().replace(/\s+/g, "-")}-deals.csv`,
    csv: [header.join(","), ...lines].join("\n"),
  }
}

/* ---------------------------------------------------------- custom fields */
// Owners and admins shape the fields; anyone who can edit fills them in.

const FIELD_TYPES = Object.keys(FIELD_TYPE_LABEL) as FieldType[]
const FIELD_OBJECTS = Object.keys(FIELD_OBJECT_LABEL) as FieldObject[]

/** Reads and checks a field definition from a form. */
function readFieldForm(formData: FormData) {
  const label = str(formData, "label")
  if (label.length < 2 || label.length > 40) return { error: "A field name is 2 to 40 characters" }
  const type = str(formData, "type") as FieldType
  if (!FIELD_TYPES.includes(type)) return { error: "Pick what kind of field it is" }
  const options =
    type === "choice"
      ? [...new Set(str(formData, "options").split(/[,\n]/).map((o) => o.trim()).filter(Boolean))]
      : []
  if (type === "choice" && (options.length < 2 || options.length > 20)) {
    return { error: "A choice needs 2 to 20 options, separated by commas" }
  }
  if (options.some((o) => o.length > 40)) return { error: "Keep each option under 40 characters" }
  return { label, type, options }
}

export async function createCustomField(formData: FormData): Promise<Result> {
  const { user, workspace, role } = await requireContext()
  if (!can.editWorkspace(role)) return { ok: false, message: "Only owners and admins can add fields" }

  const object = str(formData, "object") as FieldObject
  if (!FIELD_OBJECTS.includes(object)) return { ok: false, message: "Pick organisations, people or deals" }
  const read = readFieldForm(formData)
  if ("error" in read) return { ok: false, message: read.error ?? "Check the field" }

  const db = await readDb()
  const siblings = db.custom_fields.filter((f) => f.workspace_id === workspace.id && f.object === object)
  if (siblings.length >= 30) return { ok: false, message: "That is 30 fields already. Remove one first." }
  if (siblings.some((f) => f.label.toLowerCase() === read.label.toLowerCase())) {
    return { ok: false, message: `${FIELD_OBJECT_LABEL[object]} already have a field called ${read.label}` }
  }

  await mutate((d) => {
    d.custom_fields.push({
      id: newId(),
      workspace_id: workspace.id,
      object,
      label: read.label,
      type: read.type,
      options: read.options,
      position: siblings.length,
      created_by: user.id,
      created_at: now(),
    })
  })

  revalidatePath("/settings")
  revalidatePath(`/${object}`, "layout")
  return { ok: true, message: `${read.label} added to ${FIELD_OBJECT_LABEL[object].toLowerCase()}` }
}

/** Renames a field or changes its choices. Its type stays, so filled-in values stay meaningful. */
export async function updateCustomField(fieldId: string, formData: FormData): Promise<Result> {
  const { workspace, role } = await requireContext()
  if (!can.editWorkspace(role)) return { ok: false, message: "Only owners and admins can change fields" }

  const db = await readDb()
  const field = db.custom_fields.find((f) => f.id === fieldId && f.workspace_id === workspace.id)
  if (!field) return { ok: false, message: "That field is gone" }
  formData.set("type", field.type)
  const read = readFieldForm(formData)
  if ("error" in read) return { ok: false, message: read.error ?? "Check the field" }
  const clash = db.custom_fields.some(
    (f) =>
      f.workspace_id === workspace.id &&
      f.object === field.object &&
      f.id !== fieldId &&
      f.label.toLowerCase() === read.label.toLowerCase()
  )
  if (clash) return { ok: false, message: `There is already a field called ${read.label}` }

  await mutate((d) => {
    const f = d.custom_fields.find((x) => x.id === fieldId)!
    f.label = read.label
    f.options = read.options
  })

  revalidatePath("/settings")
  revalidatePath(`/${field.object}`, "layout")
  return { ok: true, message: "Field saved" }
}

/** Removes a field and every value filled in for it. Owners and admins, after a confirm. */
export async function deleteCustomField(fieldId: string): Promise<Result> {
  const { user, workspace, role } = await requireContext()
  if (!can.editWorkspace(role)) return { ok: false, message: "Only owners and admins can remove fields" }

  const db = await readDb()
  const field = db.custom_fields.find((f) => f.id === fieldId && f.workspace_id === workspace.id)
  if (!field) return { ok: false, message: "That field is gone already" }
  const filled = db.custom_values.filter((v) => v.field_id === fieldId && v.value).length

  await mutate((d) => {
    d.custom_fields = d.custom_fields.filter((f) => f.id !== fieldId)
    d.custom_values = d.custom_values.filter((v) => v.field_id !== fieldId)
    log(d, workspace.id, user.id, `removed the field ${field.label} from ${FIELD_OBJECT_LABEL[field.object].toLowerCase()}`)
  })

  revalidatePath("/settings")
  revalidatePath(`/${field.object}`, "layout")
  return {
    ok: true,
    message: filled ? `${field.label} removed, with ${filled} value${filled === 1 ? "" : "s"}` : `${field.label} removed`,
  }
}

/** Checks one value against its field and returns it as stored text, or an error. */
function cleanValue(field: CustomField, raw: string): { value: string } | { error: string } {
  const v = raw.trim()
  if (!v) return { value: "" }
  switch (field.type) {
    case "number": {
      const n = Number(v.replace(/,/g, ""))
      return Number.isFinite(n) ? { value: String(n) } : { error: `${field.label} has to be a number` }
    }
    case "money": {
      const n = Number(v.replace(/[^0-9.]/g, ""))
      return Number.isFinite(n) && n >= 0 ? { value: String(Math.round(n)) } : { error: `${field.label} has to be an amount` }
    }
    case "date":
      return Number.isNaN(Date.parse(v)) ? { error: `${field.label} has to be a date` } : { value: v.slice(0, 10) }
    case "choice":
      return field.options.includes(v) ? { value: v } : { error: `Pick one of the choices for ${field.label}` }
    default:
      return v.length > 500 ? { error: `Keep ${field.label} under 500 characters` } : { value: v }
  }
}

/** Saves the custom field values for one organisation or deal. */
export async function saveCustomValues(object: FieldObject, recordId: string, formData: FormData): Promise<Result> {
  const { user, workspace, role } = await requireContext()
  if (!can.edit(role)) return { ok: false, message: "Viewers cannot change records" }
  if (!FIELD_OBJECTS.includes(object)) return { ok: false, message: "That kind of record has no fields" }

  const db = await readDb()
  const rows: { id: string; workspace_id: string }[] =
    object === "organisations" ? db.organisations : object === "people" ? db.contacts : db.deals
  if (!rows.some((r) => r.id === recordId && r.workspace_id === workspace.id)) {
    return { ok: false, message: "That record is not in this workspace" }
  }

  const fields = db.custom_fields.filter((f) => f.workspace_id === workspace.id && f.object === object)
  const next: { field: CustomField; value: string }[] = []
  for (const field of fields) {
    if (!formData.has(field.id)) continue
    const cleaned = cleanValue(field, str(formData, field.id))
    if ("error" in cleaned) return { ok: false, message: cleaned.error }
    next.push({ field, value: cleaned.value })
  }

  const changed: string[] = []
  await mutate((d) => {
    for (const { field, value } of next) {
      const existing = d.custom_values.find((v) => v.field_id === field.id && v.record_id === recordId)
      if ((existing?.value ?? "") === value) continue
      changed.push(field.label)
      if (existing) existing.value = value
      else d.custom_values.push({ workspace_id: workspace.id, field_id: field.id, record_id: recordId, value })
    }
    d.custom_values = d.custom_values.filter((v) => v.value !== "")
    if (changed.length) {
      const deal = object === "deals" ? d.deals.find((x) => x.id === recordId) : undefined
      const person = object === "people" ? d.contacts.find((x) => x.id === recordId) : undefined
      log(d, workspace.id, user.id, `updated ${changed.join(", ")}`, {
        organisation_id: object === "organisations" ? recordId : (deal ?? person)?.organisation_id,
        deal_id: deal?.id,
        contact_id: person?.id,
      })
    }
  })

  revalidatePath(`/${object}/${recordId}`)
  return { ok: true, message: changed.length ? `Saved ${changed.join(", ")}` : "Nothing changed" }
}

const FieldSuggestionSchema = z.object({
  fields: z.array(
    z.object({
      object: z.enum(["organisations", "people", "deals"]),
      label: z.string(),
      type: z.enum(["text", "number", "money", "date", "choice"]),
      options: z.array(z.string()),
      why: z.string(),
    })
  ),
})

/**
 * Claude looks at what this workspace records and suggests fields worth
 * adding. Nothing is added: each suggestion is accepted on its own.
 */
export async function suggestCustomFields(): Promise<
  Result & { fields?: z.infer<typeof FieldSuggestionSchema>["fields"] }
> {
  const { workspace, role } = await requireContext()
  if (!can.editWorkspace(role)) return { ok: false, message: "Only owners and admins can add fields" }

  const db = await readDb()
  const orgs = db.organisations.filter((o) => o.workspace_id === workspace.id)
  const facts = {
    workspace: workspace.name,
    organisations: orgs.slice(0, 40).map((o) => ({
      type: ORG_CATEGORY_LABEL[o.category],
      what_they_do: o.what_they_do ?? "",
      tags: o.tags,
    })),
    deals: db.deals
      .filter((d) => d.workspace_id === workspace.id)
      .slice(0, 40)
      .map((d) => ({ title: d.title, stage: stageOf(d.stage).label })),
    fields_already: db.custom_fields
      .filter((f) => f.workspace_id === workspace.id)
      .map((f) => ({ object: f.object, label: f.label })),
  }

  const answer = await askForJson(
    FieldSuggestionSchema,
    "Suggest up to six custom fields worth adding to this business's organisations, people or deals, based on what it buys, sells and records. Prefer facts a Kenyan small business actually tracks (for example payment terms, KRA PIN, delivery region, tender number). Do not repeat the fields it already has, or built-in ones (name, type, phone, email, location, owner, tags, value, stage, close date). For a choice field give 2 to 8 options; for other types give an empty options list. Keep each reason to one sentence.",
    facts
  )
  if (!answer.ok) return { ok: false, message: answer.message }
  return {
    ok: true,
    message: "Claude has some suggestions. Add the ones you want.",
    fields: answer.data.fields.slice(0, 6),
  }
}

/* ------------------------------------------------------------- one person */

/** Edits one person: who they are, where they work, who owns them, when to speak next. */
export async function updateContact(contactId: string, formData: FormData): Promise<Result> {
  const { user, workspace, role } = await requireContext()
  if (!can.edit(role)) return { ok: false, message: "Viewers cannot change people" }

  const db = await readDb()
  const person = db.contacts.find((c) => c.id === contactId && c.workspace_id === workspace.id)
  if (!person) return { ok: false, message: "That person is not here" }

  const full_name = str(formData, "full_name")
  if (full_name.length < 2 || full_name.length > 80) return { ok: false, message: "A name is 2 to 80 characters" }
  const email = str(formData, "email")
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: "That email does not look right" }
  const next = str(formData, "next_touch_at")
  if (next && Number.isNaN(Date.parse(next))) return { ok: false, message: "That is not a date" }

  const organisation_id = str(formData, "organisation_id") || undefined
  if (organisation_id && !db.organisations.some((o) => o.id === organisation_id && o.workspace_id === workspace.id)) {
    return { ok: false, message: "That organisation is not in this workspace" }
  }
  const owner_id = str(formData, "owner_id") || person.owner_id
  const owner = db.memberships.find((m) => m.workspace_id === workspace.id && m.user_id === owner_id)
  if (!owner || owner.role === "viewer") {
    return { ok: false, message: "The owner has to be someone who can work in this workspace" }
  }

  await mutate((d) => {
    const c = d.contacts.find((x) => x.id === contactId)!
    const moved = c.organisation_id !== organisation_id
    c.full_name = full_name
    c.title = str(formData, "title") || undefined
    c.phone = str(formData, "phone") || undefined
    c.email = email || undefined
    c.tags = tags(formData, "tags")
    c.next_touch_at = next || undefined
    c.organisation_id = organisation_id
    c.owner_id = owner_id
    log(
      d,
      workspace.id,
      user.id,
      moved
        ? `moved ${full_name} to ${d.organisations.find((o) => o.id === organisation_id)?.name ?? "no organisation"}`
        : `updated ${full_name}`,
      { organisation_id, contact_id: contactId }
    )
  })

  revalidatePath("/people", "layout")
  revalidatePath("/organisations", "layout")
  revalidatePath("/today")
  return { ok: true, message: "Saved" }
}

/* ---------------------------------------------------------- notifications */
// Read state is per person: marking one read here marks it read everywhere.

export async function markNotificationRead(notificationId: string): Promise<Result> {
  const { user, workspace } = await requireContext()
  const db = await readDb()
  const n = db.notifications.find(
    (x) => x.id === notificationId && x.workspace_id === workspace.id && x.user_id === user.id
  )
  if (!n) return { ok: false, message: "That notification is gone" }
  if (!n.read_at) {
    await mutate((d) => {
      d.notifications.find((x) => x.id === notificationId)!.read_at = now()
    })
  }
  revalidatePath("/", "layout")
  return { ok: true, message: "" }
}

export async function markAllNotificationsRead(): Promise<Result> {
  const { user, workspace } = await requireContext()
  let count = 0
  await mutate((d) => {
    for (const n of d.notifications) {
      if (n.workspace_id === workspace.id && n.user_id === user.id && !n.read_at) {
        n.read_at = now()
        count++
      }
    }
  })
  revalidatePath("/", "layout")
  return { ok: true, message: count ? `Marked ${count} as read` : "Nothing unread" }
}

/** Switch one kind of notification on or off for yourself, in this workspace. */
export async function setNotificationMuted(type: NotificationType, muted: boolean): Promise<Result> {
  const { user, workspace } = await requireContext()
  if (!(type in NOTIFICATION_LABEL)) return { ok: false, message: "That is not a kind of notification" }

  await mutate((d) => {
    let prefs = d.notification_prefs.find((p) => p.workspace_id === workspace.id && p.user_id === user.id)
    if (!prefs) {
      prefs = { workspace_id: workspace.id, user_id: user.id, muted: [] }
      d.notification_prefs.push(prefs)
    }
    prefs.muted = muted ? [...new Set([...prefs.muted, type])] : prefs.muted.filter((t) => t !== type)
  })
  revalidatePath("/settings")
  return { ok: true, message: muted ? "Switched off" : "Switched on" }
}

/**
 * The two reminders that depend on the date rather than on an action: a
 * check-in due on a project you lead, and people you own who are overdue.
 * Made at most once a day per person, the first time they open the app.
 */
export async function refreshDailyReminders(): Promise<void> {
  const ctx = await requireContext().catch(() => null)
  if (!ctx || !can.edit(ctx.role)) return
  const { user, workspace } = ctx
  const today = new Date().toISOString().slice(0, 10)
  const db = await readDb()
  if (db.notifications.some((n) => n.user_id === user.id && n.dedupe_key?.endsWith(`:${today}`))) return

  const every = (c: Cadence) => CADENCE_DAYS[c]
  const dueProjects = db.projects.filter((p) => {
    if (p.workspace_id !== workspace.id || p.status !== "active" || p.lead_id !== user.id) return false
    const last = db.check_ins
      .filter((c) => c.project_id === p.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
    const since = Math.floor((Date.now() - new Date(last?.created_at ?? p.created_at).getTime()) / 864e5)
    return since >= every(p.cadence)
  })
  const overdue = db.contacts.filter(
    (c) =>
      c.workspace_id === workspace.id &&
      c.owner_id === user.id &&
      c.next_touch_at &&
      c.next_touch_at.slice(0, 10) < today
  ).length

  if (dueProjects.length === 0 && overdue === 0) return
  await mutate((d) => {
    // A reminder "from the app": the actor is nobody, so it is never skipped as self-made.
    const system = "system"
    for (const p of dueProjects) {
      notify(d, {
        workspace_id: workspace.id,
        user_id: user.id,
        actor_id: system,
        type: "check_in_due",
        title: `A check-in is due on ${p.name}`,
        href: `/projects/${p.id}`,
        dedupe_key: `check_in_due:${p.id}:${today}`,
      })
    }
    if (overdue > 0) {
      notify(d, {
        workspace_id: workspace.id,
        user_id: user.id,
        actor_id: system,
        type: "people_overdue",
        title: `${overdue} ${overdue === 1 ? "person is" : "people are"} overdue to speak to`,
        href: `/people?owner=${user.id}&touch=due`,
        dedupe_key: `people_overdue:${today}`,
      })
    }
  })
}

/* ------------------------------------------------- encrypted channels (5b) */
// The server never sees a message in the clear. It checks who may do what,
// stores what devices send, and hands each device only the keys wrapped for it.
// Three kinds of chat: Announcements (everyone reads, owners and admins post),
// groups (named, chosen members) and direct messages (two people).

const B64 = /^[A-Za-z0-9+/]+={0,2}$/
const MAX_DEVICES = 10
const MAX_SEALED = 64 * 1024

type PublicKey = Database["devices"][number]["public_key"]

const inWorkspace = (db: Database, workspaceId: string, userId: string) =>
  db.memberships.some((m) => m.workspace_id === workspaceId && m.user_id === userId)

/**
 * Everyone who belongs in the chat right now. Announcements is the whole
 * workspace; groups and direct messages are their listed members who are
 * still in the workspace, so leaving the workspace leaves every chat.
 */
function channelMemberIds(db: Database, ch: Channel): string[] {
  if (ch.kind === "announcements") {
    return db.memberships.filter((m) => m.workspace_id === ch.workspace_id).map((m) => m.user_id)
  }
  return db.channel_members
    .filter((m) => m.channel_id === ch.id && inWorkspace(db, ch.workspace_id, m.user_id))
    .map((m) => m.user_id)
}

/** The devices that must hold the current key: every active device of every member. */
function expectedDeviceIds(db: Database, ch: Channel): string[] {
  const members = new Set(channelMemberIds(db, ch))
  return db.devices
    .filter((d) => members.has(d.user_id) && !d.revoked_at)
    .map((d) => d.id)
    .sort()
}

/**
 * True when someone joined or left, or a device was added or removed, since
 * the current key was made. Nothing can be sent until a member's device makes
 * a new one, so nobody who has left ever receives a new message.
 */
function needsRotation(db: Database, ch: Channel): boolean {
  if (ch.epoch === 0) return true
  const holders = db.channel_keys
    .filter((k) => k.channel_id === ch.id && k.epoch === ch.epoch)
    .map((k) => k.device_id)
    .sort()
  return holders.join() !== expectedDeviceIds(db, ch).join()
}

/** The chat, only if this person is in it and it is in this workspace. */
function channelFor(db: Database, channelId: string, workspaceId: string, userId: string) {
  const ch = db.channels.find((c) => c.id === channelId && c.workspace_id === workspaceId)
  return ch && channelMemberIds(db, ch).includes(userId) ? ch : null
}

/** A device, only if it is this person's and has not been removed. */
function myDevice(db: Database, deviceId: string, userId: string) {
  return db.devices.find((d) => d.id === deviceId && d.user_id === userId && !d.revoked_at) ?? null
}

function markRead(d: Database, ch: Channel, userId: string) {
  const r = d.channel_reads.find((x) => x.channel_id === ch.id && x.user_id === userId)
  if (r) r.read_at = now()
  else d.channel_reads.push({ workspace_id: ch.workspace_id, channel_id: ch.id, user_id: userId, read_at: now() })
}

/** Who may post: Announcements is owners and admins; everywhere else, any member. */
const canPost = (ch: Channel, role: Role) => ch.kind !== "announcements" || can.announce(role)

/** Who may remove someone else from a group: whoever started it, or an owner or admin in it. */
const canManage = (ch: Channel, role: Role, userId: string) =>
  ch.kind === "group" && (ch.created_by === userId || role === "owner" || role === "admin")

/** What a chat is called for this person: a DM is named after the other person. */
function chatName(db: Database, ch: Channel, userId: string) {
  if (ch.kind !== "dm") return ch.name
  const other = channelMemberIds(db, ch).find((id) => id !== userId)
  return db.profiles.find((p) => p.id === other)?.full_name ?? "Someone who has left"
}

/** Adds this browser or phone as one of your devices. Only its public key is sent. */
export async function registerDevice(
  name: string,
  publicKey: unknown
): Promise<Result & { deviceId?: string }> {
  const { user } = await requireContext()
  if (!isPublicKeyJwk(publicKey)) return { ok: false, message: "That is not a device key" }
  const label = String(name ?? "").trim().slice(0, 60) || "This device"

  const db = await readDb()
  const active = db.devices.filter((d) => d.user_id === user.id && !d.revoked_at)
  if (active.length >= MAX_DEVICES) {
    return { ok: false, message: `You already have ${MAX_DEVICES} devices. Remove an old one in Settings first.` }
  }

  const id = newId()
  const { kty, crv, x, y } = publicKey
  await mutate((d) => {
    d.devices.push({
      id,
      user_id: user.id,
      name: label,
      public_key: { kty, crv, x, y },
      created_at: now(),
      last_seen_at: now(),
    })
  })
  return { ok: true, message: "This device can now read your chats", deviceId: id }
}

/** Stops one of your devices reading anything new. The next key is made without it. */
export async function revokeDevice(deviceId: string): Promise<Result> {
  const { user } = await requireContext()
  if (!myDevice(await readDb(), deviceId, user.id)) {
    return { ok: false, message: "That device is not yours, or is already removed" }
  }
  await mutate((d) => {
    d.devices.find((x) => x.id === deviceId)!.revoked_at = now()
  })
  revalidatePath("/settings")
  return { ok: true, message: "Device removed. It cannot read new messages." }
}

export type ChannelSummary = {
  id: string
  kind: Channel["kind"]
  name: string
  unread: number
  /** When the last message arrived, for ordering. Empty when there are none. */
  lastAt: string
  /** For a direct message: the other person. */
  with?: string
}

export type ChatDirectory = {
  ok: true
  deviceKnown: boolean
  channels: ChannelSummary[]
  /** Everyone else in the workspace, for starting a direct message or a group. */
  people: { id: string; name: string }[]
  canCreateGroup: boolean
}

/** Your chats in this workspace, with unread counts. Makes Announcements the first time. */
export async function loadChannels(deviceId: string): Promise<ChatDirectory> {
  const { user, workspace, role } = await requireContext()
  const known = Boolean(myDevice(await readDb(), deviceId, user.id))

  const channels = await mutate((d) => {
    if (known) d.devices.find((x) => x.id === deviceId)!.last_seen_at = now()
    // Unread counts only what this device can open: messages from before it
    // was added stay closed to it, so they are not waiting to be read.
    const openable = new Set(
      known ? d.channel_keys.filter((k) => k.device_id === deviceId).map((k) => `${k.channel_id}:${k.epoch}`) : []
    )
    if (!d.channels.some((c) => c.workspace_id === workspace.id && c.kind === "announcements")) {
      d.channels.push({
        id: newId(),
        workspace_id: workspace.id,
        name: "Announcements",
        kind: "announcements",
        created_by: user.id,
        created_at: now(),
        epoch: 0,
      })
    }
    return d.channels
      .filter((c) => c.workspace_id === workspace.id && channelMemberIds(d, c).includes(user.id))
      .map((c) => {
        const read = d.channel_reads.find((r) => r.channel_id === c.id && r.user_id === user.id)?.read_at ?? ""
        const mine = d.messages.filter((m) => m.channel_id === c.id)
        return {
          id: c.id,
          kind: c.kind,
          name: chatName(d, c, user.id),
          unread: mine.filter(
            (m) => m.sender_id !== user.id && m.created_at > read && openable.has(`${m.channel_id}:${m.epoch}`)
          ).length,
          lastAt: mine.reduce((latest, m) => (m.created_at > latest ? m.created_at : latest), ""),
          with: c.kind === "dm" ? channelMemberIds(d, c).find((id) => id !== user.id) : undefined,
        }
      })
  })

  const db = await readDb()
  const people = db.memberships
    .filter((m) => m.workspace_id === workspace.id && m.user_id !== user.id)
    .map((m) => ({ id: m.user_id, name: db.profiles.find((p) => p.id === m.user_id)?.full_name ?? "Someone" }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return { ok: true, deviceKnown: known, channels, people, canCreateGroup: can.createGroup(role) }
}

/** Starts a team group with the people chosen. You are always in it. */
export async function createGroup(
  name: string,
  memberIds: string[]
): Promise<Result & { id?: string }> {
  const { user, workspace, role } = await requireContext()
  if (!can.createGroup(role)) return { ok: false, message: "Viewers cannot start groups" }
  const title = String(name ?? "").trim()
  if (title.length < 2 || title.length > 40) return { ok: false, message: "Give the group a name of 2 to 40 letters" }

  const db = await readDb()
  const ids = [...new Set(Array.isArray(memberIds) ? memberIds : [])].filter((id) => id !== user.id)
  if (ids.length === 0) return { ok: false, message: "Choose at least one other person" }
  if (!ids.every((id) => inWorkspace(db, workspace.id, id))) {
    return { ok: false, message: "Everyone in the group has to be in this workspace" }
  }

  const id = newId()
  await mutate((d) => {
    d.channels.push({ id, workspace_id: workspace.id, name: title, kind: "group", created_by: user.id, created_at: now(), epoch: 0 })
    for (const uid of [user.id, ...ids]) {
      d.channel_members.push({ workspace_id: workspace.id, channel_id: id, user_id: uid, added_by: user.id, added_at: now() })
    }
  })
  return { ok: true, message: `${title} started`, id }
}

/** Opens your direct message with someone, starting it the first time. */
export async function startDirectMessage(otherId: string): Promise<Result & { id?: string }> {
  const { user, workspace } = await requireContext()
  const db = await readDb()
  if (otherId === user.id || !inWorkspace(db, workspace.id, otherId)) {
    return { ok: false, message: "That person is not in this workspace" }
  }

  const pair = [user.id, otherId].sort().join()
  const existing = db.channels.find(
    (c) =>
      c.workspace_id === workspace.id &&
      c.kind === "dm" &&
      db.channel_members
        .filter((m) => m.channel_id === c.id)
        .map((m) => m.user_id)
        .sort()
        .join() === pair
  )
  if (existing) return { ok: true, message: "", id: existing.id }

  const id = newId()
  await mutate((d) => {
    d.channels.push({ id, workspace_id: workspace.id, name: "", kind: "dm", created_by: user.id, created_at: now(), epoch: 0 })
    for (const uid of [user.id, otherId]) {
      d.channel_members.push({ workspace_id: workspace.id, channel_id: id, user_id: uid, added_by: user.id, added_at: now() })
    }
  })
  return { ok: true, message: "", id }
}

/** Adds people to a group. Anyone in the group can. They cannot read what came before. */
export async function addGroupMembers(channelId: string, memberIds: string[]): Promise<Result> {
  const { user, workspace } = await requireContext()
  const db = await readDb()
  const ch = channelFor(db, channelId, workspace.id, user.id)
  if (!ch || ch.kind !== "group") return { ok: false, message: "That group is not here" }
  const current = new Set(channelMemberIds(db, ch))
  const ids = [...new Set(Array.isArray(memberIds) ? memberIds : [])].filter((id) => !current.has(id))
  if (ids.length === 0) return { ok: false, message: "Choose someone who is not in the group yet" }
  if (!ids.every((id) => inWorkspace(db, workspace.id, id))) {
    return { ok: false, message: "Everyone in the group has to be in this workspace" }
  }
  await mutate((d) => {
    for (const uid of ids) {
      d.channel_members.push({ workspace_id: workspace.id, channel_id: ch.id, user_id: uid, added_by: user.id, added_at: now() })
    }
  })
  return { ok: true, message: ids.length === 1 ? "Added to the group" : `${ids.length} people added` }
}

/**
 * Takes someone out of a group: yourself, any time; someone else, if you
 * started the group or are an owner or admin in it. They keep what they
 * already read and cannot read anything new.
 */
export async function removeGroupMember(channelId: string, userId: string): Promise<Result> {
  const { user, workspace, role } = await requireContext()
  const db = await readDb()
  const ch = channelFor(db, channelId, workspace.id, user.id)
  if (!ch || ch.kind !== "group") return { ok: false, message: "That group is not here" }
  if (userId !== user.id && !canManage(ch, role, user.id)) {
    return { ok: false, message: "Only whoever started the group, or an owner or admin, can remove people" }
  }
  if (!channelMemberIds(db, ch).includes(userId)) return { ok: false, message: "They are not in the group" }
  await mutate((d) => {
    d.channel_members = d.channel_members.filter((m) => !(m.channel_id === ch.id && m.user_id === userId))
  })
  return { ok: true, message: userId === user.id ? "You left the group" : "Removed from the group" }
}

export type SealedMessage = {
  id: string
  sender_id: string
  sender_device_id: string
  epoch: number
  iv: string
  ciphertext: string
  created_at: string
}

export type ChannelState = {
  channel: { id: string; kind: Channel["kind"]; name: string; epoch: number; createdBy: string }
  /** Who is in it now, for the header and the member list. */
  members: { id: string; name: string }[]
  /** Names for everyone who appears: members and past senders. */
  people: { id: string; name: string }[]
  canPost: boolean
  canManage: boolean
  rotationNeeded: boolean
  /** The devices the next key must be wrapped for, with their public keys. */
  devices: { id: string; user_id: string; public_key: PublicKey }[]
  /** Keys wrapped for this device, one per epoch it was given, with the wrapping device's public key. */
  keys: { epoch: number; wrapped_key: string; wrapper_public_key: PublicKey }[]
  messages: SealedMessage[]
}

/** Everything one device needs to open a chat. Only its own wrapped keys are included. */
export async function loadChannel(
  channelId: string,
  deviceId: string
): Promise<{ ok: true; state: ChannelState } | { ok: false; message: string }> {
  const { user, workspace, role } = await requireContext()
  const db = await readDb()
  const ch = channelFor(db, channelId, workspace.id, user.id)
  if (!ch) return { ok: false, message: "That chat is not here" }
  if (!myDevice(db, deviceId, user.id)) return { ok: false, message: "This device needs adding again" }

  const memberIds = channelMemberIds(db, ch)
  const messages = db.messages
    .filter((m) => m.channel_id === ch.id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(-200)
  const name = (id: string) => db.profiles.find((p) => p.id === id)?.full_name ?? "Someone"
  const peopleIds = new Set([...memberIds, ...messages.map((m) => m.sender_id)])
  const expected = new Set(expectedDeviceIds(db, ch))

  return {
    ok: true,
    state: {
      channel: { id: ch.id, kind: ch.kind, name: chatName(db, ch, user.id), epoch: ch.epoch, createdBy: ch.created_by },
      members: memberIds.map((id) => ({ id, name: name(id) })).sort((a, b) => a.name.localeCompare(b.name)),
      people: [...peopleIds].map((id) => ({ id, name: name(id) })),
      canPost: canPost(ch, role),
      canManage: canManage(ch, role, user.id),
      rotationNeeded: needsRotation(db, ch),
      devices: db.devices
        .filter((d) => expected.has(d.id))
        .map((d) => ({ id: d.id, user_id: d.user_id, public_key: d.public_key })),
      keys: db.channel_keys
        .filter((k) => k.channel_id === ch.id && k.device_id === deviceId)
        .flatMap((k) => {
          const wrapper = db.devices.find((d) => d.id === k.wrapped_by_device_id)
          return wrapper ? [{ epoch: k.epoch, wrapped_key: k.wrapped_key, wrapper_public_key: wrapper.public_key }] : []
        }),
      messages: messages.map((m) => ({
        id: m.id,
        sender_id: m.sender_id,
        sender_device_id: m.sender_device_id,
        epoch: m.epoch,
        iv: m.iv,
        ciphertext: m.ciphertext,
        created_at: m.created_at,
      })),
    },
  }
}

/**
 * Stores a new chat key, wrapped by this device for exactly the devices that
 * should hold it: no more (nobody who left), no fewer (nobody locked out).
 */
export async function rotateChannel(
  channelId: string,
  deviceId: string,
  epoch: number,
  wrapped: { device_id: string; wrapped_key: string }[]
): Promise<Result> {
  const { user, workspace } = await requireContext()
  const db = await readDb()
  const ch = channelFor(db, channelId, workspace.id, user.id)
  if (!ch) return { ok: false, message: "That chat is not here" }
  if (!myDevice(db, deviceId, user.id)) return { ok: false, message: "This device needs adding again" }
  if (epoch !== ch.epoch + 1) return { ok: false, message: "Someone else just changed the chat key. Opening it again." }
  if (!Array.isArray(wrapped)) return { ok: false, message: "That key is not in the right shape" }

  const given = wrapped.map((w) => w?.device_id).sort()
  if (given.join() !== expectedDeviceIds(db, ch).join()) {
    return { ok: false, message: "The people in the chat changed. Opening it again." }
  }
  // AES-KW of a 256-bit key is 40 bytes: 56 characters of base64.
  if (!wrapped.every((w) => typeof w.wrapped_key === "string" && w.wrapped_key.length === 56 && B64.test(w.wrapped_key))) {
    return { ok: false, message: "That key is not in the right shape" }
  }

  const saved = await mutate((d) => {
    const c = d.channels.find((x) => x.id === ch.id)!
    if (c.epoch !== epoch - 1) return false
    for (const w of wrapped) {
      d.channel_keys.push({
        workspace_id: c.workspace_id,
        channel_id: c.id,
        epoch,
        device_id: w.device_id,
        wrapped_by_device_id: deviceId,
        wrapped_key: w.wrapped_key,
        created_at: now(),
      })
    }
    c.epoch = epoch
    return true
  })
  return saved
    ? { ok: true, message: "New chat key made" }
    : { ok: false, message: "Someone else just changed the chat key. Opening it again." }
}

/** Stores a sealed message. Refused if the key is out of date, so nobody who left can read it. */
export async function postMessage(
  channelId: string,
  deviceId: string,
  epoch: number,
  sealed: { iv: string; ciphertext: string }
): Promise<Result & { id?: string }> {
  const { user, workspace, role } = await requireContext()
  const db = await readDb()
  const ch = channelFor(db, channelId, workspace.id, user.id)
  if (!ch) return { ok: false, message: "That chat is not here" }
  if (!canPost(ch, role)) return { ok: false, message: "Only owners and admins post announcements" }
  if (!myDevice(db, deviceId, user.id)) return { ok: false, message: "This device needs adding again" }
  if (epoch !== ch.epoch || needsRotation(db, ch)) {
    return { ok: false, message: "The chat key changed. Sending again." }
  }
  const { iv, ciphertext } = sealed ?? {}
  if (typeof iv !== "string" || iv.length !== 16 || !B64.test(iv)) {
    return { ok: false, message: "That message is not sealed properly" }
  }
  if (typeof ciphertext !== "string" || !B64.test(ciphertext) || ciphertext.length > MAX_SEALED) {
    return { ok: false, message: "That message is too long, or not sealed properly" }
  }

  const id = newId()
  await mutate((d) => {
    d.messages.push({
      id,
      workspace_id: ch.workspace_id,
      channel_id: ch.id,
      sender_id: user.id,
      sender_device_id: deviceId,
      epoch,
      iv,
      ciphertext,
      created_at: now(),
    })
    markRead(d, ch, user.id)
  })
  return { ok: true, message: "Sent", id }
}

export async function markChannelRead(channelId: string): Promise<Result> {
  const { user, workspace } = await requireContext()
  const ch = channelFor(await readDb(), channelId, workspace.id, user.id)
  if (!ch) return { ok: false, message: "That chat is not here" }
  await mutate((d) => markRead(d, ch, user.id))
  return { ok: true, message: "" }
}
