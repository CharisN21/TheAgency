/**
 * The notebook is private: only the author reads, changes or deletes a note.
 * Not another member, not an owner or admin, not another workspace.
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

const mine = (id: string, workspace = f.kilima.id) => q.listMyNotes(workspace, id)

describe("keeping a note", () => {
  it("keeps a trimmed note for its author", async () => {
    as(f.wanjiru.id)
    const r = await actions.captureNote("  Ring Eastern Reagents about the Q4 price  ")
    expect(r.ok).toBe(true)
    const notes = await mine(f.wanjiru.id)
    expect(notes).toHaveLength(1)
    expect(notes[0].body).toBe("Ring Eastern Reagents about the Q4 price")
    expect(notes[0].author_id).toBe(f.wanjiru.id)
    expect(notes[0].workspace_id).toBe(f.kilima.id)
  })

  it("lets a viewer keep notes too, since they are theirs alone", async () => {
    const db = await readDb()
    const m = db.memberships.find((x) => x.user_id === f.brian.id && x.workspace_id === f.kilima.id)!
    m.role = "viewer"
    await mutate((d) => {
      d.memberships = db.memberships
    })
    as(f.brian.id)
    expect((await actions.captureNote("A viewer's thought")).ok).toBe(true)
  })

  it("refuses an empty note, one that is too long, and non-text", async () => {
    as(f.wanjiru.id)
    expect((await actions.captureNote("   ")).ok).toBe(false)
    expect((await actions.captureNote("x".repeat(10001))).ok).toBe(false)
    expect((await actions.captureNote(undefined as unknown as string)).ok).toBe(false)
    expect((await actions.captureNote("x".repeat(10000))).ok).toBe(true)
  })

  it("stops at 2,000 notes each", async () => {
    as(f.wanjiru.id)
    await mutate((d) => {
      for (let i = 0; i < 2000; i++) {
        d.notes.push({ id: `n${i}`, workspace_id: f.kilima.id, author_id: f.wanjiru.id, body: "x", pinned: false, created_at: "2026-10-01", updated_at: "2026-10-01" })
      }
    })
    expect((await actions.captureNote("one too many")).ok).toBe(false)
    as(f.achieng.id)
    expect((await actions.captureNote("someone else is fine")).ok).toBe(true)
  })
})

describe("a note is private", () => {
  let noteId: string
  beforeEach(async () => {
    as(f.wanjiru.id)
    noteId = (await actions.captureNote("Thinking about letting a supplier go"))!.id!
  })

  it("is not in anyone else's notebook, owners and admins included", async () => {
    for (const other of [f.charis.id, f.achieng.id, f.otieno.id, f.brian.id]) {
      expect(await mine(other), other).toHaveLength(0)
    }
  })

  it("is not in another workspace's list, even for its author", async () => {
    expect(await mine(f.wanjiru.id, f.elsewhere.id)).toHaveLength(0)
  })

  it("cannot be changed, pinned or deleted by anyone else, owners included", async () => {
    for (const other of [f.charis.id, f.achieng.id]) {
      as(other)
      expect((await actions.updateNote(noteId, "hijacked")).ok, other).toBe(false)
      expect((await actions.setNotePinned(noteId, true)).ok, other).toBe(false)
      expect((await actions.deleteNote(noteId)).ok, other).toBe(false)
    }
    const note = (await readDb()).notes.find((n) => n.id === noteId)!
    expect(note.body).toBe("Thinking about letting a supplier go")
    expect(note.pinned).toBe(false)
  })

  it("cannot be reached by naming its id from another workspace", async () => {
    as(f.zawadi.id)
    signedIn.workspaceId = f.elsewhere.id
    expect((await actions.deleteNote(noteId)).ok).toBe(false)
    expect((await readDb()).notes.some((n) => n.id === noteId)).toBe(true)
  })

  it("never turns up in anyone's other lists", async () => {
    const everything = JSON.stringify([
      await q.listNotifications(f.kilima.id, f.charis.id),
      await q.listOrganisations(f.kilima.id),
      await q.listContacts(f.kilima.id),
      await q.listTasks(f.kilima.id, { withDone: true }),
    ])
    expect(everything).not.toContain("letting a supplier go")
  })
})

describe("working with your own notes", () => {
  it("edits, pins and deletes", async () => {
    as(f.wanjiru.id)
    const first = (await actions.captureNote("first"))!.id!
    const second = (await actions.captureNote("second"))!.id!

    expect((await actions.updateNote(first, "first, edited")).ok).toBe(true)
    expect((await actions.updateNote(first, "   ")).ok).toBe(false)
    expect((await mine(f.wanjiru.id)).find((n) => n.id === first)!.body).toBe("first, edited")

    // Newest edit first; a pinned note goes to the top whatever its age.
    expect((await mine(f.wanjiru.id)).map((n) => n.id)).toEqual([first, second])
    await actions.setNotePinned(second, true)
    expect((await mine(f.wanjiru.id)).map((n) => n.id)).toEqual([second, first])
    await actions.setNotePinned(second, false)

    expect((await actions.deleteNote(first)).ok).toBe(true)
    expect((await actions.deleteNote(first)).ok).toBe(false)
    expect((await mine(f.wanjiru.id)).map((n) => n.id)).toEqual([second])
  })

  it("keeps the words private when posted to a timeline, and leaves the note alone", async () => {
    as(f.wanjiru.id)
    const id = (await actions.captureNote("Agreed a 5% discount on Q4"))!.id!
    const org = f.db.organisations.find((o) => o.workspace_id === f.kilima.id)!
    const fd = new FormData()
    fd.set("summary", "Agreed a 5% discount on Q4")
    fd.set("organisation_id", org.id)
    expect((await actions.logActivity(fd)).ok).toBe(true)

    const db = await readDb()
    expect(db.activities[0].summary).toBe("Agreed a 5% discount on Q4")
    expect(db.activities[0].organisation_id).toBe(org.id)
    expect(db.notes.find((n) => n.id === id)!.author_id).toBe(f.wanjiru.id)
  })
})

describe("titles", () => {
  it("keeps an optional title, tidied, and lets you change or remove it", async () => {
    as(f.wanjiru.id)
    const id = (await actions.captureNote("Call them on Monday", "  Eastern   Reagents  "))!.id!
    expect((await mine(f.wanjiru.id))[0].title).toBe("Eastern Reagents")
    expect((await actions.updateNote(id, "Call them on Tuesday", "Reagents follow-up")).ok).toBe(true)
    expect((await mine(f.wanjiru.id))[0].title).toBe("Reagents follow-up")
    await actions.updateNote(id, "Call them on Tuesday", "")
    expect((await mine(f.wanjiru.id))[0].title).toBeUndefined()
    expect((await actions.captureNote("no title")).ok).toBe(true)
  })

  it("refuses a title that is too long", async () => {
    as(f.wanjiru.id)
    expect((await actions.captureNote("words", "x".repeat(121))).ok).toBe(false)
  })
})

describe("whiteboards", () => {
  const line = [{ c: "ink", w: 1, p: [0.1, 0.1, 0.5, 0.5, 0.9, 0.2] }]

  it("saves a drawing with a title and caption, and changes it later", async () => {
    as(f.wanjiru.id)
    const r = await actions.saveBoard({ title: "Warehouse layout", caption: "Racks on the left", drawing: line })
    expect(r.ok).toBe(true)
    const [board] = await mine(f.wanjiru.id)
    expect(board.kind).toBe("board")
    expect(board.title).toBe("Warehouse layout")
    expect(board.body).toBe("Racks on the left")
    expect(board.drawing).toEqual(line)

    const more = [...line, { c: "primary", w: 2, p: [0.2, 0.8] }, { c: "erase", w: 3, p: [0.5, 0.5, 0.6, 0.6] }]
    expect((await actions.saveBoard({ id: board.id, title: "Warehouse v2", caption: "", drawing: more })).ok).toBe(true)
    const [again] = await mine(f.wanjiru.id)
    expect(again.drawing).toHaveLength(3)
    expect(again.title).toBe("Warehouse v2")
    expect(again.body).toBe("")
  })

  it("rounds points to keep boards small", async () => {
    as(f.wanjiru.id)
    await actions.saveBoard({ title: "", caption: "", drawing: [{ c: "ink", w: 1, p: [0.123456, 0.987654] }] })
    expect((await mine(f.wanjiru.id))[0].drawing![0].p).toEqual([0.123, 0.988])
  })

  it("refuses anything that is not a drawing", async () => {
    as(f.wanjiru.id)
    for (const bad of [
      "not a drawing",
      [{ c: "red", w: 1, p: [0.1, 0.1] }],
      [{ c: "#ff0000", w: 1, p: [0.1, 0.1] }],
      [{ c: "ink", w: 9, p: [0.1, 0.1] }],
      [{ c: "ink", w: 1, p: [0.1] }],
      [{ c: "ink", w: 1, p: [1.5, 0.1] }],
      [{ c: "ink", w: 1, p: [-0.1, 0.1] }],
      [{ c: "ink", w: 1, p: ["0.1", 0.1] }],
      [{ c: "ink", w: 1, p: Array(8002).fill(0.5) }],
      Array(1501).fill({ c: "ink", w: 1, p: [0.1, 0.1] }),
    ]) {
      expect((await actions.saveBoard({ title: "x", caption: "", drawing: bad })).ok, JSON.stringify(bad).slice(0, 60)).toBe(false)
    }
    expect(await mine(f.wanjiru.id)).toHaveLength(0)
  })

  it("does not save a completely empty new board", async () => {
    as(f.wanjiru.id)
    expect((await actions.saveBoard({ title: "", caption: "", drawing: [] })).ok).toBe(false)
  })

  it("is private like a note: nobody else can see or change it, owners included", async () => {
    as(f.wanjiru.id)
    const id = (await actions.saveBoard({ title: "Private sketch", caption: "", drawing: line }))!.id!
    for (const other of [f.charis.id, f.achieng.id]) {
      expect(await mine(other), other).toHaveLength(0)
      as(other)
      expect((await actions.saveBoard({ id, title: "hijack", caption: "", drawing: [] })).ok, other).toBe(false)
      expect((await actions.deleteNote(id)).ok, other).toBe(false)
    }
    expect((await readDb()).notes.find((n) => n.id === id)!.title).toBe("Private sketch")
  })

  it("will not turn a written note into a board", async () => {
    as(f.wanjiru.id)
    const id = (await actions.captureNote("words"))!.id!
    expect((await actions.saveBoard({ id, title: "", caption: "", drawing: line })).ok).toBe(false)
  })
})
