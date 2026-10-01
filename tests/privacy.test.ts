/**
 * Rule 1 and rule 2 from CLAUDE.md, checked on every pull request:
 * a person only ever sees the workspaces they belong to, and private flags
 * and notifications stay with the people they are for.
 */
import { beforeEach, describe, expect, it } from "vitest"

import * as actions from "@/lib/data/actions"
import * as q from "@/lib/data/queries"
import { readDb } from "@/lib/data/store"
import { requireContext } from "@/lib/data/session"
import { leaked, loadFixture } from "./fixture"
import { signedIn } from "./setup"

let f: Awaited<ReturnType<typeof loadFixture>>

beforeEach(async () => {
  f = await loadFixture()
  signedIn.userId = undefined
  signedIn.workspaceId = undefined
})

const form = (fields: Record<string, string>) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

describe("one workspace never sees another's records", () => {
  it("lists in Kilima Labs hold nothing from Elsewhere", async () => {
    const k = f.kilima.id
    const lists: [string, unknown][] = [
      ["members", await q.listMembers(k)],
      ["invites", await q.listInvites(k)],
      ["organisations", await q.listOrganisations(k)],
      ["people", await q.listContacts(k)],
      ["people tags", await q.listPeopleTags(k)],
      ["deals", await q.listDeals(k)],
      ["pipeline", await q.getPipeline(k)],
      ["tasks", await q.listTasks(k, { withDone: true })],
      ["assignees", await q.listAssignees(k)],
      ["projects", await q.listProjects(k)],
      ["objectives", await q.listObjectives(k, f.charis.id)],
      ["flags", await q.listFlags(k, { id: f.charis.id, role: "owner" })],
      ["custom fields", await q.listCustomFields(k)],
      ["duplicate people", await q.listDuplicatePeople(k)],
      ["duplicate organisations", await q.listDuplicateOrganisations(k)],
      ["analytics", await q.getAnalytics(k)],
      ["notifications", await q.listNotifications(k, f.charis.id)],
    ]
    for (const [name, result] of lists) {
      expect(leaked(result, f.elsewhereIds), `${name} leaked an Elsewhere id`).toBeNull()
    }
  })

  it("the copies really are in Elsewhere, so the check above means something", async () => {
    const deals = await q.listDeals(f.elsewhere.id)
    expect(deals.length).toBe((await q.listDeals(f.kilima.id)).length)
    expect(deals.length).toBeGreaterThan(0)
  })

  it("opening an Elsewhere record from Kilima Labs finds nothing", async () => {
    const k = f.kilima.id
    const deal = f.db.deals.find((d) => d.workspace_id === k)!
    const org = f.db.organisations.find((o) => o.workspace_id === k)!
    const person = f.db.contacts.find((c) => c.workspace_id === k)!
    const project = f.db.projects.find((p) => p.workspace_id === k)!
    const flag = f.db.flags.find((x) => x.workspace_id === k)!

    expect(await q.getDeal(k, f.copyOf(deal.id))).toBeNull()
    expect(await q.getOrganisation(k, f.copyOf(org.id))).toBeNull()
    expect(await q.getPerson(k, f.copyOf(person.id))).toBeNull()
    expect(await q.getProject(k, f.copyOf(project.id))).toBeNull()
    expect(await q.getFlag(k, { id: f.charis.id, role: "owner" }, f.copyOf(flag.id))).toBeNull()
    expect(await q.getMemberOverview(k, f.zawadi.id)).toBeNull()
  })

  it("asking for a workspace you are not in does not let you in", async () => {
    signedIn.userId = f.zawadi.id
    signedIn.workspaceId = f.kilima.id
    const ctx = await requireContext()
    expect(ctx.workspace.id).toBe(f.elsewhere.id)
    expect(ctx.workspaces.map((w) => w.id)).toEqual([f.elsewhere.id])
  })

  it("changes aimed at another workspace's records are refused and change nothing", async () => {
    signedIn.userId = f.zawadi.id
    signedIn.workspaceId = f.kilima.id
    const deal = f.db.deals.find((d) => d.workspace_id === f.kilima.id)!
    const person = f.db.contacts.find((c) => c.workspace_id === f.kilima.id)!
    const before = { deal: deal.title, person: person.full_name }

    expect((await actions.updateDeal(deal.id, form({ title: "Taken over" }))).ok).toBe(false)
    expect((await actions.updateContact(person.id, form({ full_name: "Taken over" }))).ok).toBe(false)

    const db = await readDb()
    expect(db.deals.find((d) => d.id === deal.id)!.title).toBe(before.deal)
    expect(db.contacts.find((c) => c.id === person.id)!.full_name).toBe(before.person)
  })

  it("viewers cannot change records in their own workspace", async () => {
    signedIn.userId = f.brian.id
    const deal = f.db.deals.find((d) => d.workspace_id === f.kilima.id)!
    expect((await actions.updateDeal(deal.id, form({ title: "Changed by a viewer" }))).ok).toBe(false)
  })
})

describe("private flags", () => {
  const flagAbout = () => f.db.flags.find((x) => x.workspace_id === f.kilima.id)!
  const sees = async (id: string, role: "owner" | "admin" | "member" | "viewer") =>
    (await q.listFlags(f.kilima.id, { id, role })).some((x) => x.id === flagAbout().id)

  it("the person who raised it sees it", async () => {
    expect(flagAbout().raised_by).toBe(f.charis.id)
    expect(await sees(f.charis.id, "owner")).toBe(true)
  })

  it("other owners and admins see it", async () => {
    expect(await sees(f.wanjiru.id, "admin")).toBe(true)
  })

  it("members and viewers who did not raise it do not", async () => {
    expect(await sees(f.achieng.id, "member")).toBe(false)
    expect(await sees(f.brian.id, "viewer")).toBe(false)
  })

  it("the person it is about never sees it, even as an admin", async () => {
    expect(flagAbout().about_user_id).toBe(f.otieno.id)
    expect(await sees(f.otieno.id, "member")).toBe(false)
    expect(await sees(f.otieno.id, "admin")).toBe(false)
    expect(await q.getFlag(f.kilima.id, { id: f.otieno.id, role: "admin" }, flagAbout().id)).toBeNull()
  })
})

describe("notifications are yours alone", () => {
  it("nobody else's show in your list, owners included", async () => {
    const charisOwn = f.db.notifications.filter((n) => n.user_id === f.charis.id).map((n) => n.id)
    expect(charisOwn.length).toBeGreaterThan(0)
    const wanjiru = await q.listNotifications(f.kilima.id, f.wanjiru.id)
    expect(leaked(wanjiru, charisOwn)).toBeNull()
  })

  it("you cannot mark someone else's as read", async () => {
    const n = f.db.notifications.find((x) => x.user_id === f.charis.id && !x.read_at)!
    signedIn.userId = f.wanjiru.id
    expect((await actions.markNotificationRead(n.id)).ok).toBe(false)
    expect((await readDb()).notifications.find((x) => x.id === n.id)!.read_at).toBeUndefined()
  })
})
