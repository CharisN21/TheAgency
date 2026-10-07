/**
 * Banners on phones and laptops: only real push services are accepted, a device
 * belongs to one person, a banner is sent only when a notification row is made,
 * the text is safe on a lock screen, and a muted kind sends nothing.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const send = vi.hoisted(() => vi.fn())
vi.mock("web-push", () => ({ default: { setVapidDetails: vi.fn(), sendNotification: send } }))

import * as actions from "@/lib/data/actions"
import { readDb, writeDb } from "@/lib/data/store"
import { isPushEndpoint, isPushKey } from "@/lib/push/hosts"
import { loadFixture } from "./fixture"
import { signedIn } from "./setup"

let f: Awaited<ReturnType<typeof loadFixture>>

beforeEach(async () => {
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "BPublicKeyForTests"
  process.env.VAPID_PRIVATE_KEY = "privateKeyForTests"
  process.env.VAPID_SUBJECT = "mailto:test@example.com"
  send.mockReset()
  send.mockResolvedValue({ statusCode: 201 })
  f = await loadFixture()
  signedIn.workspaceId = undefined
})

const as = (userId: string) => {
  signedIn.userId = userId
}

const GOOD = "https://fcm.googleapis.com/fcm/send/abc123"
const keys = { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u", auth: "tBHItJI5svbpez7KI4CCXg" }
const device = (endpoint = GOOD) => ({ endpoint, keys })

const assignTask = (to: string) => {
  const fd = new FormData()
  fd.set("title", "Call the supplier about delivery")
  fd.set("assignee_id", to)
  return actions.createTask(fd)
}

describe("which addresses are accepted", () => {
  it("takes only the push services run by Apple, Google, Mozilla and Microsoft", () => {
    expect(isPushEndpoint(GOOD)).toBe(true)
    expect(isPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/abc")).toBe(true)
    expect(isPushEndpoint("https://web.push.apple.com/abc")).toBe(true)
    expect(isPushEndpoint("https://wns2-par02p.notify.windows.com/w/?token=abc")).toBe(true)
  })

  it("refuses anything else, so the server cannot be aimed elsewhere", () => {
    for (const bad of [
      "http://fcm.googleapis.com/fcm/send/abc",
      "https://evil.example.com/fcm.googleapis.com",
      "https://fcm.googleapis.com.evil.example.com/x",
      "https://user:pass@fcm.googleapis.com/x",
      "https://fcm.googleapis.com:8443/x",
      "https://127.0.0.1/x",
      "https://localhost/x",
      "https://169.254.169.254/latest/meta-data",
      "not a url",
      "",
      "https://fcm.googleapis.com/" + "a".repeat(2100),
    ]) {
      expect(isPushEndpoint(bad), bad).toBe(false)
    }
    expect(isPushEndpoint(undefined)).toBe(false)
    expect(isPushKey("short")).toBe(false)
    expect(isPushKey("has spaces in it here")).toBe(false)
    expect(isPushKey(keys.auth)).toBe(true)
  })
})

describe("devices", () => {
  it("saves a device for the person, once, and lists it", async () => {
    as(f.wanjiru.id)
    expect((await actions.savePushDevice(device(), "Chrome on Windows")).ok).toBe(true)
    expect((await actions.savePushDevice(device(), "Chrome on Windows")).ok).toBe(true)
    const s = await actions.pushStatus(GOOD)
    expect(s.devices).toHaveLength(1)
    expect(s.thisDeviceId).toBe(s.devices[0].id)
    expect(JSON.stringify(s)).not.toContain(keys.auth)
    expect(JSON.stringify(s)).not.toContain(GOOD)
  })

  it("rejects a bad address or bad keys", async () => {
    as(f.wanjiru.id)
    expect((await actions.savePushDevice(device("https://evil.example.com/x"), "x")).ok).toBe(false)
    expect((await actions.savePushDevice({ endpoint: GOOD, keys: { p256dh: "x", auth: "y" } }, "x")).ok).toBe(false)
    expect((await readDb()).push_subscriptions).toHaveLength(0)
  })

  it("lets only the owner remove a device", async () => {
    as(f.wanjiru.id)
    await actions.savePushDevice(device(), "Chrome on Windows")
    const id = (await actions.pushStatus()).devices[0].id

    as(f.achieng.id)
    expect((await actions.removePushDevice(id)).ok).toBe(false)
    expect((await readDb()).push_subscriptions).toHaveLength(1)

    as(f.wanjiru.id)
    expect((await actions.removePushDevice(id)).ok).toBe(true)
    expect((await readDb()).push_subscriptions).toHaveLength(0)
  })

  it("moves a device to whoever signs in on it next, and never shows it to the first person", async () => {
    as(f.wanjiru.id)
    await actions.savePushDevice(device(), "Chrome on Windows")
    as(f.achieng.id)
    await actions.savePushDevice(device(), "Chrome on Windows")
    expect((await actions.pushStatus(GOOD)).devices).toHaveLength(1)
    as(f.wanjiru.id)
    expect((await actions.pushStatus(GOOD)).devices).toHaveLength(0)
  })

  it("stops at ten devices", async () => {
    as(f.wanjiru.id)
    for (let i = 0; i < 10; i++) {
      expect((await actions.savePushDevice(device(`https://fcm.googleapis.com/fcm/send/d${i}`), "d")).ok).toBe(true)
    }
    const r = await actions.savePushDevice(device("https://fcm.googleapis.com/fcm/send/extra"), "d")
    expect(r.ok).toBe(false)
  })

  it("says so plainly when the server has no keys", async () => {
    delete process.env.VAPID_PRIVATE_KEY
    as(f.wanjiru.id)
    const r = await actions.savePushDevice(device(), "x")
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/not set up/)
    expect((await actions.pushStatus()).configured).toBe(false)
  })
})

describe("sending", () => {
  it("sends a banner to the person's devices when something happens to them, and to nobody else", async () => {
    as(f.achieng.id)
    await actions.savePushDevice(device(), "Chrome on Windows")
    as(f.otieno.id)
    await actions.savePushDevice(device("https://fcm.googleapis.com/fcm/send/otieno"), "Safari on iPhone")

    as(f.wanjiru.id)
    expect((await assignTask(f.achieng.id)).ok).toBe(true)

    expect(send).toHaveBeenCalledTimes(1)
    const [subscription, payload] = send.mock.calls[0]
    expect(subscription.endpoint).toBe(GOOD)
    const body = JSON.parse(payload)
    expect(body.title).toMatch(/task/i)
    expect(body.body).toBe("Kilima Labs")
    expect(body.href).toMatch(/^\//)
  })

  it("never sends the banner to the person who did the thing", async () => {
    as(f.wanjiru.id)
    await actions.savePushDevice(device(), "Chrome on Windows")
    await assignTask(f.wanjiru.id)
    expect(send).not.toHaveBeenCalled()
  })

  it("keeps money and private notes off the lock screen", async () => {
    as(f.achieng.id)
    await actions.savePushDevice(device(), "Chrome on Windows")
    as(f.wanjiru.id)
    await assignTask(f.achieng.id)
    const text = String(send.mock.calls[0][1])
    expect(text).not.toMatch(/KSh|\d{3},\d{3}/)
  })

  it("sends nothing for a kind the person has switched off", async () => {
    as(f.achieng.id)
    await actions.savePushDevice(device(), "Chrome on Windows")
    await actions.setNotificationMuted("task_assigned", true)
    as(f.wanjiru.id)
    await assignTask(f.achieng.id)
    expect(send).not.toHaveBeenCalled()
  })

  it("says which workspace a banner is about for someone in two", async () => {
    const db = await readDb()
    db.memberships.push({ workspace_id: f.elsewhere.id, user_id: f.achieng.id, role: "member", created_at: f.kilima.created_at })
    await writeDb(db)

    as(f.achieng.id)
    await actions.savePushDevice(device(), "Chrome on Windows")

    as(f.zawadi.id)
    signedIn.workspaceId = f.elsewhere.id
    await assignTask(f.achieng.id)

    expect(send).toHaveBeenCalledTimes(1)
    expect(JSON.parse(send.mock.calls[0][1]).body).toBe("Elsewhere")
  })

  it("forgets a device the push service says is gone, and keeps the others", async () => {
    as(f.achieng.id)
    await actions.savePushDevice(device(), "Gone")
    await actions.savePushDevice(device("https://fcm.googleapis.com/fcm/send/alive"), "Alive")
    send.mockImplementation(async (sub: { endpoint: string }) => {
      if (sub.endpoint === GOOD) throw Object.assign(new Error("gone"), { statusCode: 410 })
      return { statusCode: 201 }
    })

    as(f.wanjiru.id)
    await assignTask(f.achieng.id)

    const left = (await readDb()).push_subscriptions
    expect(left.map((s) => s.label)).toEqual(["Alive"])
  })

  it("does not let a failed send break the action that caused it", async () => {
    as(f.achieng.id)
    await actions.savePushDevice(device(), "Chrome on Windows")
    send.mockRejectedValue(new Error("network down"))
    as(f.wanjiru.id)
    const r = await assignTask(f.achieng.id)
    expect(r.ok).toBe(true)
    const db = await readDb()
    expect(db.notifications.some((n) => n.user_id === f.achieng.id && n.type === "task_assigned")).toBe(true)
  })

  it("sends a test banner to your own devices only", async () => {
    as(f.achieng.id)
    expect((await actions.sendTestPush()).ok).toBe(false)
    await actions.savePushDevice(device(), "Chrome on Windows")
    as(f.wanjiru.id)
    await actions.savePushDevice(device("https://fcm.googleapis.com/fcm/send/wanjiru"), "Mac")

    as(f.achieng.id)
    const r = await actions.sendTestPush()
    expect(r.ok).toBe(true)
    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0][0].endpoint).toBe(GOOD)
  })
})

describe("chat messages notify the people in the chat", () => {
  const mine = async (userId: string) =>
    (await readDb()).notifications.filter((n) => n.user_id === userId && n.type.startsWith("chat_"))

  it("tells the other person in a direct message, with a banner, and never shows the message", async () => {
    as(f.achieng.id)
    await actions.savePushDevice(device(), "Chrome on Windows")

    as(f.wanjiru.id)
    const dm = await actions.startDirectMessage(f.achieng.id)
    await actions.postMessage(dm.id!, { text: "the supplier price is 4,200 and do not share it" })

    const got = await mine(f.achieng.id)
    expect(got).toHaveLength(1)
    expect(got[0].type).toBe("chat_message")
    expect(got[0].title).toBe("Wanjiru sent you a message")
    expect(got[0].href).toBe(`/today?chat=${dm.id}`)
    expect(await mine(f.wanjiru.id)).toHaveLength(0)
    expect(await mine(f.otieno.id)).toHaveLength(0)

    expect(send).toHaveBeenCalledTimes(1)
    expect(String(send.mock.calls[0][1])).not.toMatch(/4,200|supplier/)
  })

  it("makes one notification for a burst, and a new one once it has been read", async () => {
    as(f.wanjiru.id)
    const dm = await actions.startDirectMessage(f.achieng.id)
    await actions.postMessage(dm.id!, { text: "one" })
    await actions.postMessage(dm.id!, { text: "two" })
    await actions.postMessage(dm.id!, { text: "three" })
    expect(await mine(f.achieng.id)).toHaveLength(1)

    as(f.achieng.id)
    await actions.markChannelRead(dm.id!)
    expect((await mine(f.achieng.id))[0].read_at).toBeTruthy()

    as(f.wanjiru.id)
    await actions.postMessage(dm.id!, { text: "four" })
    expect(await mine(f.achieng.id)).toHaveLength(2)
  })

  it("always tells someone who is tagged, even in a burst", async () => {
    as(f.wanjiru.id)
    const g = await actions.createGroup("Stand-up", [f.achieng.id, f.otieno.id])
    await actions.postMessage(g.id!, { text: "morning all" })
    await actions.postMessage(g.id!, { text: "@Achieng please look", mentions: [f.achieng.id] })

    const got = await mine(f.achieng.id)
    expect(got.map((n) => n.type).sort()).toEqual(["chat_mention", "chat_message"])
    expect(got.find((n) => n.type === "chat_mention")!.title).toBe("Wanjiru tagged you in Stand-up")
    expect((await mine(f.otieno.id)).map((n) => n.type)).toEqual(["chat_message"])
  })

  it("tells everyone else about an announcement", async () => {
    as(f.charis.id)
    const id = (await actions.loadChannels()).channels.find((c) => c.kind === "announcements")!.id
    await actions.postMessage(id, { text: "Office closed Friday" })
    const members = f.db.memberships.filter((m) => m.workspace_id === f.kilima.id).map((m) => m.user_id)
    for (const u of members) {
      expect(await mine(u), u).toHaveLength(u === f.charis.id ? 0 : 1)
    }
    expect((await mine(members.find((u) => u !== f.charis.id)!))[0].title).toBe("New announcement from Charis")
  })

  it("never tells people who are not in the chat, or other workspaces", async () => {
    as(f.wanjiru.id)
    const dm = await actions.startDirectMessage(f.achieng.id)
    await actions.postMessage(dm.id!, { text: "private" })
    expect(await mine(f.brian.id)).toHaveLength(0)
    expect(await mine(f.zawadi.id)).toHaveLength(0)
  })

  it("sends nothing for chat if the person switched it off", async () => {
    as(f.achieng.id)
    await actions.savePushDevice(device(), "Chrome on Windows")
    await actions.setNotificationMuted("chat_message", true)
    as(f.wanjiru.id)
    const dm = await actions.startDirectMessage(f.achieng.id)
    await actions.postMessage(dm.id!, { text: "hello" })
    expect(await mine(f.achieng.id)).toHaveLength(0)
    expect(send).not.toHaveBeenCalled()
  })
});
