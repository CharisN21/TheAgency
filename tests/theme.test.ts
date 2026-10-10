/**
 * Workspace colours from the venture's logo: the right colours are picked, every
 * text-on-colour pair is readable, nothing but colours reaches the page, and a
 * venture without a logo keeps The Agency's maroon.
 */
import sharp from "sharp"
import { beforeEach, describe, expect, it } from "vitest"

import * as actions from "@/lib/data/actions"
import { readDb } from "@/lib/data/store"
import { buildTheme, contrast, pickColours, themeCss } from "@/lib/ventures/palette"
import { loadFixture } from "./fixture"
import { signedIn } from "./setup"

/** A picture of coloured blocks: [r, g, b, share of the picture]. */
async function blocks(colours: [number, number, number, number][], background = { r: 255, g: 255, b: 255, alpha: 1 }) {
  const width = 100
  const height = 100
  const composites = []
  let x = 0
  for (const [r, g, b, share] of colours) {
    const w = Math.max(1, Math.round(width * share))
    composites.push({
      input: await sharp({ create: { width: w, height, channels: 4, background: { r, g, b, alpha: 1 } } }).png().toBuffer(),
      left: x,
      top: 0,
    })
    x += w
  }
  const png = await sharp({ create: { width, height, channels: 4, background } }).composite(composites).png().toBuffer()
  const { data } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return data
}

const hueOf = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === min) return 0
  const d = max - min
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return h * 60
}
const near = (a: number, b: number, tolerance = 15) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b)) <= tolerance

describe("picking colours from a logo", () => {
  it("finds a red logo's red, ignoring the white background", async () => {
    const c = pickColours(await blocks([[200, 20, 30, 0.4]]))!
    expect(near(hueOf(c.primary), 356)).toBe(true)
    expect(c.secondary).toBe(c.primary) // one colour only
  })

  it("finds the main colour and a second, distinct one", async () => {
    const c = pickColours(await blocks([[20, 70, 200, 0.5], [240, 140, 20, 0.2]]))!
    expect(near(hueOf(c.primary), 224)).toBe(true)
    expect(near(hueOf(c.secondary), 33)).toBe(true)
  })

  it("uses the dark ink of a black-and-white logo", async () => {
    const c = pickColours(await blocks([[30, 30, 30, 0.3]]))!
    expect(c.primary).toMatch(/^#1[0-9a-f]1[0-9a-f]1[0-9a-f]$/)
  })

  it("finds nothing in a picture that is all background", async () => {
    expect(pickColours(await blocks([], { r: 255, g: 255, b: 255, alpha: 1 }))).toBeNull()
    expect(pickColours(await blocks([], { r: 0, g: 0, b: 0, alpha: 0 }))).toBeNull()
  })
})

describe("every colour pair is readable", () => {
  // Every 15 degrees round the wheel, light and dark brand colours, vivid and dull.
  const samples: string[] = []
  for (let h = 0; h < 360; h += 15) {
    for (const [s, l] of [
      [0.9, 0.5],
      [0.6, 0.25],
      [0.8, 0.8],
      [0.3, 0.6],
    ]) {
      const c = (1 - Math.abs(2 * l - 1)) * s
      const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
      const m = l - c / 2
      const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
      samples.push(`#${[r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("")}`)
    }
  }
  samples.push("#ffff00", "#00ff00", "#000000", "#1b1719", "#fafafa")

  it.each(samples)("brand colour %s", (hex) => {
    const { light, dark } = buildTheme({ primary: hex, secondary: samples[(samples.indexOf(hex) * 7) % samples.length] })
    for (const t of [light, dark]) {
      expect(contrast(t["--primary"], t["--primary-foreground"])).toBeGreaterThanOrEqual(4.5)
      expect(contrast(t["--accent"], t["--accent-foreground"])).toBeGreaterThanOrEqual(4.5)
      expect(contrast(t["--secondary"], t["--secondary-foreground"])).toBeGreaterThanOrEqual(4.5)
      expect(contrast(t["--sidebar-accent"], t["--sidebar-accent-foreground"])).toBeGreaterThanOrEqual(4.5)
    }
  })

  it("covers the primary, secondary, accent, ring, sidebar, charts and bands", () => {
    const { light, dark } = buildTheme({ primary: "#c8102e", secondary: "#1d4ed8" })
    for (const t of [light, dark]) {
      for (const key of [
        "--primary",
        "--primary-foreground",
        "--primary-hover",
        "--secondary",
        "--secondary-foreground",
        "--accent",
        "--accent-foreground",
        "--ring",
        "--sidebar-primary",
        "--sidebar-accent",
        "--chart-1",
        "--chart-2",
        "--band-glow",
      ]) {
        expect(t[key], key).toBeTruthy()
      }
      // Status colours are never themed.
      for (const key of ["--ok", "--warn", "--destructive", "--info"]) expect(t[key]).toBeUndefined()
    }
  })
})

describe("what reaches the page", () => {
  it("is only colours, and nothing at all for a venture without a logo", () => {
    expect(themeCss(undefined)).toBeNull()
    expect(themeCss({ primary: "red;}body{display:none", secondary: "#000000" })).toBeNull()
    const css = themeCss({ primary: "#c8102e", secondary: "#1d4ed8" })!
    expect(css.startsWith("html:root{--primary:#")).toBe(true)
    expect(css).toContain("html.dark{")
    expect(css).not.toMatch(/[<>"'`]|url\(|expression|@import/i)
  })
})

describe("uploading and removing a logo", () => {
  let f: Awaited<ReturnType<typeof loadFixture>>
  beforeEach(async () => {
    f = await loadFixture()
    signedIn.workspaceId = undefined
    signedIn.userId = f.charis.id
  })

  it("sets the venture's colours from the logo, and removing it brings back maroon", async () => {
    const id = (await readDb()).workspaces.find((w) => w.id === f.kilima.id)!.venture_id
    const png = await sharp({ create: { width: 300, height: 300, channels: 3, background: { r: 0, g: 120, b: 60 } } }).png().toBuffer()
    const fd = new FormData()
    fd.set("venture_id", id)
    fd.set("logo", new File([new Uint8Array(png)], "green.png", { type: "image/png" }))
    expect((await actions.setVentureLogo(fd)).ok).toBe(true)
    const theme = (await readDb()).ventures.find((v) => v.id === id)!.theme!
    expect(near(hueOf(theme.primary), 150)).toBe(true)

    await actions.removeVentureLogo(id)
    expect((await readDb()).ventures.find((v) => v.id === id)!.theme).toBeUndefined()
  })
})
