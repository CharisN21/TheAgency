/**
 * A venture's colours, taken from its logo, turned into the app's colour roles
 * for light and dark mode. Every pair of text on colour is pushed until it is
 * readable (contrast of at least 4.5 to 1). Status colours (ok, warn, problem,
 * info) are never touched, so they always mean the same thing.
 *
 * Pure functions: no files, no server. lib/ventures/logo.ts reads the pixels.
 */

export type BrandColours = { primary: string; secondary: string }

type RGB = [number, number, number]
type HSL = [number, number, number] // hue 0..360, saturation 0..1, lightness 0..1

const HEX = /^#[0-9a-f]{6}$/i
export const isHex = (v: unknown): v is string => typeof v === "string" && HEX.test(v)

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export const rgbToHex = ([r, g, b]: RGB) =>
  `#${[r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("")}`

function rgbToHsl([r, g, b]: RGB): HSL {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}

function hslToRgb([h, s, l]: HSL): RGB {
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0) * 255, f(8) * 255, f(4) * 255]
}

const hsl = (h: number, s: number, l: number) => rgbToHex(hslToRgb([((h % 360) + 360) % 360, clamp(s), clamp(l)]))

/** WCAG relative luminance and contrast ratio. */
function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

/** Moves a colour's lightness, a step at a time, until it reads against `against` (or gives up at the end). */
function readable(h: number, s: number, l: number, against: string, darker: boolean, min = 4.5) {
  let light = l
  for (let i = 0; i < 100; i++) {
    const c = hsl(h, s, light)
    if (contrast(c, against) >= min) return c
    light = clamp(light + (darker ? -0.01 : 0.01))
  }
  return hsl(h, s, light)
}

/**
 * Picks a logo's two main colours from its pixels (RGBA). Near-white, near-black
 * and see-through pixels are the background, not the brand, so they are left out
 * unless the logo is only black and white. The secondary is the next colour at
 * least 40 degrees round the colour wheel; if there is none, a related shade.
 */
export function pickColours(pixels: Uint8Array | Buffer, channels = 4): BrandColours | null {
  const bins = new Map<number, { w: number; r: number; g: number; b: number }>()
  let greyW = 0
  let grey = [0, 0, 0]
  for (let i = 0; i + channels - 1 < pixels.length; i += channels) {
    const a = channels === 4 ? pixels[i + 3] : 255
    if (a < 128) continue
    const rgb: RGB = [pixels[i], pixels[i + 1], pixels[i + 2]]
    const [h, s, l] = rgbToHsl(rgb)
    if (l > 0.93) continue
    if (s < 0.18 || l < 0.08) {
      if (l < 0.85) {
        greyW++
        grey = [grey[0] + rgb[0], grey[1] + rgb[1], grey[2] + rgb[2]]
      }
      continue
    }
    const key = Math.floor(h / 15)
    const w = s * (1 - Math.abs(l - 0.5))
    const bin = bins.get(key) ?? { w: 0, r: 0, g: 0, b: 0 }
    bin.w += w
    bin.r += rgb[0] * w
    bin.g += rgb[1] * w
    bin.b += rgb[2] * w
    bins.set(key, bin)
  }

  const ranked = [...bins.entries()].sort((a, b) => b[1].w - a[1].w)
  if (ranked.length === 0) {
    if (greyW === 0) return null
    const primary = rgbToHex([grey[0] / greyW, grey[1] / greyW, grey[2] / greyW] as RGB)
    return { primary, secondary: primary }
  }
  const colourOf = (b: { w: number; r: number; g: number; b: number }) => rgbToHex([b.r / b.w, b.g / b.w, b.b / b.w])
  const [topKey, top] = ranked[0]
  const primary = colourOf(top)
  const other = ranked.find(([k, b]) => {
    const apart = Math.min(Math.abs(k - topKey), 24 - Math.abs(k - topKey)) * 15
    return apart >= 40 && b.w >= top.w * 0.08
  })
  return { primary, secondary: other ? colourOf(other[1]) : primary }
}

export type Theme = { light: Record<string, string>; dark: Record<string, string> }

/** The app's colour roles, built from a venture's two colours. */
export function buildTheme(brand: BrandColours): Theme {
  const [h, s0] = rgbToHsl(hexToRgb(brand.primary))
  const [h2raw, s2raw] = rgbToHsl(hexToRgb(brand.secondary))
  const s = Math.max(s0, 0.08)
  // A one-colour logo gets a secondary close to its primary, a little round the wheel.
  const sameHue = brand.secondary.toLowerCase() === brand.primary.toLowerCase()
  const h2 = sameHue ? h + 28 : h2raw
  const s2 = sameHue ? s * 0.7 : Math.max(s2raw, 0.08)
  const white = "#ffffff"
  const [, , l0] = rgbToHsl(hexToRgb(brand.primary))

  // Light mode: buttons in the brand colour with white text; soft tints for selection.
  const primary = readable(h, s, Math.min(l0, 0.45), white, true)
  const [, , lp] = rgbToHsl(hexToRgb(primary))
  const accent = hsl(h, Math.min(s, 0.6), 0.95)
  const accentFg = readable(h, s, 0.32, accent, true)
  const secondary = hsl(h2, Math.min(s2, 0.35), 0.93)
  const secondaryFg = readable(h2, s2, 0.22, secondary, true)
  const glow = hexToRgb(primary)

  const light = {
    "--primary": primary,
    "--primary-foreground": white,
    "--primary-hover": hsl(h, s, lp - 0.05),
    "--ring": primary,
    "--accent": accent,
    "--accent-foreground": accentFg,
    "--secondary": secondary,
    "--secondary-foreground": secondaryFg,
    "--sidebar-primary": primary,
    "--sidebar-primary-foreground": white,
    "--sidebar-accent": accent,
    "--sidebar-accent-foreground": accentFg,
    "--sidebar-ring": primary,
    "--chart-1": primary,
    "--chart-2": readable(h2, s2, 0.45, white, true, 3),
    "--chart-3": hsl(h, s, Math.min(lp + 0.2, 0.7)),
    "--band-glow": `rgb(${glow[0]} ${glow[1]} ${glow[2]} / 0.35)`,
  }

  // Dark mode: a brighter brand fill that still carries white text, and light text tints.
  const darkPrimary = readable(h, s, Math.max(Math.min(l0, 0.5), 0.36), white, true)
  const [, , ldp] = rgbToHsl(hexToRgb(darkPrimary))
  const darkAccent = hsl(h, Math.min(s, 0.35), 0.17)
  const darkAccentFg = readable(h, Math.min(s, 0.75), 0.8, darkAccent, false)
  const darkSecondary = hsl(h2, Math.min(s2, 0.2), 0.17)
  const darkSecondaryFg = readable(h2, Math.min(s2, 0.3), 0.9, darkSecondary, false)
  const dark = {
    "--primary": darkPrimary,
    "--primary-foreground": white,
    "--primary-hover": hsl(h, s, ldp + 0.06),
    "--ring": darkAccentFg,
    "--accent": darkAccent,
    "--accent-foreground": darkAccentFg,
    "--secondary": darkSecondary,
    "--secondary-foreground": darkSecondaryFg,
    "--sidebar-primary": darkPrimary,
    "--sidebar-primary-foreground": white,
    "--sidebar-accent": darkAccent,
    "--sidebar-accent-foreground": darkAccentFg,
    "--sidebar-ring": darkAccentFg,
    "--chart-1": readable(h, s, 0.6, "#121011", false, 3),
    "--chart-2": readable(h2, s2, 0.55, "#121011", false, 3),
    "--chart-3": hsl(h, s * 0.6, 0.45),
    "--band-glow": `rgb(${glow[0]} ${glow[1]} ${glow[2]} / 0.35)`,
  }
  return { light, dark }
}

/** The theme as CSS for the workspace screens. Only colours this file made go in. */
export function themeCss(brand: BrandColours | undefined): string | null {
  if (!brand || !isHex(brand.primary) || !isHex(brand.secondary)) return null
  const { light, dark } = buildTheme(brand)
  const block = (vars: Record<string, string>) =>
    Object.entries(vars)
      .filter(([k, v]) => /^--[a-z0-9-]+$/.test(k) && /^(#[0-9a-f]{6}|rgb\(\d{1,3} \d{1,3} \d{1,3} \/ 0\.\d+\))$/i.test(v))
      .map(([k, v]) => `${k}:${v}`)
      .join(";")
  return `html:root{${block(light)}}html.dark{${block(dark)}}`
}
