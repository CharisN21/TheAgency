/**
 * Team chat, against the real server actions: who can open and post where,
 * that messages are stored encrypted, and that everything the browser sends is
 * checked again by the server.
 */
import { beforeEach, describe, expect, it } from "vitest"

import * as actions from "@/lib/data/actions"
import { mutate, readDb } from "@/lib/data/store"
import { loadFixture } from "./fixture"
import { signedIn } from "./setup"

let f: Awaited<ReturnType<typeof loadFixture>>

beforeEach(async () => {
  f = await loadFixture()
  signedIn.workspaceId = undefined
})

const as = (userId: string) => {
  signedIn.userId = userId
}

const announcements = async (userId: string) => {
  as(userId)
  return (await actions.loadChannels()).channels.find((c) => c.kind === "announcements")!.id
}

const send = (userId: string, ch: string, text: string, extra: { mentions?: string[] } = {}) => {
  as(userId)
  return actions.postMessage(ch, { text, ...extra })
}

const read = async (userId: string, ch: string) => {
  as(userId)
  const r = await actions.loadChannel(ch)
  if (!r.ok) throw new Error(r.message)
  return r.state.messages.map((m) => m.text)
}

const canOpen = async (userId: string, ch: string) => {
  as(userId)
  return (await actions.loadChannel(ch)).ok
}

describe("messages", () => {
  it("members talk, and what is stored holds no readable text", async () => {
    const ch = await announcements(f.charis.id)
    expect((await send(f.charis.id, ch, "Supplier price is KSh 450 a box")).ok).toBe(true)
    expect(await read(f.achieng.id, ch)).toEqual(["Supplier price is KSh 450 a box"])
    const stored = JSON.stringify((await readDb()).messages)
    expect(stored).not.toContain("KSh 450")
    expect(stored).not.toContain("Supplier")
  })

  it("a stored message that was changed, or moved to another chat, is counted as unreadable, not hidden", async () => {
    const ch = await announcements(f.charis.id)
    as(f.charis.id)
    const g = (await actions.createGroup("Ops", [f.wanjiru.id])).id!
    await send(f.charis.id, ch, "first")
    await send(f.charis.id, ch, "second")
    await mutate((d) => {
      const [a, b] = d.messages
      b.body = a.body.slice(0, -4) + "AAAA" // changed
      d.messages.push({ ...a, id: "moved", channel_id: g }) // copied into another chat
    })
    as(f.achieng.id)
    const r = await actions.loadChannel(ch)
    expect(r.ok && r.state.unreadable).toBe(1)
    expect(r.ok && r.state.messages.map((m) => m.text)).toEqual(["first"])
    as(f.wanjiru.id)
    const g2 = await actions.loadChannel(g)
    expect(g2.ok && g2.state.unreadable).toBe(1)
  })

  it("is checked again by the server: empty, too long, and not a string", async () => {
    const ch = await announcements(f.charis.id)
    expect((await send(f.charis.id, ch, "   ")).ok).toBe(false)
    expect((await send(f.charis.id, ch, "x".repeat(4001))).ok).toBe(false)
    expect((await send(f.charis.id, ch, "x".repeat(4000))).ok).toBe(true)
    as(f.charis.id)
    expect((await actions.postMessage(ch, { text: 42 as never })).ok).toBe(false)
  })

  it("only lets you tag people who are in the chat", async () => {
    as(f.charis.id)
    const g = (await actions.createGroup("PPE", [f.wanjiru.id])).id!
    expect((await send(f.charis.id, g, "hi", { mentions: [f.wanjiru.id] })).ok).toBe(true)
    expect((await send(f.charis.id, g, "hi", { mentions: [f.achieng.id] })).ok).toBe(false)
    expect((await send(f.charis.id, g, "hi", { mentions: [f.zawadi.id] })).ok).toBe(false)
    expect((await send(f.charis.id, g, "hi", { mentions: "everyone" as never })).ok).toBe(false)
    expect((await send(f.charis.id, g, "hi", { mentions: Array.from({ length: 21 }, () => f.wanjiru.id) })).ok).toBe(false)
  })

  it("a task card must point at a real task here and an in-app page", async () => {
    as(f.charis.id)
    const g = (await actions.createGroup("PPE", [f.wanjiru.id])).id!
    const fd = new FormData()
    fd.set("title", "Get two glove quotes")
    fd.set("assignee_id", f.wanjiru.id)
    const made = await actions.createTask(fd)
    const card = { kind: "task" as const, taskId: made.id!, title: "Get two glove quotes", assignee: "Wanjiru", href: `/team/${f.wanjiru.id}` }
    const post = (c: unknown) => actions.postMessage(g, { text: "New task", card: c as never })
    expect((await post(card)).ok).toBe(true)
    expect((await post({ ...card, href: "https://evil.example" })).ok).toBe(false)
    expect((await post({ ...card, href: "//evil.example" })).ok).toBe(false)
    expect((await post({ ...card, href: "/\\evil.example" })).ok).toBe(false)
    expect((await post({ ...card, taskId: "no-such-task" })).ok).toBe(false)
    expect((await post({ ...card, taskId: 7 })).ok).toBe(false)
    const stored = await actions.loadChannel(g)
    expect(stored.ok && stored.state.messages.filter((m) => m.card).length).toBe(1)
  })

  it("a task from another workspace cannot be put on a card here", async () => {
    const other = f.db.tasks.find((t) => t.workspace_id === f.elsewhere.id)!
    as(f.charis.id)
    const g = (await actions.createGroup("PPE", [f.wanjiru.id])).id!
    const r = await actions.postMessage(g, {
      text: "New task",
      card: { kind: "task", taskId: other.id, title: "x", assignee: "y", href: "/team" },
    })
    expect(r.ok).toBe(false)
  })
})

describe("announcements, groups and direct messages", () => {
  it("everyone reads announcements, but only owners and admins post", async () => {
    const ch = await announcements(f.charis.id)
    expect((await send(f.charis.id, ch, "Office closed on Friday")).ok).toBe(true)
    const r = await send(f.achieng.id, ch, "Can I post here?")
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/owners and admins/)
    expect((await send(f.wanjiru.id, ch, "Reminder: KEBS visit Monday")).ok).toBe(true)
    expect(await read(f.brian.id, ch)).toEqual(["Office closed on Friday", "Reminder: KEBS visit Monday"])
  })

  it("a group is only for its members; someone added later reads what came before", async () => {
    as(f.charis.id)
    const g = (await actions.createGroup("PPE logistics", [f.wanjiru.id])).id!
    await send(f.charis.id, g, "Truck booked for Tuesday")
    expect(await canOpen(f.otieno.id, g)).toBe(false)
    as(f.otieno.id)
    expect((await actions.loadChannels()).channels.some((c) => c.id === g)).toBe(false)

    as(f.wanjiru.id)
    expect((await actions.addGroupMembers(g, [f.achieng.id])).ok).toBe(true)
    expect(await read(f.achieng.id, g)).toEqual(["Truck booked for Tuesday"])
  })

  it("you can leave a group; only its starter or an owner or admin removes someone else", async () => {
    as(f.achieng.id)
    const g = (await actions.createGroup("Procurement", [f.otieno.id, f.charis.id])).id!
    as(f.otieno.id)
    expect((await actions.removeGroupMember(g, f.achieng.id)).ok).toBe(false)
    expect((await actions.removeGroupMember(g, f.otieno.id)).ok).toBe(true)
    expect(await canOpen(f.otieno.id, g)).toBe(false)
    as(f.charis.id)
    expect((await actions.removeGroupMember(g, f.achieng.id)).ok).toBe(true)
    expect((await readDb()).channel_members.filter((m) => m.channel_id === g).map((m) => m.user_id)).toEqual([f.charis.id])
  })

  it("groups take only people from this workspace, and viewers cannot start one", async () => {
    as(f.charis.id)
    expect((await actions.createGroup("Mixed", [f.zawadi.id])).ok).toBe(false)
    expect((await actions.createGroup("Alone", [])).ok).toBe(false)
    as(f.brian.id)
    expect((await actions.createGroup("Accounts", [f.charis.id])).ok).toBe(false)
  })

  it("a direct message is for two people only, and starting it again opens the same one", async () => {
    as(f.charis.id)
    const dm = (await actions.startDirectMessage(f.wanjiru.id)).id!
    expect((await actions.startDirectMessage(f.wanjiru.id)).id).toBe(dm)
    as(f.wanjiru.id)
    expect((await actions.startDirectMessage(f.charis.id)).id).toBe(dm)
    await send(f.charis.id, dm, "Private: we can go to KSh 400")
    expect(await read(f.wanjiru.id, dm)).toEqual(["Private: we can go to KSh 400"])
    expect(await canOpen(f.otieno.id, dm)).toBe(false)
    as(f.wanjiru.id)
    expect((await actions.loadChannels()).channels.find((c) => c.id === dm)!.name).toBe("Charis N.")
    as(f.charis.id)
    expect((await actions.startDirectMessage(f.charis.id)).ok).toBe(false)
    expect((await actions.startDirectMessage(f.zawadi.id)).ok).toBe(false)
  })

  it("owners and admins do not see chats they are not in", async () => {
    as(f.achieng.id)
    const dm = (await actions.startDirectMessage(f.otieno.id)).id!
    const g = (await actions.createGroup("Sales", [f.otieno.id])).id!
    await send(f.achieng.id, dm, "between us")
    as(f.wanjiru.id)
    const mine = (await actions.loadChannels()).channels.map((c) => c.id)
    expect(mine).not.toContain(dm)
    expect(mine).not.toContain(g)
    expect(await canOpen(f.wanjiru.id, g)).toBe(false)
    expect(await canOpen(f.charis.id, dm)).toBe(false)
    expect((await send(f.wanjiru.id, dm, "sneaking in")).ok).toBe(false)
  })

  it("people from another workspace get nowhere, even with a chat's id", async () => {
    const ch = await announcements(f.charis.id)
    as(f.charis.id)
    const g = (await actions.createGroup("PPE", [f.wanjiru.id])).id!
    as(f.zawadi.id)
    signedIn.workspaceId = f.kilima.id
    for (const id of [ch, g]) {
      expect((await actions.loadChannel(id)).ok).toBe(false)
      expect((await actions.postMessage(id, { text: "hello" })).ok).toBe(false)
    }
    expect((await actions.loadChannels()).channels.some((c) => c.id === ch || c.id === g)).toBe(false)
  })

  it("unread counts are per person", async () => {
    const ch = await announcements(f.charis.id)
    await send(f.charis.id, ch, "One")
    await send(f.charis.id, ch, "Two")
    as(f.wanjiru.id)
    expect((await actions.loadChannels()).channels.find((c) => c.id === ch)!.unread).toBe(2)
    await actions.markChannelRead(ch)
    expect((await actions.loadChannels()).channels.find((c) => c.id === ch)!.unread).toBe(0)
    as(f.charis.id)
    expect((await actions.loadChannels()).channels.find((c) => c.id === ch)!.unread).toBe(0)
  })

  it("removing someone from the workspace takes them out of its groups, so a re-invite does not restore them", async () => {
    as(f.charis.id)
    const g = (await actions.createGroup("Leadership", [f.otieno.id])).id!
    expect((await actions.removeMember(f.otieno.id)).ok).toBe(true)
    await mutate((d) => {
      d.memberships.push({ workspace_id: f.kilima.id, user_id: f.otieno.id, role: "viewer", created_at: new Date().toISOString() })
    })
    expect((await readDb()).channel_members.some((m) => m.channel_id === g && m.user_id === f.otieno.id)).toBe(false)
    expect(await canOpen(f.otieno.id, g)).toBe(false)
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
    expect((await readDb()).tasks.find((t) => t.id === r.id)?.assignee_id).toBe(f.achieng.id)
  })

  it("record options only list this workspace's records", async () => {
    as(f.charis.id)
    const o = await actions.loadChatRecordOptions()
    const ids = [...o.projects, ...o.organisations, ...o.contacts, ...o.deals].map((x) => x.value)
    expect(ids.length).toBeGreaterThan(0)
    expect(ids.some((id) => f.elsewhereIds.includes(id))).toBe(false)
  })
})

describe("a chat for each project", () => {
  const project = () => f.db.projects.find((p) => p.workspace_id === f.kilima.id)!

  it("starts a group named after the project, with its lead and members, once", async () => {
    const p = project()
    as(p.lead_id)
    const r = await actions.startProjectChat(p.id)
    expect(r.ok).toBe(true)
    const db = await readDb()
    const ch = db.channels.find((c) => c.id === r.id)!
    expect(ch.kind).toBe("group")
    expect(ch.project_id).toBe(p.id)
    expect(ch.name).toBe(p.name.slice(0, 40))
    const inIt = db.channel_members.filter((m) => m.channel_id === ch.id).map((m) => m.user_id).sort()
    expect(inIt).toEqual([...new Set([p.lead_id, ...p.member_ids])].sort())
    expect((await actions.startProjectChat(p.id)).id).toBe(r.id)
    expect((await readDb()).channels.filter((c) => c.project_id === p.id).length).toBe(1)
  })

  it("is not for outsiders, viewers or other workspaces", async () => {
    const p = project()
    const roleOf = (id: string) => f.db.memberships.find((m) => m.workspace_id === f.kilima.id && m.user_id === id)!.role
    const outsider = [f.charis, f.wanjiru, f.otieno, f.achieng].find(
      (u) => u.id !== p.lead_id && !p.member_ids.includes(u.id) && !["owner", "admin"].includes(roleOf(u.id)),
    )
    if (outsider) {
      as(outsider.id)
      expect((await actions.startProjectChat(p.id)).ok).toBe(false)
    }
    as(f.brian.id)
    expect((await actions.startProjectChat(p.id)).ok).toBe(false)
    as(f.zawadi.id)
    signedIn.workspaceId = f.kilima.id
    expect((await actions.startProjectChat(p.id)).ok).toBe(false)
    expect((await readDb()).channels.some((c) => c.project_id === p.id)).toBe(false)
  })

  it("does not let an owner into a project chat they are not in", async () => {
    const p = project()
    as(p.lead_id)
    const r = await actions.startProjectChat(p.id)
    await mutate((d) => {
      d.channel_members = d.channel_members.filter((m) => !(m.channel_id === r.id && m.user_id === f.charis.id))
    })
    as(f.charis.id)
    const again = await actions.startProjectChat(p.id)
    expect(again.ok).toBe(false)
    expect(again.message).toMatch(/Ask someone in it/)
  })

  it("keeps the chat to read once the project is closed, and opens it again on reopening", async () => {
    const p = project()
    as(p.lead_id)
    const r = await actions.startProjectChat(p.id)
    expect((await actions.postMessage(r.id!, { text: "before closing" })).ok).toBe(true)

    await mutate((d) => {
      d.projects.find((x) => x.id === p.id)!.status = "closed"
    })
    const closed = await actions.postMessage(r.id!, { text: "after closing" })
    expect(closed.ok).toBe(false)
    expect(closed.message).toMatch(/closed/)
    const opened = await actions.loadChannel(r.id!)
    if (!opened.ok) throw new Error("should open")
    expect(opened.state.closedProject).toBe(true)
    expect(opened.state.canPost).toBe(false)
    expect(opened.state.messages.map((m) => m.text)).toEqual(["before closing"])

    await mutate((d) => {
      d.projects.find((x) => x.id === p.id)!.status = "active"
    })
    expect((await actions.postMessage(r.id!, { text: "back again" })).ok).toBe(true)
  })
})
