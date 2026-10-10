import "server-only"

import { randomBytes, randomUUID } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import { takePushes } from "@/lib/push/outbox"
import { periodStart, type Database } from "./types"

/**
 * The local store: one JSON file under .data/, which is git-ignored.
 * It stands in for Supabase until the flows and the feel are settled.
 * Everything reads and writes through here, so swapping in Postgres later
 * means rewriting this file and nothing else.
 */

// Tests point this at a throwaway folder so they never touch your data.
const DIR = process.env.AGENCY_DATA_DIR ?? path.join(process.cwd(), ".data")
const FILE = path.join(DIR, "agency.json")

const now = () => new Date().toISOString()
const days = (n: number) => new Date(Date.now() + n * 864e5).toISOString()
export const newId = () => randomUUID()
export const newToken = () => randomBytes(9).toString("base64url")

/** Demo data so the screens have something to judge. Reset it from Settings. */
export function seed(): Database {
  const charis = { id: newId(), email: "charis@example.com", full_name: "Charis N.", founder: true, created_at: now() }
  const wanjiru = { id: newId(), email: "wanjiru@example.com", full_name: "Wanjiru Kamau", created_at: now() }
  const otieno = { id: newId(), email: "otieno@example.com", full_name: "Otieno Odhiambo", created_at: now() }
  const achieng = { id: newId(), email: "achieng@example.com", full_name: "Achieng Njeri", created_at: now() }
  const brian = { id: newId(), email: "brian@example.com", full_name: "Brian Mwangi", created_at: now() }

  const kilimaVenture = { id: newId(), name: "Kilima Labs", accent_color: "#7c1f35", created_by: charis.id, created_at: now() }
  const ppeVenture = { id: newId(), name: "Nairobi PPE Supply", accent_color: "#186b33", created_by: charis.id, created_at: now() }
  const kilima = { id: newId(), venture_id: kilimaVenture.id, name: "Kilima Labs", accent_color: "#7c1f35", created_by: charis.id, created_at: now() }
  const ppe = { id: newId(), venture_id: ppeVenture.id, name: "Nairobi PPE Supply", accent_color: "#186b33", created_by: charis.id, created_at: now() }

  const org = (
    name: string,
    category: "supplier" | "client" | "partner" | "prospect" | "service",
    what: string,
    location: string,
    tags: string[],
    owner = charis.id
  ) => ({
    id: newId(),
    workspace_id: kilima.id,
    name,
    category,
    what_they_do: what,
    location,
    phone: "+254 7•• ••• •••",
    email: `hello@${name.toLowerCase().replace(/[^a-z]+/g, "")}.co.ke`,
    owner_id: owner,
    tags,
    created_at: now(),
  })

  const vision = org("Vision Safety", "supplier", "PPE, masks and safety wear", "Industrial Area, Nairobi", ["PPE", "KEBS certified"])
  const safaricom = org("Safaricom Partners", "client", "Corporate safety procurement", "Westlands, Nairobi", ["Enterprise"], wanjiru.id)
  const county = org("Kiambu County Office", "client", "County health procurement", "Kiambu", ["Public sector"])
  const ridge = org("Ridge Moto Spares", "partner", "Motorcycle parts and service", "Thika", ["Logistics"], otieno.id)
  const lab = org("Eastern Reagents", "supplier", "Laboratory reagents and glassware", "Mombasa Road, Nairobi", ["Lab"], achieng.id)
  // Entered twice by two people — what the duplicates review is for.
  const visionAgain = { ...org("Vision Safety Ltd", "supplier", "Safety boots and overalls", "", ["Boots"], otieno.id), location: undefined }

  const contact = (
    full_name: string,
    title: string,
    organisation_id: string,
    owner = charis.id,
    next_touch_at?: string,
    tags: string[] = []
  ) => ({
    id: newId(),
    workspace_id: kilima.id,
    organisation_id,
    full_name,
    title,
    email: `${full_name.split(" ")[0].toLowerCase()}@example.com`,
    phone: "+254 7•• ••• •••",
    tags,
    owner_id: owner,
    next_touch_at,
    created_at: now(),
  })

  const mercy = { ...contact("Mercy Wambui", "Sales lead", vision.id, charis.id, days(0), ["Decision maker"]), phone: "+254 722 410 118" }
  const mercyAgain = {
    ...contact("Mercy W.", "Sales", visionAgain.id, otieno.id, undefined, ["Boots"]),
    phone: "0722410118",
    email: "mercy.wambui@visionsafety.co.ke",
  }
  const james = contact("James Kiprono", "Partner manager", safaricom.id, wanjiru.id, days(4))
  const grace = contact("Grace Atieno", "Procurement officer", county.id, charis.id, days(-2), ["Slow to reply"])
  const peter = contact("Peter Njoroge", "Workshop manager", ridge.id, otieno.id, days(11))
  const sam = contact("Samuel Kiptoo", "Account manager", lab.id, achieng.id, days(21))
  // Same name, different man. The review should let you say so once and forget it.
  const jamesMechanic = { ...contact("James Kiprono", "Mechanic", ridge.id, otieno.id), email: "kiprono.j@ridgemoto.co.ke" }

  const deal = (
    title: string,
    organisation_id: string,
    contact_id: string,
    value: number,
    stage: "new" | "quoted" | "negotiating" | "won" | "lost",
    close_in: number,
    owner = charis.id
  ) => ({
    id: newId(),
    workspace_id: kilima.id,
    title,
    organisation_id,
    contact_id,
    value,
    stage,
    expected_close: days(close_in),
    owner_id: owner,
    created_at: now(),
    stage_changed_at: days(-3),
    closed_at: stage === "won" || stage === "lost" ? days(-1) : undefined,
  })

  const deals = [
    deal("Masks — 500 units", vision.id, mercy.id, 240_000, "quoted", 6),
    deal("PPE batch 2", safaricom.id, james.id, 480_000, "negotiating", 12, wanjiru.id),
    deal("First-aid kits", county.id, grace.id, 310_000, "won", -1),
    deal("Depot lease", ridge.id, peter.id, 600_000, "new", 20, otieno.id),
    deal("Lab reagents Q4", lab.id, sam.id, 950_000, "quoted", 9, achieng.id),
    deal("Overalls — 200 units", safaricom.id, james.id, 180_000, "lost", -4, wanjiru.id),
  ]

  const act = (
    type: "call" | "meeting" | "whatsapp" | "email" | "visit" | "note" | "system",
    summary: string,
    ago: number,
    ids: { organisation_id?: string; contact_id?: string; deal_id?: string },
    actor = charis.id
  ) => ({
    id: newId(),
    workspace_id: kilima.id,
    type,
    summary,
    occurred_at: days(-ago),
    actor_id: actor,
    ...ids,
  })

  // Phase 1: one live project, tasks in and out of it, and objectives for the period.
  const ppeProject = {
    id: newId(),
    workspace_id: kilima.id,
    name: "PPE Campaign",
    scope: "Supply 2,000 PPE kits to Safaricom Partners by the end of October: masks, gloves and overalls, KEBS certified.",
    organisation_id: safaricom.id,
    deal_id: deals[1].id,
    lead_id: wanjiru.id,
    member_ids: [wanjiru.id, otieno.id, achieng.id],
    status: "active" as const,
    health: "on_track" as const,
    due_at: days(35),
    cadence: "weekly" as const,
    created_at: days(-14),
  }

  const task = (
    title: string,
    assignee_id: string,
    status: "todo" | "doing" | "review" | "done" | "blocked",
    due_in: number | undefined,
    priority: "low" | "medium" | "high",
    links: { project_id?: string; organisation_id?: string; deal_id?: string; contact_id?: string } = {}
  ) => ({
    id: newId(),
    workspace_id: kilima.id,
    title,
    status,
    priority,
    due_at: due_in === undefined ? undefined : days(due_in),
    assignee_id,
    created_by: charis.id,
    created_at: days(-10),
    completed_at: status === "done" ? days(-2) : undefined,
    ...links,
  })

  const p = { project_id: ppeProject.id, organisation_id: safaricom.id }
  const tasks = [
    task("Confirm KEBS certificate", wanjiru.id, "doing", 0, "high", p),
    task("Send quote to Safaricom", otieno.id, "todo", 2, "medium", { ...p, deal_id: deals[1].id, contact_id: james.id }),
    task("Collect 3 supplier prices", achieng.id, "done", -3, "medium", p),
    task("Book truck for first delivery", wanjiru.id, "todo", 12, "low", p),
    task("Chase glove sample", otieno.id, "blocked", -1, "high", p),
    // Not every task needs a project.
    task("Call Mercy about the band 3 price", charis.id, "todo", 1, "high", { organisation_id: vision.id, deal_id: deals[0].id, contact_id: mercy.id }),
    task("Renew the Kiambu supplier registration", charis.id, "todo", 9, "medium", { organisation_id: county.id }),
    task("Read the new KEBS guidance", charis.id, "todo", undefined, "low"),
  ]

  // A few weeks of finished work, so the analytics trend has something to show.
  const history: [string, string, number, number][] = [
    // title, who, due (days from now), finished (days from now)
    ["Price list for PPE batch 1", wanjiru.id, -38, -39],
    ["Visit Thika depot", otieno.id, -33, -31],
    ["Register with Kiambu county portal", charis.id, -27, -28],
    ["Send PPE samples to Safaricom", otieno.id, -24, -24],
    ["Mask supplier shortlist", achieng.id, -20, -21],
    ["Book KEBS inspection", wanjiru.id, -17, -15],
    ["Invoice first-aid kits", charis.id, -12, -12],
    ["Reagent price check", achieng.id, -9, -10],
    ["Safaricom delivery schedule draft", wanjiru.id, -6, -6],
  ]
  for (const [title, who, due, finished] of history) {
    tasks.push({
      ...task(title, who, "done", due, "medium", who === charis.id ? {} : { project_id: ppeProject.id }),
      created_at: days(due - 10),
      completed_at: days(finished),
    })
  }

  const objective = (
    owner_id: string,
    title: string,
    period: "week" | "month" | "year",
    measure: "number" | "money" | "done" | "won",
    target: number | undefined,
    progress = 0
  ) => ({
    id: newId(),
    workspace_id: kilima.id,
    owner_id,
    set_by: charis.id,
    title,
    period,
    period_start: periodStart(period),
    measure,
    target,
    progress,
    done: false,
    created_at: now(),
  })

  const objectives = [
    objective(charis.id, "Visit 5 suppliers", "week", "number", 5, 2),
    objective(charis.id, "Win KSh 1,000,000 in deals", "month", "won", 1_000_000),
    objective(charis.id, "Sign the Safaricom supply agreement", "month", "done", undefined),
    objective(charis.id, "Turnover of KSh 12M across Kilima Labs", "year", "money", 12_000_000, 3_400_000),
    objective(wanjiru.id, "KEBS certificates for all PPE lines", "month", "number", 3, 1),
  ]

  const creditTermsId = newId()
  const leadTimeId = newId()

  return {
    profiles: [charis, wanjiru, otieno, achieng, brian],
    ventures: [kilimaVenture, ppeVenture],
    workspaces: [kilima, ppe],
    memberships: [
      { workspace_id: kilima.id, user_id: charis.id, role: "owner", title: "Founder", created_at: now() },
      { workspace_id: kilima.id, user_id: wanjiru.id, role: "admin", title: "Operations lead", created_at: now() },
      { workspace_id: kilima.id, user_id: otieno.id, role: "member", title: "Sales", created_at: now() },
      { workspace_id: kilima.id, user_id: achieng.id, role: "member", title: "Procurement", created_at: now() },
      { workspace_id: kilima.id, user_id: brian.id, role: "viewer", title: "Accountant", created_at: now() },
      { workspace_id: ppe.id, user_id: charis.id, role: "owner", title: "Founder", created_at: now() },
    ],
    invites: [
      {
        id: newId(),
        workspace_id: kilima.id,
        email: "kevin@example.com",
        role: "member",
        token: newToken(),
        invited_by: charis.id,
        expires_at: days(7),
        created_at: now(),
      },
    ],
    organisations: [vision, safaricom, county, ridge, lab, visionAgain],
    contacts: [mercy, james, grace, peter, sam, mercyAgain, jamesMechanic],
    deals,
    views: [],
    not_duplicates: [],
    projects: [ppeProject],
    tasks,
    objectives,
    retrospectives: [],
    team_suggestions: [],
    // Two fields to show the idea; add your own in Settings.
    custom_fields: [
      {
        id: creditTermsId,
        workspace_id: kilima.id,
        object: "organisations" as const,
        label: "Credit terms",
        type: "choice" as const,
        options: ["Cash on delivery", "7 days", "30 days", "60 days"],
        position: 0,
        created_by: charis.id,
        created_at: now(),
      },
      {
        id: leadTimeId,
        workspace_id: kilima.id,
        object: "organisations" as const,
        label: "Lead time (days)",
        type: "number" as const,
        options: [],
        position: 1,
        created_by: charis.id,
        created_at: now(),
      },
    ],
    notifications: [
      {
        id: newId(),
        workspace_id: kilima.id,
        user_id: charis.id,
        type: "task_done" as const,
        title: "Achieng finished Collect 3 supplier prices",
        href: `/projects/${ppeProject.id}`,
        actor_id: achieng.id,
        created_at: days(-2),
      },
      {
        id: newId(),
        workspace_id: kilima.id,
        user_id: charis.id,
        type: "check_in_posted" as const,
        title: "Wanjiru checked in on PPE Campaign",
        href: `/projects/${ppeProject.id}`,
        actor_id: wanjiru.id,
        created_at: days(-7),
        read_at: days(-6),
      },
    ],
    notification_prefs: [],
    push_subscriptions: [],
    notes: [],
    channels: [],
    channel_members: [],
    messages: [],
    channel_reads: [],
    custom_values: [
      { workspace_id: kilima.id, field_id: creditTermsId, record_id: vision.id, value: "30 days" },
      { workspace_id: kilima.id, field_id: leadTimeId, record_id: vision.id, value: "7" },
    ],
    flags: [
      {
        id: newId(),
        workspace_id: kilima.id,
        raised_by: charis.id,
        about_user_id: otieno.id,
        project_id: ppeProject.id,
        severity: "warning" as const,
        situation: "The PPE Campaign over the last two weeks",
        behaviour: "the glove sample has been blocked for days and nobody was told until the check-in",
        impact: "the Safaricom quote cannot go out and the first delivery is at risk",
        status: "open" as const,
        created_at: days(-1),
      },
    ],
    check_ins: [
      {
        id: newId(),
        workspace_id: kilima.id,
        project_id: ppeProject.id,
        author_id: wanjiru.id,
        moved: "Achieng collected prices from 3 suppliers; Vision Safety is cheapest on masks.",
        stuck: "KEBS certificate for the gloves has not come back.",
        next: "Confirm the KEBS certificate, send the quote to Safaricom, book the first truck.",
        progress: 20,
        risks: "If KEBS slips past 5 Oct, the first delivery moves too.",
        health: "on_track" as const,
        created_at: days(-7),
      },
    ],
    activities: [
      act("call", "Called about mask pricing — promised band 3 rates", 6, { organisation_id: vision.id, contact_id: mercy.id, deal_id: deals[0].id }),
      act("note", "Will discount at 500 units", 6, { organisation_id: vision.id, contact_id: mercy.id }),
      act("meeting", "Site visit, Industrial Area warehouse", 22, { organisation_id: vision.id, contact_id: mercy.id }),
      act("whatsapp", "Sent the revised quote", 2, { organisation_id: safaricom.id, contact_id: james.id, deal_id: deals[1].id }, wanjiru.id),
      act("email", "Delivery note and invoice", 1, { organisation_id: county.id, contact_id: grace.id, deal_id: deals[2].id }),
      act("visit", "Walked the Thika depot", 9, { organisation_id: ridge.id, contact_id: peter.id }, otieno.id),
      act("whatsapp", "Asked for the safety boots price list", 4, { organisation_id: visionAgain.id, contact_id: mercyAgain.id }, otieno.id),
    ],
  }
}

let cache: Database | null = null

export async function readDb(): Promise<Database> {
  if (cache) return cache
  try {
    const parsed = JSON.parse(await readFile(FILE, "utf8")) as Partial<Database>
    // A store written before the workspace rename is not worth migrating by hand.
    if (!parsed.workspaces || !parsed.deals) throw new Error("stale shape")
    parsed.views ??= []
    // Ventures came later: each workspace without one becomes its own venture,
    // and anyone who had created a workspace stays able to (a founder).
    parsed.ventures ??= []
    for (const w of parsed.workspaces) {
      if (!w.venture_id || !parsed.ventures.some((v) => v.id === w.venture_id)) {
        const v = { id: randomUUID(), name: w.name, accent_color: w.accent_color, created_by: w.created_by, created_at: w.created_at }
        parsed.ventures.push(v)
        w.venture_id = v.id
      }
    }
    for (const p of parsed.profiles ?? []) {
      if (p.founder === undefined && parsed.workspaces.some((w) => w.created_by === p.id)) p.founder = true
    }
    parsed.not_duplicates ??= []
    parsed.projects ??= []
    parsed.tasks ??= []
    parsed.objectives ??= []
    parsed.check_ins ??= []
    parsed.flags ??= []
    parsed.retrospectives ??= []
    parsed.team_suggestions ??= []
    parsed.custom_fields ??= []
    parsed.custom_values ??= []
    parsed.notifications ??= []
    parsed.notification_prefs ??= []
    parsed.push_subscriptions ??= []
    parsed.notes ??= []
    parsed.channels ??= []
    parsed.channel_members ??= []
    parsed.messages ??= []
    // Chat once kept per-device keys (end-to-end). It no longer does, so those
    // records go, and so do messages sealed that way: the server cannot open them.
    delete (parsed as Record<string, unknown>).devices
    delete (parsed as Record<string, unknown>).channel_keys
    parsed.messages = parsed.messages.filter((m) => typeof (m as { body?: unknown }).body === "string")
    // One Announcements per workspace (an older restart could make a second).
    const seen = new Set<string>()
    parsed.channels = parsed.channels
      .map((c) => {
        const x = c as unknown as Record<string, unknown>
        if (x.kind === "general") Object.assign(x, { kind: "announcements", name: "Announcements" })
        delete x.epoch
        delete x.rekey_epoch
        return c
      })
      .filter((c) => {
        if (c.kind !== "announcements") return true
        if (seen.has(c.workspace_id)) return false
        seen.add(c.workspace_id)
        return true
      })
    parsed.channel_reads ??= []
    cache = parsed as Database
  } catch {
    cache = seed()
    await writeDb(cache)
  }
  return cache
}

export async function writeDb(db: Database): Promise<void> {
  cache = db
  await mkdir(DIR, { recursive: true })
  await writeFile(FILE, JSON.stringify(db, null, 2), "utf8")
}

/** Read, change, write — the local stand-in for a transaction. */
export async function mutate<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
  const db = await readDb()
  const result = await fn(db)
  await writeDb(db)
  // Banners go out only once the change is saved, and never hold it up for long.
  const pushes = takePushes(db)
  if (pushes.length > 0) {
    const { deliverPush } = await import("@/lib/push/send")
    await Promise.race([deliverPush(pushes), new Promise((r) => setTimeout(r, 4000))]).catch(() => {})
  }
  return result
}

export async function resetDb(): Promise<void> {
  await writeDb(seed())
}

/** Every change worth remembering lands in the timeline. */
export function log(
  db: Database,
  workspace_id: string,
  actor_id: string,
  summary: string,
  ids: { organisation_id?: string; contact_id?: string; deal_id?: string } = {},
  type: "system" | "note" = "system"
) {
  db.activities.unshift({
    id: newId(),
    workspace_id,
    type,
    summary,
    occurred_at: now(),
    actor_id,
    ...ids,
  })
  db.activities = db.activities.slice(0, 500)
}
