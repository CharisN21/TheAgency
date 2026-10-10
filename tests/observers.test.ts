/**
 * Observers (Directors and the like): they see only the tabs their workspace
 * opens to them, raise flags, chat, and never edit or take work.
 */
import { beforeEach, describe, expect, it } from "vitest"

import * as actions from "@/lib/data/actions"
import { mutate, readDb } from "@/lib/data/store"
import { requireTab } from "@/lib/data/session"
import { can, DEFAULT_OBSERVER_TABS } from "@/lib/data/types"
import { loadFixture } from "./fixture"
import { signedIn } from "./setup"

let f: Awaited<ReturnType<typeof loadFixture>>

beforeEach(async () => {
  f = await loadFixture()
  signedIn.workspaceId = undefined
  // Otieno becomes an Observer in Kilima Labs.
  await mutate((d) => {
    d.memberships.find((m) => m.user_id === f.otieno.id && m.workspace_id === f.kilima.id)!.role = "observer"
  })
})

const as = (id: string) => {
  signedIn.userId = id
}
const form = (fields: Record<string, string>) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}
const lands = async (p: Promise<unknown>) => {
  try {
    await p
    return "stayed"
  } catch (e) {
    return String((e as Error).message)
  }
}

describe("what an Observer may open", () => {
  it("opens Deals and Projects by default, and is sent to Today from the rest", async () => {
    as(f.otieno.id)
    expect(DEFAULT_OBSERVER_TABS).toEqual(["deals", "projects"])
    expect(await lands(requireTab("deals"))).toBe("stayed")
    expect(await lands(requireTab("projects"))).toBe("stayed")
    for (const tab of ["organisations", "people", "notebook", "team"] as const) {
      expect(await lands(requireTab(tab)), tab).toBe("redirect:/today")
    }
  })

  it("follows what an owner or admin ticks", async () => {
    as(f.charis.id)
    expect((await actions.setObserverTabs(["people", "team"])).ok).toBe(true)
    as(f.otieno.id)
    expect(await lands(requireTab("people"))).toBe("stayed")
    expect(await lands(requireTab("deals"))).toBe("redirect:/today")
  })

  it("only owners and admins choose, and only real tabs", async () => {
    as(f.achieng.id) // member
    expect((await actions.setObserverTabs(["people"])).ok).toBe(false)
    as(f.otieno.id) // the Observer themselves
    expect((await actions.setObserverTabs(["people"])).ok).toBe(false)
    as(f.wanjiru.id) // admin
    expect((await actions.setObserverTabs(["settings"])).ok).toBe(false)
    expect((await actions.setObserverTabs(["deals", "deals"])).ok).toBe(true)
    expect((await readDb()).workspaces.find((w) => w.id === f.kilima.id)!.observer_tabs).toEqual(["deals"])
  })

  it("never limits anyone else", async () => {
    as(f.charis.id)
    await actions.setObserverTabs([])
    for (const id of [f.charis.id, f.wanjiru.id, f.achieng.id, f.brian.id]) {
      as(id)
      expect(await lands(requireTab("organisations")), id).toBe("stayed")
    }
  })

  it("finds in search only what lives in the open tabs", async () => {
    as(f.otieno.id)
    const r = await actions.searchEverything("a")
    if (!r.ok) throw new Error(r.message)
    const kinds = new Set(r.hits.map((h) => h.kind))
    for (const k of ["organisation", "person", "member", "note", "board"]) expect(kinds.has(k as never), k).toBe(false)
    expect([...kinds].every((k) => ["deal", "project", "task"].includes(k))).toBe(true)
  })
})

describe("what an Observer may do", () => {
  it("raises a flag", async () => {
    as(f.otieno.id)
    const r = await actions.raiseFlag(
      form({ severity: "warning", situation: "In the Monday review", behaviour: "The KEBS task has slipped three weeks", impact: "Safaricom may walk", about_user_id: f.achieng.id })
    )
    expect(r.ok, r.message).toBe(true)
  })

  it("never edits records or takes work", async () => {
    as(f.otieno.id)
    expect(can.edit("observer")).toBe(false)
    expect(can.work("observer")).toBe(false)
    expect((await actions.createTask(form({ title: "Something" }))).ok).toBe(false)
    expect((await actions.logActivity(form({ summary: "A call", organisation_id: f.db.organisations.find((o) => o.workspace_id === f.kilima.id)!.id }))).ok).toBe(false)
    as(f.charis.id)
    expect((await actions.createTask(form({ title: "For Otieno", assignee_id: f.otieno.id }))).ok).toBe(false)
  })

  it("chats: starts a direct message with a team lead", async () => {
    as(f.otieno.id)
    const dm = await actions.startDirectMessage(f.wanjiru.id)
    expect(dm.ok).toBe(true)
    expect((await actions.postMessage(dm.id!, { text: "Can we push the KEBS task up?" })).ok).toBe(true)
  })

  it("can be invited as an Observer with a title", async () => {
    as(f.charis.id)
    expect((await actions.createInvite(form({ email: "director@example.com", role: "observer", title: "Director" }))).ok).toBe(true)
    expect((await readDb()).invites.find((i) => i.email === "director@example.com")).toMatchObject({ role: "observer", title: "Director" })
  })
})
