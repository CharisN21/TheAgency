import { describe, expect, it } from "vitest"

import { openBody, sealBody } from "@/lib/chat/at-rest"

const where = { workspaceId: "w1", channelId: "c1", senderId: "u1" }

describe("messages stored encrypted", () => {
  it("opens again with its text, tags and card", () => {
    const body = {
      text: "Supplier price is KSh 450 a box",
      mentions: ["u2"],
      card: { kind: "task" as const, taskId: "t1", title: "Get quotes", assignee: "Achieng", href: "/projects/p1" },
    }
    expect(openBody(sealBody(body, where), where)).toEqual(body)
  })

  it("shows nothing readable in what is stored", () => {
    const stored = sealBody({ text: "Supplier price is KSh 450 a box", mentions: ["u2"] }, where)
    const raw = Buffer.from(stored, "base64").toString("latin1")
    expect(stored).not.toContain("Supplier")
    expect(raw).not.toContain("450")
    expect(raw).not.toContain("u2")
  })

  it("seals the same text differently each time", () => {
    expect(sealBody({ text: "hello" }, where)).not.toBe(sealBody({ text: "hello" }, where))
  })

  it("will not open if moved to another chat, workspace or sender", () => {
    const stored = sealBody({ text: "private" }, where)
    expect(openBody(stored, { ...where, channelId: "c2" })).toBeNull()
    expect(openBody(stored, { ...where, workspaceId: "w2" })).toBeNull()
    expect(openBody(stored, { ...where, senderId: "u2" })).toBeNull()
  })

  it("will not open if changed, cut short or not a message at all", () => {
    const stored = sealBody({ text: "private" }, where)
    const bytes = Buffer.from(stored, "base64")
    bytes[bytes.length - 1] ^= 1
    expect(openBody(bytes.toString("base64"), where)).toBeNull()
    expect(openBody(stored.slice(0, 20), where)).toBeNull()
    expect(openBody("", where)).toBeNull()
    expect(openBody("not base64 at all !!", where)).toBeNull()
  })
})
