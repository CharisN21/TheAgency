/**
 * Ventures and founders: only founders start ventures and add workspaces, only
 * the platform owner appoints founders, invited people only get into what they
 * are invited to, and a venture shows only the workspaces you are in.
 */
import { beforeEach, describe, expect, it } from "vitest"

import * as actions from "@/lib/data/actions"
import * as q from "@/lib/data/queries"
import { mutate, readDb } from "@/lib/data/store"
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
const form = (fields: Record<string, string>) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}
/** Actions that finish by redirecting throw "redirect:<to>" in tests. */
const landsOn = async (p: Promise<unknown>) => {
  try {
    const r = await p
    return r
  } catch (e) {
    return String((e as Error).message)
  }
}

describe("who can start things", () => {
  it("a founder starts a venture with its first workspace, as its owner", async () => {
    as(f.charis.id)
    expect(await landsOn(actions.createVenture(form({ name: "Telecast", workspace: "Marketing and sales", accent: "#0b62c4" })))).toBe(
      "redirect:/today?created=1"
    )
    const db = await readDb()
    const v = db.ventures.find((x) => x.name === "Telecast")!
    const w = db.workspaces.find((x) => x.venture_id === v.id)!
    expect(w.name).toBe("Marketing and sales")
    expect(db.memberships.find((m) => m.workspace_id === w.id)).toMatchObject({ user_id: f.charis.id, role: "owner" })
  })

  it("someone invited, even an admin, cannot start a venture or add a workspace", async () => {
    as(f.wanjiru.id) // admin of Kilima Labs, not a founder
    const r = await landsOn(actions.createVenture(form({ name: "My own thing" })))
    expect(r).toMatchObject({ ok: false })
    const kilimaVenture = (await readDb()).workspaces.find((w) => w.id === f.kilima.id)!.venture_id
    expect(await landsOn(actions.createWorkspace(form({ venture_id: kilimaVenture, name: "Side team" })))).toMatchObject({ ok: false })
    expect((await readDb()).ventures.some((v) => v.name === "My own thing")).toBe(false)
  })

  it("a founder adds workspaces only to ventures they run", async () => {
    as(f.charis.id)
    const kilimaVenture = (await readDb()).workspaces.find((w) => w.id === f.kilima.id)!.venture_id
    expect(await landsOn(actions.createWorkspace(form({ venture_id: kilimaVenture, name: "Directors" })))).toBe("redirect:/today?created=1")
    // Not someone else's venture.
    expect(await landsOn(actions.createWorkspace(form({ venture_id: f.elsewhereVenture.id, name: "Sneaky" })))).toMatchObject({ ok: false })
    // Not the same name twice in one venture.
    expect(await landsOn(actions.createWorkspace(form({ venture_id: kilimaVenture, name: "directors" })))).toMatchObject({ ok: false })
  })

  it("only the platform owner appoints or removes founders", async () => {
    as(f.wanjiru.id)
    expect((await actions.appointFounder(form({ email: "new@founder.co.ke" }))).ok).toBe(false)

    as(f.charis.id) // the demo platform owner on a laptop
    expect((await actions.appointFounder(form({ email: "New@Founder.co.ke" }))).ok).toBe(true)
    const p = (await readDb()).profiles.find((x) => x.email === "new@founder.co.ke")!
    expect(p.founder).toBe(true)

    as(f.wanjiru.id)
    expect((await actions.removeFounder(p.id)).ok).toBe(false)
    as(f.charis.id)
    expect((await actions.removeFounder(p.id)).ok).toBe(true)
    expect((await actions.removeFounder(f.charis.id)).ok).toBe(false) // the platform owner stays
  })

  it("an appointed founder can then start a venture", async () => {
    as(f.charis.id)
    await actions.appointFounder(form({ email: f.wanjiru.email }))
    as(f.wanjiru.id)
    expect(await landsOn(actions.createVenture(form({ name: "Wanjiru Ventures" })))).toBe("redirect:/today?created=1")
  })
})

describe("what each person sees", () => {
  it("ventures list only the workspaces you are in", async () => {
    as(f.charis.id)
    const kilimaVenture = (await readDb()).workspaces.find((w) => w.id === f.kilima.id)!.venture_id
    await landsOn(actions.createWorkspace(form({ venture_id: kilimaVenture, name: "Directors" })))

    // Otieno is in Kilima Labs but not in Directors: he sees the venture, not Directors.
    const his = await q.listMyVentures(f.otieno.id)
    const v = his.find((x) => x.id === kilimaVenture)!
    expect(v.workspaces.map((w) => w.name)).toEqual(["Kilima Labs"])
    expect(v.canAdd).toBe(false)
    expect(his.some((x) => x.id === f.elsewhereVenture.id)).toBe(false)

    const mine = (await q.listMyVentures(f.charis.id)).find((x) => x.id === kilimaVenture)!
    expect(mine.workspaces.map((w) => w.name).sort()).toEqual(["Directors", "Kilima Labs"])
    expect(mine.canAdd).toBe(true)
  })

  it("entering a workspace works only if you are in it", async () => {
    as(f.otieno.id)
    expect(await landsOn(actions.enterWorkspace(f.elsewhere.id))).toMatchObject({ ok: false })
    expect(await landsOn(actions.enterWorkspace(f.kilima.id))).toBe("redirect:/today")
  })

  it("someone in no workspace who is not a founder is sent to wait for an invite", async () => {
    await mutate((d) => {
      d.profiles.push({ id: "lonely", email: "lonely@example.com", full_name: "Lonely", created_at: "2026-10-01" })
    })
    expect(await landsOn(actions.signIn(form({ email: "lonely@example.com" })))).toBe("redirect:/welcome")
    expect(await landsOn(actions.signIn(form({ email: f.otieno.email })))).toBe("redirect:/today")
    expect(await landsOn(actions.signIn(form({ email: f.charis.email })))).toBe("redirect:/ventures")
  })
})

describe("invites", () => {
  it("carry a title into the membership", async () => {
    as(f.charis.id)
    expect((await actions.createInvite(form({ email: "sales@example.com", role: "member", title: "Sales admin" }))).ok).toBe(true)
    const invite = (await readDb()).invites.find((i) => i.email === "sales@example.com")!
    expect(invite.title).toBe("Sales admin")

    await mutate((d) => {
      d.profiles.push({ id: "sales", email: "sales@example.com", full_name: "Sales", created_at: "2026-10-01" })
    })
    as("sales")
    await landsOn(actions.acceptInvite(invite.token))
    const m = (await readDb()).memberships.find((x) => x.user_id === "sales" && x.workspace_id === f.kilima.id)!
    expect(m).toMatchObject({ role: "member", title: "Sales admin" })
  })

  it("refuse a made-up role, and only owners invite owners", async () => {
    as(f.wanjiru.id) // admin
    expect((await actions.createInvite(form({ email: "x@example.com", role: "superuser" }))).ok).toBe(false)
    expect((await actions.createInvite(form({ email: "y@example.com", role: "owner" }))).ok).toBe(false)
    as(f.charis.id) // owner
    expect((await actions.createInvite(form({ email: "y@example.com", role: "owner" }))).ok).toBe(true)
  })
})
