/**
 * Encrypted channels, end to end: real keys on simulated devices, talking to
 * the real server actions. Proves the server only ever holds sealed text, that
 * nobody outside a channel gets in, and that joining, leaving and removing a
 * device always forces a new key before anything else can be sent.
 */
import { beforeEach, describe, expect, it } from "vitest"

import * as actions from "@/lib/data/actions"
import {
  createChannelKey,
  createDeviceKeys,
  exportPublicKey,
  openMessage,
  sealMessage,
  unwrapChannelKey,
  wrapChannelKey,
  type PublicKeyJwk,
} from "@/lib/crypto/e2ee"
import { mutate, readDb } from "@/lib/data/store"
import { loadFixture } from "./fixture"
import { signedIn } from "./setup"

let f: Awaited<ReturnType<typeof loadFixture>>

beforeEach(async () => {
  f = await loadFixture()
  signedIn.workspaceId = undefined
})

type Phone = { userId: string; deviceId: string; keys: CryptoKeyPair; pub: PublicKeyJwk }

const as = (userId: string) => {
  signedIn.userId = userId
}

async function addDevice(userId: string): Promise<Phone> {
  as(userId)
  const keys = await createDeviceKeys()
  const pub = await exportPublicKey(keys.publicKey)
  const r = await actions.registerDevice("Test phone", pub)
  expect(r.ok).toBe(true)
  return { userId, deviceId: r.deviceId!, keys, pub }
}

async function announcements(phone: Phone) {
  as(phone.userId)
  const r = await actions.loadChannels(phone.deviceId)
  return r.channels.find((c) => c.kind === "announcements")!.id
}

/** What the drawer does when the server says the key is out of date. */
async function rotate(phone: Phone, channelId: string) {
  as(phone.userId)
  const r = await actions.loadChannel(channelId, phone.deviceId)
  if (!r.ok) throw new Error(r.message)
  const epoch = r.state.channel.epoch + 1
  const key = await createChannelKey()
  const wrapped = await Promise.all(
    r.state.devices.map(async (d) => ({
      device_id: d.id,
      wrapped_key: await wrapChannelKey(key, phone.keys.privateKey, { deviceId: d.id, publicKey: d.public_key }, { channelId, epoch }),
    })),
  )
  const result = await actions.rotateChannel(channelId, phone.deviceId, epoch, wrapped)
  expect(result.ok, result.message).toBe(true)
  return epoch
}

/** Opens this device's newest key and sends a message with it. */
async function send(phone: Phone, channelId: string, text: string) {
  as(phone.userId)
  const r = await actions.loadChannel(channelId, phone.deviceId)
  if (!r.ok) throw new Error(r.message)
  const epoch = r.state.channel.epoch
  const k = r.state.keys.find((x) => x.epoch === epoch)!
  const key = await unwrapChannelKey(k.wrapped_key, phone.keys.privateKey, phone.deviceId, k.wrapper_public_key, { channelId, epoch })
  const sealed = await sealMessage(key, { text }, { channelId, epoch, senderDeviceId: phone.deviceId })
  return actions.postMessage(channelId, phone.deviceId, epoch, sealed)
}

/** Every message this device can open, as text. */
async function readAll(phone: Phone, channelId: string) {
  as(phone.userId)
  const r = await actions.loadChannel(channelId, phone.deviceId)
  if (!r.ok) throw new Error(r.message)
  const out: string[] = []
  for (const m of r.state.messages) {
    const k = r.state.keys.find((x) => x.epoch === m.epoch)
    if (!k) continue
    const key = await unwrapChannelKey(k.wrapped_key, phone.keys.privateKey, phone.deviceId, k.wrapper_public_key, {
      channelId,
      epoch: m.epoch,
    })
    out.push((await openMessage(key, m, { channelId, epoch: m.epoch, senderDeviceId: m.sender_device_id })).text)
  }
  return out
}

describe("encrypted channels", () => {
  it("members talk; the server only holds sealed text", async () => {
    const charis = await addDevice(f.charis.id)
    const ch = await announcements(charis)
    await rotate(charis, ch)
    expect((await send(charis, ch, "Supplier price is KSh 450 a box")).ok).toBe(true)

    const wanjiru = await addDevice(f.wanjiru.id)
    await rotate(wanjiru, ch)
    expect((await send(wanjiru, ch, "Noted")).ok).toBe(true)

    expect(await readAll(charis, ch)).toEqual(["Supplier price is KSh 450 a box", "Noted"])
    // Wanjiru's device arrived after the first message, so it stays closed to her.
    expect(await readAll(wanjiru, ch)).toEqual(["Noted"])

    const stored = JSON.stringify(await readDb())
    expect(stored).not.toContain("KSh 450")
    expect(stored).not.toContain("Noted")
  })

  it("nothing can be sent until a new device has been given the key", async () => {
    const charis = await addDevice(f.charis.id)
    const ch = await announcements(charis)
    await rotate(charis, ch)
    await addDevice(f.wanjiru.id)
    const r = await send(charis, ch, "Should wait")
    expect(r.ok).toBe(false)
  })

  it("someone who leaves the workspace is left out of the next key", async () => {
    const charis = await addDevice(f.charis.id)
    const otieno = await addDevice(f.otieno.id)
    const ch = await announcements(charis)
    await rotate(charis, ch)

    await mutate((d) => {
      d.memberships = d.memberships.filter((m) => !(m.user_id === f.otieno.id && m.workspace_id === f.kilima.id))
    })
    expect((await send(charis, ch, "After Otieno left")).ok).toBe(false)
    const epoch = await rotate(charis, ch)
    expect((await send(charis, ch, "After Otieno left")).ok).toBe(true)

    const db = await readDb()
    expect(db.channel_keys.some((k) => k.epoch === epoch && k.device_id === otieno.deviceId)).toBe(false)
    // Otieno has no workspace left, so the app sends him away before anything loads.
    as(f.otieno.id)
    await expect(actions.loadChannel(ch, otieno.deviceId)).rejects.toThrow("redirect:/new-workspace")
  })

  it("a removed device cannot open the channel and is left out of the next key", async () => {
    const charis = await addDevice(f.charis.id)
    const old = await addDevice(f.charis.id)
    const ch = await announcements(charis)
    await rotate(charis, ch)

    as(f.charis.id)
    expect((await actions.revokeDevice(old.deviceId)).ok).toBe(true)
    expect((await actions.loadChannel(ch, old.deviceId)).ok).toBe(false)
    const epoch = await rotate(charis, ch)
    const db = await readDb()
    expect(db.channel_keys.some((k) => k.epoch === epoch && k.device_id === old.deviceId)).toBe(false)
  })

  it("a new key must cover exactly the right devices", async () => {
    const charis = await addDevice(f.charis.id)
    const wanjiru = await addDevice(f.wanjiru.id)
    const zawadi = await addDevice(f.zawadi.id)
    const ch = await announcements(charis)
    const key = await createChannelKey()
    const wrap = async (p: Phone) => ({
      device_id: p.deviceId,
      wrapped_key: await wrapChannelKey(key, charis.keys.privateKey, { deviceId: p.deviceId, publicKey: p.pub }, { channelId: ch, epoch: 1 }),
    })
    as(f.charis.id)
    // Leaving Wanjiru out would lock her out.
    expect((await actions.rotateChannel(ch, charis.deviceId, 1, [await wrap(charis)])).ok).toBe(false)
    // Adding Zawadi, from another workspace, would let her in.
    expect(
      (await actions.rotateChannel(ch, charis.deviceId, 1, [await wrap(charis), await wrap(wanjiru), await wrap(zawadi)])).ok,
    ).toBe(false)
    expect((await actions.rotateChannel(ch, charis.deviceId, 1, [await wrap(charis), await wrap(wanjiru)])).ok).toBe(true)
  })

  it("people outside the workspace, and other people's devices, get nowhere", async () => {
    const charis = await addDevice(f.charis.id)
    const zawadi = await addDevice(f.zawadi.id)
    const ch = await announcements(charis)
    await rotate(charis, ch)

    as(f.zawadi.id)
    signedIn.workspaceId = f.kilima.id
    expect((await actions.loadChannel(ch, zawadi.deviceId)).ok).toBe(false)
    expect((await actions.loadChannels(zawadi.deviceId)).channels.some((c) => c.id === ch)).toBe(false)
    expect((await actions.postMessage(ch, zawadi.deviceId, 1, { iv: "AAAAAAAAAAAAAAAA", ciphertext: "AAAA" })).ok).toBe(false)
    signedIn.workspaceId = undefined

    // Wanjiru cannot use Charis's device.
    as(f.wanjiru.id)
    expect((await actions.loadChannel(ch, charis.deviceId)).ok).toBe(false)
    expect((await actions.postMessage(ch, charis.deviceId, 1, { iv: "AAAAAAAAAAAAAAAA", ciphertext: "AAAA" })).ok).toBe(false)
  })

  it("a device key with anything private in it is refused", async () => {
    as(f.charis.id)
    const keys = await createDeviceKeys()
    const pub = await exportPublicKey(keys.publicKey)
    expect((await actions.registerDevice("Bad", { ...pub, d: "x".repeat(43) })).ok).toBe(false)
  })

  it("unread counts are per person", async () => {
    const charis = await addDevice(f.charis.id)
    const wanjiru = await addDevice(f.wanjiru.id)
    const ch = await announcements(charis)
    await rotate(charis, ch)
    await send(charis, ch, "One")
    await send(charis, ch, "Two")
    as(f.wanjiru.id)
    expect((await actions.loadChannels(wanjiru.deviceId)).channels[0].unread).toBe(2)
    await actions.markChannelRead(ch)
    expect((await actions.loadChannels(wanjiru.deviceId)).channels[0].unread).toBe(0)
    as(f.charis.id)
    expect((await actions.loadChannels(charis.deviceId)).channels[0].unread).toBe(0)
  })
})

describe("pigeonholes: announcements, groups and direct messages", () => {
  it("everyone reads announcements, but only owners and admins post", async () => {
    const charis = await addDevice(f.charis.id)
    const achieng = await addDevice(f.achieng.id)
    const ch = await announcements(charis)
    await rotate(charis, ch)
    expect((await send(charis, ch, "Office closed on Friday")).ok).toBe(true)
    const r = await send(achieng, ch, "Can I post here?")
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/owners and admins/)
    as(f.charis.id)
    expect((await send(charis, ch, "Reminder: KEBS visit Monday")).ok).toBe(true)
    expect(await readAll(achieng, ch)).toEqual(["Office closed on Friday", "Reminder: KEBS visit Monday"])
  })

  it("a group is only for its members; someone added later cannot read what came before", async () => {
    const charis = await addDevice(f.charis.id)
    const wanjiru = await addDevice(f.wanjiru.id)
    const achieng = await addDevice(f.achieng.id)
    const otieno = await addDevice(f.otieno.id)

    as(f.charis.id)
    const made = await actions.createGroup("PPE logistics", [f.wanjiru.id])
    expect(made.ok).toBe(true)
    const g = made.id!
    await rotate(charis, g)
    expect((await send(charis, g, "Truck booked for Tuesday")).ok).toBe(true)

    // Otieno is not in it: it is not in his list and will not open.
    as(f.otieno.id)
    expect((await actions.loadChannels(otieno.deviceId)).channels.some((c) => c.id === g)).toBe(false)
    expect((await actions.loadChannel(g, otieno.deviceId)).ok).toBe(false)

    // Wanjiru adds Achieng; the key is made again before anyone can send.
    as(f.wanjiru.id)
    expect((await actions.addGroupMembers(g, [f.achieng.id])).ok).toBe(true)
    expect((await send(wanjiru, g, "Welcome Achieng")).ok).toBe(false)
    await rotate(wanjiru, g)
    expect((await send(wanjiru, g, "Welcome Achieng")).ok).toBe(true)
    expect(await readAll(achieng, g)).toEqual(["Welcome Achieng"])
    expect(await readAll(wanjiru, g)).toEqual(["Truck booked for Tuesday", "Welcome Achieng"])
  })

  it("you can leave a group; only its starter or an owner or admin removes someone else", async () => {
    await addDevice(f.charis.id)
    as(f.achieng.id)
    const g = (await actions.createGroup("Procurement", [f.otieno.id, f.charis.id])).id!
    as(f.otieno.id)
    expect((await actions.removeGroupMember(g, f.achieng.id)).ok).toBe(false)
    expect((await actions.removeGroupMember(g, f.otieno.id)).ok).toBe(true)
    as(f.charis.id)
    expect((await actions.removeGroupMember(g, f.achieng.id)).ok).toBe(true)
    const db = await readDb()
    expect(db.channel_members.filter((m) => m.channel_id === g).map((m) => m.user_id)).toEqual([f.charis.id])
  })

  it("groups take only people from this workspace, and viewers cannot start one", async () => {
    as(f.charis.id)
    expect((await actions.createGroup("Mixed", [f.zawadi.id])).ok).toBe(false)
    expect((await actions.createGroup("Alone", [])).ok).toBe(false)
    as(f.brian.id)
    expect((await actions.createGroup("Accounts", [f.charis.id])).ok).toBe(false)
  })

  it("a direct message is for two people only, and starting it again opens the same one", async () => {
    const charis = await addDevice(f.charis.id)
    const wanjiru = await addDevice(f.wanjiru.id)
    const otieno = await addDevice(f.otieno.id)
    as(f.charis.id)
    const dm = (await actions.startDirectMessage(f.wanjiru.id)).id!
    expect((await actions.startDirectMessage(f.wanjiru.id)).id).toBe(dm)
    as(f.wanjiru.id)
    expect((await actions.startDirectMessage(f.charis.id)).id).toBe(dm)

    await rotate(charis, dm)
    expect((await send(charis, dm, "Private: the price we can go to is KSh 400")).ok).toBe(true)
    expect(await readAll(wanjiru, dm)).toEqual(["Private: the price we can go to is KSh 400"])

    // Otieno cannot open it, and an owner is not let in either.
    as(f.otieno.id)
    expect((await actions.loadChannel(dm, otieno.deviceId)).ok).toBe(false)
    as(f.wanjiru.id)
    const wanjiruDm = (await actions.loadChannels(wanjiru.deviceId)).channels.find((c) => c.id === dm)!
    expect(wanjiruDm.name).toBe("Charis N.")
    as(f.charis.id)
    expect((await actions.startDirectMessage(f.charis.id)).ok).toBe(false)
    expect((await actions.startDirectMessage(f.zawadi.id)).ok).toBe(false)
  })

  it("owners and admins do not see groups or messages they are not in", async () => {
    await addDevice(f.charis.id)
    const wanjiru = await addDevice(f.wanjiru.id)
    as(f.achieng.id)
    const dm = (await actions.startDirectMessage(f.otieno.id)).id!
    const g = (await actions.createGroup("Sales", [f.otieno.id])).id!
    as(f.wanjiru.id)
    const mine = (await actions.loadChannels(wanjiru.deviceId)).channels.map((c) => c.id)
    expect(mine).not.toContain(dm)
    expect(mine).not.toContain(g)
    expect((await actions.loadChannel(g, wanjiru.deviceId)).ok).toBe(false)
  })
})

describe("unread counts", () => {
  it("only count messages this device can open", async () => {
    const charis = await addDevice(f.charis.id)
    const ch = await announcements(charis)
    await rotate(charis, ch)
    await send(charis, ch, "Sent before Achieng had a device")
    const achieng = await addDevice(f.achieng.id)
    as(f.achieng.id)
    expect((await actions.loadChannels(achieng.deviceId)).channels.find((c) => c.id === ch)!.unread).toBe(0)
    await rotate(charis, ch)
    await send(charis, ch, "Sent after")
    as(f.achieng.id)
    expect((await actions.loadChannels(achieng.deviceId)).channels.find((c) => c.id === ch)!.unread).toBe(1)
  })
})

describe("fixes from the security review", () => {
  const wrapFor = async (by: Phone, ids: string[], ch: string, epoch: number, pubs: Map<string, PublicKeyJwk>) => {
    const key = await createChannelKey()
    return Promise.all(
      ids.map(async (id) => ({
        device_id: id,
        wrapped_key: await wrapChannelKey(key, by.keys.privateKey, { deviceId: id, publicKey: pubs.get(id)! }, { channelId: ch, epoch }),
      })),
    )
  }

  it("a new key cannot leave someone out by joining two device ids into one", async () => {
    const charis = await addDevice(f.charis.id)
    const wanjiru = await addDevice(f.wanjiru.id)
    const ch = await announcements(charis)
    as(f.charis.id)
    const pubs = new Map([[charis.deviceId, charis.pub], [wanjiru.deviceId, wanjiru.pub]])
    const [mine] = await wrapFor(charis, [charis.deviceId], ch, 1, pubs)
    const ids = [charis.deviceId, wanjiru.deviceId].sort()
    // One entry whose id is both ids joined: the old string comparison let this through.
    const joined = [{ device_id: ids.join(","), wrapped_key: mine.wrapped_key }]
    expect((await actions.rotateChannel(ch, charis.deviceId, 1, joined)).ok).toBe(false)
    // The same device twice instead of the other person.
    const twice = [{ ...mine }, { ...mine }]
    expect((await actions.rotateChannel(ch, charis.deviceId, 1, twice)).ok).toBe(false)
    // A non-string id.
    expect((await actions.rotateChannel(ch, charis.deviceId, 1, [{ device_id: ids as unknown as string, wrapped_key: mine.wrapped_key }])).ok).toBe(false)
  })

  it("a device key that is not a real P-256 point is refused", async () => {
    as(f.otieno.id)
    const fake = { kty: "EC", crv: "P-256", x: "A".repeat(43), y: "B".repeat(43) }
    expect((await actions.registerDevice("Broken", fake)).ok).toBe(false)
  })

  it("removing someone takes them out of their groups, so a re-invite does not restore them", async () => {
    as(f.charis.id)
    const g = (await actions.createGroup("Leadership", [f.otieno.id])).id!
    expect((await actions.removeMember(f.otieno.id)).ok).toBe(true)
    await mutate((d) => {
      d.memberships.push({ workspace_id: f.kilima.id, user_id: f.otieno.id, role: "viewer", created_at: new Date().toISOString() })
    })
    const db = await readDb()
    expect(db.channel_members.some((m) => m.channel_id === g && m.user_id === f.otieno.id)).toBe(false)
    const otieno = await addDevice(f.otieno.id)
    expect((await actions.loadChannel(g, otieno.deviceId)).ok).toBe(false)
  })

  it("a working key cannot be replaced at will, and only owners and admins renew the Announcements key", async () => {
    const charis = await addDevice(f.charis.id)
    const ch = await announcements(charis)
    await rotate(charis, ch)
    as(f.charis.id)
    const pubs = new Map([[charis.deviceId, charis.pub]])
    expect((await actions.rotateChannel(ch, charis.deviceId, 2, await wrapFor(charis, [charis.deviceId], ch, 2, pubs))).ok).toBe(false)

    // Achieng's new device means a new key is needed, but she may not make the Announcements one.
    const achieng = await addDevice(f.achieng.id)
    pubs.set(achieng.deviceId, achieng.pub)
    as(f.achieng.id)
    const r = await actions.rotateChannel(ch, achieng.deviceId, 2, await wrapFor(achieng, [charis.deviceId, achieng.deviceId], ch, 2, pubs))
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/owners and admins/)
    await rotate(charis, ch)
  })

  it("a device that cannot open its key can ask for a new one, and only for the current key", async () => {
    const charis = await addDevice(f.charis.id)
    const wanjiru = await addDevice(f.wanjiru.id)
    as(f.charis.id)
    const g = (await actions.createGroup("Ops", [f.wanjiru.id])).id!
    await rotate(charis, g)
    as(f.otieno.id)
    expect((await actions.reportUnreadableKey(g, wanjiru.deviceId, 1)).ok).toBe(false)
    as(f.wanjiru.id)
    expect((await actions.reportUnreadableKey(g, wanjiru.deviceId, 2)).ok).toBe(false)
    expect((await actions.reportUnreadableKey(g, wanjiru.deviceId, 1)).ok).toBe(true)
    const r = await actions.loadChannel(g, wanjiru.deviceId)
    expect(r.ok && r.state.rotationNeeded).toBe(true)
    expect(await rotate(wanjiru, g)).toBe(2)
    const after = await actions.loadChannel(g, wanjiru.deviceId)
    expect(after.ok && after.state.rotationNeeded).toBe(false)
  })
})

describe("from a chat message", () => {
  it("making a task hands back its id, so the chat card can link to it", async () => {
    as(f.charis.id)
    const fd = new FormData()
    fd.set("title", "Get two glove quotes")
    fd.set("assignee_id", f.achieng.id)
    const r = await actions.createTask(fd)
    expect(r.ok).toBe(true)
    const db = await readDb()
    expect(db.tasks.find((t) => t.id === r.id)?.assignee_id).toBe(f.achieng.id)
  })

  it("record options only list this workspace's records", async () => {
    as(f.charis.id)
    const o = await actions.loadChatRecordOptions()
    const ids = [...o.projects, ...o.organisations, ...o.contacts, ...o.deals].map((x) => x.value)
    expect(ids.length).toBeGreaterThan(0)
    expect(ids.some((id) => f.elsewhereIds.includes(id))).toBe(false)
  })
})
