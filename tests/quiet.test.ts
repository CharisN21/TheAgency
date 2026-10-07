/**
 * Banner controls: a workspace's banners can be switched off, and a daily quiet
 * window holds banners back. The notification itself is always made.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const send = vi.hoisted(() => vi.fn())
vi.mock("web-push", () => ({ default: { setVapidDetails: vi.fn(), sendNotification: send } }))

import * as actions from "@/lib/data/actions"
import * as q from "@/lib/data/queries"
import { readDb } from "@/lib/data/store"
import { bannersAllowed, inQuietHours, isClock, isZone } from "@/lib/push/quiet"
import { loadFixture } from "./fixture"
import { signedIn } from "./setup"

const at = (iso: string) => new Date(iso)

describe("quiet hours", () => {
  const night = { quiet_from: "22:00", quiet_to: "07:00", tz: "Africa/Nairobi" }

  it("holds banners overnight, in the person's own clock", () => {
    // Nairobi is three hours ahead of UTC.
    expect(inQuietHours(night, at("2026-10-07T19:30:00Z"))).toBe(true) // 22:30 in Nairobi
    expect(inQuietHours(night, at("2026-10-07T23:59:00Z"))).toBe(true) // 02:59
    expect(inQuietHours(night, at("2026-10-08T03:59:00Z"))).toBe(true) // 06:59
    expect(inQuietHours(night, at("2026-10-08T04:00:00Z"))).toBe(false) // 07:00
    expect(inQuietHours(night, at("2026-10-07T09:00:00Z"))).toBe(false) // noon
    expect(inQuietHours(night, at("2026-10-07T18:59:00Z"))).toBe(false) // 21:59
    expect(inQuietHours(night, at("2026-10-07T19:00:00Z"))).toBe(true) // 22:00
  })

  it("follows another zone", () => {
    const london = { ...night, tz: "Europe/London" }
    expect(inQuietHours(london, at("2026-10-07T21:30:00Z"))).toBe(true) // 22:30 BST
    expect(inQuietHours(london, at("2026-10-07T19:30:00Z"))).toBe(false)
  })

  it("handles a window inside one day", () => {
    const lunch = { quiet_from: "12:00", quiet_to: "14:00", tz: "UTC" }
    expect(inQuietHours(lunch, at("2026-10-07T13:00:00Z"))).toBe(true)
    expect(inQuietHours(lunch, at("2026-10-07T14:00:00Z"))).toBe(false)
  })

  it("has no window when unset, equal, or unreadable", () => {
    expect(inQuietHours(undefined)).toBe(false)
    expect(inQuietHours({})).toBe(false)
    expect(inQuietHours({ quiet_from: "09:00", quiet_to: "09:00", tz: "UTC" })).toBe(false)
    expect(inQuietHours({ quiet_from: "9am", quiet_to: "5pm", tz: "UTC" })).toBe(false)
  })

  it("combines with the switch", () => {
    expect(bannersAllowed({ banners_off: true })).toBe(false)
    expect(bannersAllowed({})).toBe(true)
    expect(bannersAllowed({ ...night }, at("2026-10-07T09:00:00Z"))).toBe(true)
    expect(bannersAllowed({ ...night }, at("2026-10-07T20:00:00Z"))).toBe(false)
  })

  it("checks times and zones", () => {
    for (const ok of ["00:00", "07:30", "23:59"]) expect(isClock(ok), ok).toBe(true)
    for (const bad of ["24:00", "7:30", "12:60", "noon", "", 5]) expect(isClock(bad), String(bad)).toBe(false)
    expect(isZone("Africa/Nairobi")).toBe(true)
    expect(isZone("Mars/Olympus")).toBe(false)
    expect(isZone("")).toBe(false)
  })
})

describe("banner controls", () => {
  let f: Awaited<ReturnType<typeof loadFixture>>
  const as = (id: string) => {
    signedIn.userId = id
  }
  const GOOD = "https://fcm.googleapis.com/fcm/send/abc123"
  const keys = { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u", auth: "tBHItJI5svbpez7KI4CCXg" }
  const assign = (to: string) => {
    const fd = new FormData()
    fd.set("title", "Call the supplier about delivery")
    fd.set("assignee_id", to)
    return actions.createTask(fd)
  }
  const settings = (over: Partial<Parameters<typeof actions.setBannerSettings>[0]> = {}) =>
    actions.setBannerSettings({ banners: true, quietOn: false, quietFrom: "22:00", quietTo: "07:00", tz: "Africa/Nairobi", ...over })

  beforeEach(async () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "BPublicKeyForTests"
    process.env.VAPID_PRIVATE_KEY = "privateKeyForTests"
    process.env.VAPID_SUBJECT = "mailto:test@example.com"
    send.mockReset()
    send.mockResolvedValue({ statusCode: 201 })
    f = await loadFixture()
    signedIn.workspaceId = undefined
    as(f.achieng.id)
    await actions.savePushDevice({ endpoint: GOOD, keys }, "Chrome on Windows")
  })

  it("switching a workspace's banners off sends no banner but still fills the bell", async () => {
    expect((await settings({ banners: false })).ok).toBe(true)
    as(f.wanjiru.id)
    await assign(f.achieng.id)
    expect(send).not.toHaveBeenCalled()
    const db = await readDb()
    expect(db.notifications.some((n) => n.user_id === f.achieng.id && n.type === "task_assigned")).toBe(true)
  })

  it("switching it back on sends banners again", async () => {
    await settings({ banners: false })
    await settings({ banners: true })
    as(f.wanjiru.id)
    await assign(f.achieng.id)
    expect(send).toHaveBeenCalledTimes(1)
  })

  it("holds banners inside quiet hours, and sends them outside", async () => {
    const now = new Date()
    const clock = (h: number) => {
      const d = new Date(now.getTime() + h * 3600_000)
      return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`
    }

    // A window that includes now.
    await settings({ quietOn: true, quietFrom: clock(-1), quietTo: clock(1), tz: "UTC" })
    as(f.wanjiru.id)
    await assign(f.achieng.id)
    expect(send).not.toHaveBeenCalled()
    expect((await readDb()).notifications.filter((n) => n.user_id === f.achieng.id && n.type === "task_assigned")).toHaveLength(1)

    // A window that does not.
    as(f.achieng.id)
    await settings({ quietOn: true, quietFrom: clock(2), quietTo: clock(4), tz: "UTC" })
    as(f.wanjiru.id)
    await assign(f.achieng.id)
    expect(send).toHaveBeenCalledTimes(1)
  })

  it("is per workspace: switching one off leaves the other on", async () => {
    const db = await readDb()
    db.memberships.push({ workspace_id: f.elsewhere.id, user_id: f.achieng.id, role: "member", created_at: f.kilima.created_at })
    await (await import("@/lib/data/store")).writeDb(db)

    as(f.achieng.id)
    signedIn.workspaceId = f.kilima.id
    await settings({ banners: false }) // in Kilima Labs only
    expect((await q.getBannerSettings(f.elsewhere.id, f.achieng.id)).banners).toBe(true)

    as(f.zawadi.id)
    signedIn.workspaceId = f.elsewhere.id
    await assign(f.achieng.id)
    expect(send).toHaveBeenCalledTimes(1)

    as(f.wanjiru.id)
    signedIn.workspaceId = f.kilima.id
    await assign(f.achieng.id)
    expect(send).toHaveBeenCalledTimes(1)
  })

  it("remembers the settings, with sensible defaults", async () => {
    expect(await q.getBannerSettings(f.kilima.id, f.achieng.id)).toEqual({
      banners: true,
      quietOn: false,
      quietFrom: "22:00",
      quietTo: "07:00",
    })
    await settings({ banners: true, quietOn: true, quietFrom: "21:30", quietTo: "06:15" })
    expect(await q.getBannerSettings(f.kilima.id, f.achieng.id)).toEqual({
      banners: true,
      quietOn: true,
      quietFrom: "21:30",
      quietTo: "06:15",
    })
    await settings({ quietOn: false })
    expect((await q.getBannerSettings(f.kilima.id, f.achieng.id)).quietOn).toBe(false)
  })

  it("rejects settings that make no sense", async () => {
    for (const bad of [
      { quietOn: true, quietFrom: "25:00" },
      { quietOn: true, quietTo: "noon" },
      { quietOn: true, quietFrom: "08:00", quietTo: "08:00" },
      { quietOn: true, tz: "Mars/Olympus" },
    ]) {
      expect((await settings(bad)).ok, JSON.stringify(bad)).toBe(false)
    }
  })

  it("changes only your own settings", async () => {
    await settings({ banners: false })
    expect((await q.getBannerSettings(f.kilima.id, f.wanjiru.id)).banners).toBe(true)
  })

  it("still sends the test banner during quiet hours, because you asked for it", async () => {
    await settings({ banners: false })
    expect((await actions.sendTestPush()).ok).toBe(true)
    expect(send).toHaveBeenCalledTimes(1)
  })
})
