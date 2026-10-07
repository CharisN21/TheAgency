/**
 * Where a banner lands: only inside the app, switching to the workspace it is
 * about only if you belong to it; and the small square that sits beside it.
 */
import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const switched = vi.hoisted(() => vi.fn())
vi.mock("@/lib/data/session", async (original) => ({
  ...(await original<typeof import("@/lib/data/session")>()),
  setCurrentWorkspace: switched,
}))

import { GET as icon } from "@/app/workspace-icon/route"
import { GET as open } from "@/app/open/route"
import { openLink, safeTarget, workspaceIconPath } from "@/lib/push/open"
import { loadFixture } from "./fixture"
import { signedIn } from "./setup"

let f: Awaited<ReturnType<typeof loadFixture>>

beforeEach(async () => {
  switched.mockReset()
  f = await loadFixture()
  signedIn.userId = undefined
  signedIn.workspaceId = undefined
})

const go = (query: string) => open(new NextRequest(`http://localhost:3000/open?${query}`))
const where = (r: Response) => new URL(r.headers.get("location")!)

describe("safe targets", () => {
  it("keeps paths inside the app", () => {
    expect(safeTarget("/today")).toBe("/today")
    expect(safeTarget("/today?chat=abc")).toBe("/today?chat=abc")
    expect(safeTarget("/deals/123#notes")).toBe("/deals/123#notes")
  })

  it("refuses anything that could leave the app", () => {
    for (const bad of ["https://evil.example.com", "//evil.example.com", "/\\evil.example.com", "javascript:alert(1)", "today", "", "/a\nb"]) {
      expect(safeTarget(bad), bad).toBeNull()
    }
    expect(safeTarget(undefined)).toBeNull()
    expect(safeTarget("/" + "a".repeat(600))).toBeNull()
  })

  it("builds a link that names the workspace and the page", () => {
    expect(openLink("w1", "/today?chat=x")).toBe("/open?w=w1&to=%2Ftoday%3Fchat%3Dx")
    expect(openLink("w1", "https://evil.example.com")).toBe("/open?w=w1&to=%2Ftoday")
    expect(openLink("w1", undefined)).toBe("/open?w=w1&to=%2Ftoday")
  })

  it("makes the icon address from the name and colour, with a safe fallback", () => {
    expect(workspaceIconPath("Kilima Labs", "#7c1f35")).toBe("/workspace-icon?l=K&c=7c1f35")
    expect(workspaceIconPath("  zawadi", "#123abc")).toBe("/workspace-icon?l=Z&c=123abc")
    expect(workspaceIconPath("X", "red")).toBe("/workspace-icon?l=X&c=7c1f35")
    expect(workspaceIconPath("", "")).toBe("/workspace-icon?l=A&c=7c1f35")
  })
})

describe("/open", () => {
  it("asks you to sign in first, and brings you back here", async () => {
    const r = await go(`w=${f.kilima.id}&to=%2Ftoday%3Fchat%3Dx`)
    expect(where(r).pathname).toBe("/sign-in")
    expect(where(r).searchParams.get("next")).toBe(`/open?w=${f.kilima.id}&to=%2Ftoday%3Fchat%3Dx`)
    expect(switched).not.toHaveBeenCalled()
  })

  it("switches to the workspace the banner is about, then opens the page", async () => {
    const db = (await import("@/lib/data/store")).readDb
    const both = await db()
    both.memberships.push({ workspace_id: f.elsewhere.id, user_id: f.achieng.id, role: "member", created_at: f.kilima.created_at })
    await (await import("@/lib/data/store")).writeDb(both)

    signedIn.userId = f.achieng.id
    const r = await go(`w=${f.elsewhere.id}&to=%2Ftoday%3Fchat%3Dx`)
    expect(switched).toHaveBeenCalledWith(f.elsewhere.id)
    expect(where(r).pathname + where(r).search).toBe("/today?chat=x")
  })

  it("does not switch into a workspace you do not belong to", async () => {
    signedIn.userId = f.achieng.id
    const r = await go(`w=${f.elsewhere.id}&to=%2Ftoday`)
    expect(switched).not.toHaveBeenCalled()
    expect(where(r).pathname).toBe("/today")
  })

  it("sends a link to another site to Today instead", async () => {
    signedIn.userId = f.achieng.id
    for (const to of ["https%3A%2F%2Fevil.example.com", "%2F%2Fevil.example.com"]) {
      const r = await go(`w=${f.kilima.id}&to=${to}`)
      expect(where(r).origin).toBe("http://localhost:3000")
      expect(where(r).pathname).toBe("/today")
    }
  })
})

describe("the workspace icon", () => {
  const get = (q: string) => icon(new NextRequest(`http://localhost:3000/workspace-icon?${q}`))

  it("draws a picture for a letter and colour, cached for good", async () => {
    const r = await get("l=K&c=7c1f35")
    expect(r.status).toBe(200)
    expect(r.headers.get("content-type")).toBe("image/png")
    expect(r.headers.get("cache-control")).toContain("immutable")
  })

  it("refuses anything that is not a letter and a colour", async () => {
    for (const q of ["l=K&c=nothex", "l=&c=7c1f35", "c=7c1f35", "l=K", "l=%3Cb%3E&c=7c1f35", "l=K&c=7c1f35zz"]) {
      expect((await get(q)).status, q).toBe(404)
    }
  })
})
