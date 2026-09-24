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
export const newId = () => randomUUID()
export const newToken = () => randomBytes(9).toString("base64url")

/** Demo data so the screens have something to judge. Reset it from Settings. */
export function seed(): Database {
  const charis = { id: newId(), email: "charis@example.com", full_name: "Charis N.", created_at: now() }
  const people = [
    { id: newId(), email: "wanjiru@example.com", full_name: "Wanjiru Kamau", created_at: now() },
    { id: newId(), email: "otieno@example.com", full_name: "Otieno Odhiambo", created_at: now() },
    { id: newId(), email: "achieng@example.com", full_name: "Achieng Njeri", created_at: now() },
    { id: newId(), email: "brian@example.com", full_name: "Brian Mwangi", created_at: now() },
  ]
  const kilima = { id: newId(), name: "Kilima Labs", accent_color: "#7c1f35", created_by: charis.id, created_at: now() }
  const ppe = { id: newId(), name: "Nairobi PPE Supply", accent_color: "#186b33", created_by: charis.id, created_at: now() }

  return {
    profiles: [charis, ...people],
    companies: [kilima, ppe],
    memberships: [
      { company_id: kilima.id, user_id: charis.id, role: "owner", title: "Founder", created_at: now() },
      { company_id: kilima.id, user_id: people[0].id, role: "admin", title: "Operations lead", created_at: now() },
      { company_id: kilima.id, user_id: people[1].id, role: "member", title: "Sales", created_at: now() },
      { company_id: kilima.id, user_id: people[2].id, role: "member", title: "Procurement", created_at: now() },
      { company_id: kilima.id, user_id: people[3].id, role: "viewer", title: "Accountant", created_at: now() },
      { company_id: ppe.id, user_id: charis.id, role: "owner", title: "Founder", created_at: now() },
    ],
    invites: [
      {
        id: newId(),
        company_id: kilima.id,
        email: "kevin@example.com",
        role: "member",
        token: newToken(),
        invited_by: charis.id,
        expires_at: new Date(Date.now() + 7 * 864e5).toISOString(),
        created_at: now(),
      },
    ],
    activity_log: [],
  }
}

let cache: Database | null = null

export async function readDb(): Promise<Database> {
  if (cache) return cache
  try {
    cache = JSON.parse(await readFile(FILE, "utf8")) as Database
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

export async function log(db: Database, company_id: string, actor_id: string, action: string) {
  db.activity_log.unshift({ id: newId(), company_id, actor_id, action, created_at: now() })
  db.activity_log = db.activity_log.slice(0, 200)
}
