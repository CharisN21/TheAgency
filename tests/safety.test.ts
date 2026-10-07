import { describe, expect, it } from "vitest"

import { safetyNumber } from "@/lib/crypto/safety"

const k = (n: string) => ({ x: `x-${n}`, y: `y-${n}` })
const alice = { userId: "alice", keys: [k("a1")] }
const bob = { userId: "bob", keys: [k("b1")] }

describe("safety numbers", () => {
  it("is twelve groups of five digits", async () => {
    expect(await safetyNumber(alice, bob)).toMatch(/^(\d{5} ){11}\d{5}$/)
  })

  it("reads the same for both people, whoever works it out", async () => {
    expect(await safetyNumber(alice, bob)).toBe(await safetyNumber(bob, alice))
  })

  it("does not depend on the order a person's keys come in", async () => {
    const two = { userId: "alice", keys: [k("a1"), k("a2")] }
    const flipped = { userId: "alice", keys: [k("a2"), k("a1")] }
    expect(await safetyNumber(two, bob)).toBe(await safetyNumber(flipped, bob))
  })

  it("changes when either person gets another key", async () => {
    const before = await safetyNumber(alice, bob)
    expect(await safetyNumber({ ...alice, keys: [...alice.keys, k("a2")] }, bob)).not.toBe(before)
    expect(await safetyNumber(alice, { ...bob, keys: [...bob.keys, k("b2")] })).not.toBe(before)
  })

  it("changes when a key is swapped for a lookalike", async () => {
    const swapped = { userId: "alice", keys: [{ x: "x-a1", y: "y-a1-but-different" }] }
    expect(await safetyNumber(swapped, bob)).not.toBe(await safetyNumber(alice, bob))
  })

  it("is different for each pair of people", async () => {
    const carol = { userId: "carol", keys: [k("c1")] }
    expect(await safetyNumber(alice, carol)).not.toBe(await safetyNumber(alice, bob))
  })

  it("tells two people with the same keys apart by who they are", async () => {
    const mallory = { userId: "mallory", keys: bob.keys }
    expect(await safetyNumber(alice, mallory)).not.toBe(await safetyNumber(alice, bob))
  })
})
