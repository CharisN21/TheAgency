/**
 * Venture logos: real pictures only, redrawn clean at 256 by 256, changed only
 * by the venture's founders, and shown wherever the venture's mark is.
 */
import { existsSync } from "node:fs"
import path from "node:path"

import sharp from "sharp"
import { beforeEach, describe, expect, it } from "vitest"

import { GET as serveLogo } from "@/app/venture-logo/[file]/route"
import * as actions from "@/lib/data/actions"
import * as q from "@/lib/data/queries"
import { readDb } from "@/lib/data/store"
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

const picture = async (format: "jpeg" | "png" | "webp", size = 600) =>
  sharp({ create: { width: size, height: Math.round(size * 0.6), channels: 3, background: { r: 124, g: 31, b: 53 } } })
    .toFormat(format)
    .toBuffer()

const asFile = (data: Buffer, name: string, type: string) => new File([new Uint8Array(data)], name, { type })

const form = (fields: Record<string, string | File>) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

const kilimaVenture = async () => (await readDb()).workspaces.find((w) => w.id === f.kilima.id)!.venture_id
const logosDir = () => path.join(process.env.AGENCY_DATA_DIR!, "logos")

describe("adding a logo", () => {
  it("starts a venture with a JPG logo, redrawn as a 256 by 256 WebP", async () => {
    as(f.charis.id)
    await actions.createVenture(form({ name: "Telecast", logo: asFile(await picture("jpeg"), "telecast.jpg", "image/jpeg") })).catch(() => {})
    const v = (await readDb()).ventures.find((x) => x.name === "Telecast")!
    expect(v.logo).toMatch(/^[0-9a-f-]{36}-\d{13}\.webp$/)

    const res = await serveLogo(new Request("http://x"), { params: Promise.resolve({ file: v.logo! }) })
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toBe("image/webp")
    const meta = await sharp(Buffer.from(await res.arrayBuffer())).metadata()
    expect(meta).toMatchObject({ format: "webp", width: 256, height: 256 })
  })

  it("lets a venture's founder add, change and remove it, cleaning up old files", async () => {
    as(f.charis.id)
    const id = await kilimaVenture()
    expect((await actions.setVentureLogo(form({ venture_id: id, logo: asFile(await picture("png"), "a.png", "image/png") }))).ok).toBe(true)
    const first = (await readDb()).ventures.find((v) => v.id === id)!.logo!
    await new Promise((r) => setTimeout(r, 5))
    expect((await actions.setVentureLogo(form({ venture_id: id, logo: asFile(await picture("webp"), "b.webp", "image/webp") }))).ok).toBe(true)
    const second = (await readDb()).ventures.find((v) => v.id === id)!.logo!
    expect(second).not.toBe(first)
    expect(existsSync(path.join(logosDir(), first))).toBe(false)

    const card = (await q.listMyVentures(f.charis.id)).find((v) => v.id === id)!
    expect(card.logo).toBe(`/venture-logo/${second}`)

    expect((await actions.removeVentureLogo(id)).ok).toBe(true)
    expect((await readDb()).ventures.find((v) => v.id === id)!.logo).toBeUndefined()
    expect(existsSync(path.join(logosDir(), second))).toBe(false)
  })

  it("keeps the logo on the venture, where marks and banners read it from", async () => {
    as(f.charis.id)
    const id = await kilimaVenture()
    await actions.setVentureLogo(form({ venture_id: id, logo: asFile(await picture("png"), "a.png", "image/png") }))
    const v = (await readDb()).ventures.find((x) => x.id === id)!
    expect(v.logo).toBeTruthy()
  })
})

describe("what is refused", () => {
  it("a file that only pretends to be a picture", async () => {
    as(f.charis.id)
    const fake = asFile(Buffer.from("<script>alert(1)</script>"), "logo.jpg", "image/jpeg")
    const r = await actions.setVentureLogo(form({ venture_id: await kilimaVenture(), logo: fake }))
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/JPG, PNG or WebP/)
  })

  it("a picture over 2 MB", async () => {
    as(f.charis.id)
    const big = asFile(Buffer.concat([await picture("png"), Buffer.alloc(2 * 1024 * 1024)]), "big.png", "image/png")
    expect((await actions.setVentureLogo(form({ venture_id: await kilimaVenture(), logo: big }))).ok).toBe(false)
  })

  it("anyone but the venture's founders, admins included", async () => {
    const png = asFile(await picture("png"), "a.png", "image/png")
    as(f.wanjiru.id) // admin in Kilima Labs, not a founder
    expect((await actions.setVentureLogo(form({ venture_id: await kilimaVenture(), logo: png }))).ok).toBe(false)
    expect((await actions.removeVentureLogo(await kilimaVenture())).ok).toBe(false)
    as(f.charis.id) // founder, but not of Elsewhere
    expect((await actions.setVentureLogo(form({ venture_id: f.elsewhereVenture.id, logo: png }))).ok).toBe(false)
  })

  it("a starting venture whose logo is not a picture, without creating anything", async () => {
    as(f.charis.id)
    const r = await actions.createVenture(form({ name: "Broken", logo: asFile(Buffer.from("nope"), "x.png", "image/png") }))
    expect(r).toMatchObject({ ok: false })
    expect((await readDb()).ventures.some((v) => v.name === "Broken")).toBe(false)
  })

  it("serving anything that is not a stored logo name", async () => {
    for (const file of ["../agency.json", "..%2Fagency.json", "x.webp", "chat.key"]) {
      const res = await serveLogo(new Request("http://x"), { params: Promise.resolve({ file }) })
      expect(res.status, file).toBe(404)
    }
  })
})
