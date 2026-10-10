/**
 * A whiteboard drawing: a list of strokes. Each point is stored as a fraction of
 * the board's width and height (0 to 1), so a board looks the same on a phone
 * and a big screen. Colours are theme names, never hex, so dark mode follows.
 */
export type Ink = "ink" | "primary" | "erase"
export type Stroke = {
  /** Theme colour: ink (the text colour), primary (maroon), or erase (the board's own background). */
  c: Ink
  /** Thickness: 1 thin, 2 thick, 3 eraser. */
  w: 1 | 2 | 3
  /** Points as x, y, x, y… each between 0 and 1. */
  p: number[]
}

export const BOARD_W = 1000
export const BOARD_H = 750
export const STROKE_WIDTH: Record<Stroke["w"], number> = { 1: 3, 2: 8, 3: 28 }
export const INK_COLOUR: Record<Ink, string> = {
  ink: "var(--foreground)",
  primary: "var(--primary)",
  erase: "var(--card)",
}

const MAX_STROKES = 1500
const MAX_POINTS_EACH = 4000
const MAX_POINTS = 60000

/**
 * Checks a drawing sent by the browser and returns a clean copy, or null if it
 * is not a drawing. Rounds points to three places to keep boards small.
 */
export function cleanDrawing(input: unknown): Stroke[] | null {
  if (!Array.isArray(input) || input.length > MAX_STROKES) return null
  let total = 0
  const out: Stroke[] = []
  for (const s of input) {
    if (!s || typeof s !== "object") return null
    const { c, w, p } = s as Record<string, unknown>
    if (c !== "ink" && c !== "primary" && c !== "erase") return null
    if (w !== 1 && w !== 2 && w !== 3) return null
    if (!Array.isArray(p) || p.length < 2 || p.length % 2 !== 0 || p.length > MAX_POINTS_EACH * 2) return null
    total += p.length / 2
    if (total > MAX_POINTS) return null
    const points: number[] = []
    for (const v of p) {
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1) return null
      points.push(Math.round(v * 1000) / 1000)
    }
    out.push({ c, w, p: points })
  }
  return out
}

/** One stroke as an SVG path in the board's own units. */
export function strokePath(p: number[]) {
  if (p.length < 2) return ""
  let d = `M${(p[0] * BOARD_W).toFixed(1)} ${(p[1] * BOARD_H).toFixed(1)}`
  // A single tap still shows as a dot.
  if (p.length === 2) d += ` L${(p[0] * BOARD_W + 0.1).toFixed(1)} ${(p[1] * BOARD_H).toFixed(1)}`
  for (let i = 2; i < p.length; i += 2) d += ` L${(p[i] * BOARD_W).toFixed(1)} ${(p[i + 1] * BOARD_H).toFixed(1)}`
  return d
}
