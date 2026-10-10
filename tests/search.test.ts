/**
 * Ctrl K search finds things by name in the workspace you are in, and never
 * anything from another workspace, someone else's private notes, or flags.
 */
import { beforeEach, describe, expect, it } from "vitest"

import * as actions from "@/lib/data/actions"
import { loadFixture } from "./fixture"
import { signedIn } from "./setup"

let f: Awaited<ReturnType<typeof loadFixture>>

beforeEach(async () => {
  f = await loadFixture()
  signedIn.workspaceId = undefined
})

const as = (id: string) => {
  signedIn.userId = id
}

const search = async (q: string) => {
  const r = await actions.searchEverything(q)
  if (!r.ok) throw new Error(r.message)
  return r.hits
}

describe("finding things", () => {
  it("finds each kind of record by name, with a link to it", async () => {
    as(f.charis.id)
    const org = f.db.organisations.find((o) => o.workspace_id === f.kilima.id)!
    const person = f.db.contacts.find((c) => c.workspace_id === f.kilima.id)!
    const deal = f.db.deals.find((d) => d.workspace_id === f.kilima.id)!
    const project = f.db.projects.find((p) => p.workspace_id === f.kilima.id)!
    const task = f.db.tasks.find((t) => t.workspace_id === f.kilima.id)!

    expect((await search(org.name)).find((h) => h.id === org.id)?.href).toBe(`/organisations/${org.id}`)
    expect((await search(person.full_name)).find((h) => h.id === person.id)?.href).toBe(`/people/${person.id}`)
    expect((await search(deal.title)).find((h) => h.id === deal.id)?.href).toBe(`/deals/${deal.id}`)
    expect((await search(project.name)).find((h) => h.id === project.id)?.href).toBe(`/projects/${project.id}`)
    expect((await search(task.title)).some((h) => h.id === task.id && h.kind === "task")).toBe(true)
    expect((await search("Wanjiru")).find((h) => h.kind === "member")?.href).toBe(`/team/${f.wanjiru.id}`)
  })

  it("ignores case and extra spaces, and puts names that start with the words first", async () => {
    as(f.charis.id)
    const org = f.db.organisations.find((o) => o.workspace_id === f.kilima.id)!
    const hits = await search(`  ${org.name.toUpperCase()}  `)
    expect(hits[0].id).toBe(org.id)
  })

  it("returns nothing for an empty search and refuses a very long one", async () => {
    as(f.charis.id)
    expect(await search("   ")).toEqual([])
    expect((await actions.searchEverything("x".repeat(101))).ok).toBe(false)
  })

  it("keeps to five of each kind", async () => {
    as(f.charis.id)
    const hits = await search("a")
    const byKind = hits.reduce<Record<string, number>>((acc, h) => ({ ...acc, [h.kind]: (acc[h.kind] ?? 0) + 1 }), {})
    for (const n of Object.values(byKind)) expect(n).toBeLessThanOrEqual(5)
  })
})

describe("what search never shows", () => {
  it("nothing from another workspace, even with the same names", async () => {
    as(f.charis.id)
    for (const q of ["a", "e", "PPE", "Safaricom", "Lab"]) {
      for (const h of await search(q)) expect(f.elsewhereIds, `${q}: ${h.title}`).not.toContain(h.id)
    }
  })

  it("not someone else's private note or whiteboard, but a shared one", async () => {
    as(f.wanjiru.id)
    await actions.captureNote("Zebra supplier thoughts", "Zebra private")
    const shared = (await actions.captureNote("Zebra plan for everyone", "Zebra shared"))!.id!
    await actions.shareNote(shared, { to: "workspace" })

    as(f.charis.id)
    const hits = await search("zebra")
    expect(hits.map((h) => h.title)).toEqual(["Zebra shared"])
    expect(hits[0].href).toBe(`/notebook?open=${shared}`)

    as(f.wanjiru.id)
    expect((await search("zebra")).map((h) => h.title).sort()).toEqual(["Zebra private", "Zebra shared"])
  })

  it("never private flags", async () => {
    as(f.charis.id)
    const flag = f.db.flags.find((x) => x.workspace_id === f.kilima.id)
    if (!flag) return
    const words = String((flag as Record<string, unknown>).behaviour ?? "").split(" ").slice(0, 2).join(" ")
    if (!words) return
    for (const h of await search(words)) expect(h.id).not.toBe(flag.id)
  })
})
