/**
 * The encryption core, tested the way the design asks: join, leave, revoke,
 * and tampering, before anyone relies on it. A bug here loses conversations,
 * so these run on every pull request.
 */
import { describe, expect, it } from "vitest"

import {
  createChannelKey,
  createDeviceKeys,
  exportPublicKey,
  isPublicKeyJwk,
  openMessage,
  sealMessage,
  unwrapChannelKey,
  wrapChannelKey,
  type PublicKeyJwk,
} from "@/lib/crypto/e2ee"

type Device = { id: string; keys: CryptoKeyPair; pub: PublicKeyJwk }

async function device(id: string): Promise<Device> {
  const keys = await createDeviceKeys()
  return { id, keys, pub: await exportPublicKey(keys.publicKey) }
}

/** What a rotation does: a new key, wrapped by one device for every current device. */
async function rotate(by: Device, members: Device[], channelId: string, epoch: number) {
  const key = await createChannelKey()
  const rows = new Map<string, string>()
  for (const m of members) {
    rows.set(m.id, await wrapChannelKey(key, by.keys.privateKey, { deviceId: m.id, publicKey: m.pub }, { channelId, epoch }))
  }
  return { key, rows, wrapper: by.pub }
}

const open = async (d: Device, epochRows: Awaited<ReturnType<typeof rotate>>, channelId: string, epoch: number) => {
  const wrapped = epochRows.rows.get(d.id)
  if (!wrapped) throw new Error("No key for this device")
  return unwrapChannelKey(wrapped, d.keys.privateKey, d.id, epochRows.wrapper, { channelId, epoch })
}

describe("device keys", () => {
  it("the private half cannot be exported", async () => {
    const d = await device("a")
    expect(d.keys.privateKey.extractable).toBe(false)
    await expect(crypto.subtle.exportKey("jwk", d.keys.privateKey)).rejects.toThrow()
  })

  it("only a plain public key is accepted by the server", async () => {
    const d = await device("a")
    expect(isPublicKeyJwk(d.pub)).toBe(true)
    expect(isPublicKeyJwk({ ...d.pub, d: "secret" })).toBe(false)
    expect(isPublicKeyJwk({ ...d.pub, crv: "P-384" })).toBe(false)
    expect(isPublicKeyJwk({ kty: "EC", crv: "P-256", x: "short", y: "short" })).toBe(false)
    expect(isPublicKeyJwk("not a key")).toBe(false)
  })
})

describe("a channel through join, leave and revoke", () => {
  const ch = "channel-1"

  it("members read each other; a newcomer cannot read the past; someone removed cannot read the future", async () => {
    const alice = await device("alice-phone")
    const bob = await device("bob-laptop")
    const carol = await device("carol-phone")

    // Epoch 1: Alice and Bob.
    const e1 = await rotate(alice, [alice, bob], ch, 1)
    const hello = await sealMessage(e1.key, { text: "Habari, Bob" }, { channelId: ch, epoch: 1, senderDeviceId: alice.id })
    const bobKey1 = await open(bob, e1, ch, 1)
    expect((await openMessage(bobKey1, hello, { channelId: ch, epoch: 1, senderDeviceId: alice.id })).text).toBe("Habari, Bob")

    // Carol joins: epoch 2. She has no epoch 1 key, so yesterday stays closed to her.
    const e2 = await rotate(bob, [alice, bob, carol], ch, 2)
    await expect(open(carol, e1, ch, 1)).rejects.toThrow()
    const carolKey2 = await open(carol, e2, ch, 2)
    const welcome = await sealMessage(e2.key, { text: "Karibu Carol" }, { channelId: ch, epoch: 2, senderDeviceId: bob.id })
    expect((await openMessage(carolKey2, welcome, { channelId: ch, epoch: 2, senderDeviceId: bob.id })).text).toBe("Karibu Carol")

    // Bob leaves: epoch 3 is not wrapped for him, so he cannot read what follows.
    const e3 = await rotate(alice, [alice, carol], ch, 3)
    await expect(open(bob, e3, ch, 3)).rejects.toThrow()
    const after = await sealMessage(e3.key, { text: "After Bob" }, { channelId: ch, epoch: 3, senderDeviceId: alice.id })
    const bobOld = await open(bob, e2, ch, 2)
    await expect(openMessage(bobOld, after, { channelId: ch, epoch: 3, senderDeviceId: alice.id })).rejects.toThrow()
  })

  it("a key wrapped for one device does not open on another", async () => {
    const alice = await device("alice-phone")
    const bob = await device("bob-laptop")
    const mallory = await device("mallory")
    const e1 = await rotate(alice, [alice, bob], ch, 1)
    // Mallory takes Bob's wrapped key and tries it as her own.
    await expect(
      unwrapChannelKey(e1.rows.get(bob.id)!, mallory.keys.privateKey, bob.id, alice.pub, { channelId: ch, epoch: 1 }),
    ).rejects.toThrow()
    // Bob's own key, presented as for another epoch or channel, fails too.
    await expect(
      unwrapChannelKey(e1.rows.get(bob.id)!, bob.keys.privateKey, bob.id, alice.pub, { channelId: ch, epoch: 2 }),
    ).rejects.toThrow()
    await expect(
      unwrapChannelKey(e1.rows.get(bob.id)!, bob.keys.privateKey, bob.id, alice.pub, { channelId: "other", epoch: 1 }),
    ).rejects.toThrow()
  })

  it("an opened channel key cannot be exported again", async () => {
    const alice = await device("alice-phone")
    const e1 = await rotate(alice, [alice], ch, 1)
    const k = await open(alice, e1, ch, 1)
    expect(k.extractable).toBe(false)
  })
})

describe("messages", () => {
  const ctx = { channelId: "c", epoch: 1, senderDeviceId: "d" }

  it("a changed message fails to open", async () => {
    const key = await createChannelKey()
    const sealed = await sealMessage(key, { text: "Pay KSh 10,000" }, ctx)
    const bytes = Uint8Array.from(atob(sealed.ciphertext), (c) => c.charCodeAt(0))
    bytes[0] ^= 1
    const tampered = { ...sealed, ciphertext: btoa(String.fromCharCode(...bytes)) }
    await expect(openMessage(key, tampered, ctx)).rejects.toThrow()
  })

  it("a message moved to another channel, epoch or sender fails to open", async () => {
    const key = await createChannelKey()
    const sealed = await sealMessage(key, { text: "hello" }, ctx)
    await expect(openMessage(key, sealed, { ...ctx, channelId: "other" })).rejects.toThrow()
    await expect(openMessage(key, sealed, { ...ctx, epoch: 2 })).rejects.toThrow()
    await expect(openMessage(key, sealed, { ...ctx, senderDeviceId: "someone-else" })).rejects.toThrow()
  })

  it("the sealed form does not contain the text", async () => {
    const key = await createChannelKey()
    const sealed = await sealMessage(key, { text: "secret supplier price" }, ctx)
    expect(JSON.stringify(sealed)).not.toContain("secret")
    expect(sealed.iv).not.toBe((await sealMessage(key, { text: "secret supplier price" }, ctx)).iv)
  })
})

describe("task cards inside messages", () => {
  const ctx = { channelId: "c", epoch: 1, senderDeviceId: "d" }
  const card = { kind: "task" as const, taskId: "t1", title: "Get two glove quotes", assignee: "Achieng", href: "/projects/p1" }

  it("a card travels sealed with the text and opens again", async () => {
    const key = await createChannelKey()
    const sealed = await sealMessage(key, { text: "New task for Achieng: Get two glove quotes", card }, ctx)
    expect(JSON.stringify(sealed)).not.toContain("glove")
    expect((await openMessage(key, sealed, ctx)).card).toEqual(card)
  })

  it("a card that links off the app, or is the wrong shape, is dropped and the text kept", async () => {
    const key = await createChannelKey()
    for (const bad of [
      { ...card, href: "https://evil.example" },
      { ...card, href: "//evil.example" },
      { ...card, href: "javascript:alert(1)" },
      { ...card, taskId: 7 },
    ]) {
      const sealed = await sealMessage(key, { text: "hello", card: bad as never }, ctx)
      const body = await openMessage(key, sealed, ctx)
      expect(body.text).toBe("hello")
      expect(body.card).toBeUndefined()
    }
  })
})

describe("tags inside messages", () => {
  const ctx = { channelId: "c", epoch: 1, senderDeviceId: "d" }

  it("tags travel sealed with the text and open again", async () => {
    const key = await createChannelKey()
    const sealed = await sealMessage(key, { text: "@Achieng please send the quote", mentions: ["user-1"] }, ctx)
    expect(JSON.stringify(sealed)).not.toContain("user-1")
    expect((await openMessage(key, sealed, ctx)).mentions).toEqual(["user-1"])
  })

  it("tags that are the wrong shape, or far too many, are dropped and the text kept", async () => {
    const key = await createChannelKey()
    for (const bad of [[7], "everyone", { id: "x" }, Array.from({ length: 21 }, (_, i) => `u${i}`), ["x".repeat(65)]]) {
      const sealed = await sealMessage(key, { text: "hello", mentions: bad as never }, ctx)
      const body = await openMessage(key, sealed, ctx)
      expect(body.text).toBe("hello")
      expect(body.mentions).toBeUndefined()
    }
  })
})
