import "server-only"

import { randomBytes, randomUUID } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import type { Database } from "./types"

/**
 * The local store: one JSON file under .data/, which is git-ignored.
 * It stands in for Supabase until the flows and the feel are settled.
 * Everything reads and writes through here, so swapping in Postgres later
 * means rewriting this file and nothing else.
 */

const DIR = path.join(process.cwd(), ".data")
const FILE = path.join(DIR, "agency.json")

const now = () => new Date().toISOString()
const days = (n: number) => new Date(Date.now() + n * 864e5).toISOString()
export const newId = () => randomUUID()
export const newToken = () => randomBytes(9).toString("base64url")

/** Demo data so the screens have something to judge. Reset it from Settings. */
export function seed(): Database {
  const charis = { id: newId(), email: "charis@example.com", full_name: "Charis N.", created_at: now() }
  const wanjiru = { id: newId(), email: "wanjiru@example.com", full_name: "Wanjiru Kamau", created_at: now() }
  const otieno = { id: newId(), email: "otieno@example.com", full_name: "Otieno Odhiambo", created_at: now() }
  const achieng = { id: newId(), email: "achieng@example.com", full_name: "Achieng Njeri", created_at: now() }
  const brian = { id: newId(), email: "brian@example.com", full_name: "Brian Mwangi", created_at: now() }

  const kilima = { id: newId(), name: "Kilima Labs", accent_color: "#7c1f35", created_by: charis.id, created_at: now() }
  const ppe = { id: newId(), name: "Nairobi PPE Supply", accent_color: "#186b33", created_by: charis.id, created_at: now() }

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

  const mercy = contact("Mercy Wambui", "Sales lead", vision.id, charis.id, days(0), ["Decision maker"])
  const james = contact("James Kiprono", "Partner manager", safaricom.id, wanjiru.id, days(4))
  const grace = contact("Grace Atieno", "Procurement officer", county.id, charis.id, days(-2), ["Slow to reply"])
  const peter = contact("Peter Njoroge", "Workshop manager", ridge.id, otieno.id, days(11))
  const sam = contact("Samuel Kiptoo", "Account manager", lab.id, achieng.id, days(21))

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

  return {
    profiles: [charis, wanjiru, otieno, achieng, brian],
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
    organisations: [vision, safaricom, county, ridge, lab],
    contacts: [mercy, james, grace, peter, sam],
    deals,
    views: [],
    activities: [
      act("call", "Called about mask pricing — promised band 3 rates", 6, { organisation_id: vision.id, contact_id: mercy.id, deal_id: deals[0].id }),
      act("note", "Will discount at 500 units", 6, { organisation_id: vision.id, contact_id: mercy.id }),
      act("meeting", "Site visit, Industrial Area warehouse", 22, { organisation_id: vision.id, contact_id: mercy.id }),
      act("whatsapp", "Sent the revised quote", 2, { organisation_id: safaricom.id, contact_id: james.id, deal_id: deals[1].id }, wanjiru.id),
      act("email", "Delivery note and invoice", 1, { organisation_id: county.id, contact_id: grace.id, deal_id: deals[2].id }),
      act("visit", "Walked the Thika depot", 9, { organisation_id: ridge.id, contact_id: peter.id }, otieno.id),
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
