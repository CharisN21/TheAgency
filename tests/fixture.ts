import { randomUUID } from "node:crypto"

import { seed, writeDb } from "@/lib/data/store"
import type { Database } from "@/lib/data/types"

/**
 * The demo data, plus a second workspace ("Elsewhere") holding a copy of
 * every Kilima Labs record under new ids, and Zawadi, who belongs only to
 * Elsewhere. If anything from Elsewhere shows up while working in Kilima
 * Labs, or the other way round, the tests fail.
 */
export async function loadFixture() {
  const db = seed()
  const kilima = db.workspaces.find((w) => w.name === "Kilima Labs")!
  const person = (first: string) => db.profiles.find((p) => p.full_name.startsWith(first))!

  const zawadi = { id: randomUUID(), email: "zawadi@example.com", full_name: "Zawadi Achieng", created_at: kilima.created_at }
  const elsewhere = { ...kilima, id: randomUUID(), name: "Elsewhere", created_by: zawadi.id }
  db.profiles.push(zawadi)
  db.workspaces.push(elsewhere)
  db.memberships.push({ workspace_id: elsewhere.id, user_id: zawadi.id, role: "owner", created_at: kilima.created_at })

  // Copy every Kilima record into Elsewhere, giving each copy (and every link between copies) a new id.
  const tables = (Object.keys(db) as (keyof Database)[]).filter(
    (t) => t !== "workspaces" && t !== "memberships" && t !== "profiles",
  )
  const rows: { table: keyof Database; row: Record<string, unknown> }[] = []
  for (const table of tables) {
    for (const row of db[table] as unknown as Record<string, unknown>[]) {
      if (row.workspace_id === kilima.id) rows.push({ table, row })
    }
  }
  const newIds = new Map<string, string>([[kilima.id, elsewhere.id]])
  for (const { row } of rows) if (typeof row.id === "string") newIds.set(row.id, randomUUID())

  let text = JSON.stringify(rows)
  for (const [from, to] of newIds) text = text.split(from).join(to)
  const copies = JSON.parse(text) as typeof rows
  for (const { table, row } of copies) (db[table] as unknown as unknown[]).push(row)

  await writeDb(db)

  return {
    db,
    kilima,
    elsewhere,
    zawadi,
    charis: person("Charis"),
    wanjiru: person("Wanjiru"),
    otieno: person("Otieno"),
    achieng: person("Achieng"),
    brian: person("Brian"),
    /** Every id that belongs to Elsewhere and nowhere else. */
    elsewhereIds: [elsewhere.id, zawadi.id, ...[...newIds.values()].filter((id) => id !== elsewhere.id)],
    /** The copy of a Kilima record, in Elsewhere. */
    copyOf: (id: string) => newIds.get(id)!,
  }
}

/** Fails with the first leaked id, so the message says what got through. */
export function leaked(result: unknown, ids: string[]) {
  const text = JSON.stringify(result) ?? ""
  return ids.find((id) => text.includes(id)) ?? null
}
