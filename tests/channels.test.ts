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

async function general(phone: Phone) {
  as(phone.userId)
  const r = await actions.loadChannels(phone.deviceId)
  return r.channels.find((c) => c.name === "general")!.id
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
    const ch = await general(charis)
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
    const ch = await general(charis)
    await rotate(charis, ch)
    await addDevice(f.wanjiru.id)
    const r = await send(charis, ch, "Should wait")
    expect(r.ok).toBe(false)
  })

  it("someone who leaves the workspace is left out of the next key", async () => {
    const charis = await addDevice(f.charis.id)
    const otieno = await addDevice(f.otieno.id)
    const ch = await general(charis)
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
    const ch = await general(charis)
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
    const ch = await general(charis)
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
    const ch = await general(charis)
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
    const ch = await general(charis)
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
