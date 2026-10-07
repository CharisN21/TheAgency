/**
 * Which safety numbers you have checked, kept on this device only. The server
 * never learns who you have verified. A check holds until the number changes.
 */

const keyFor = (userId: string) => `agency-safety-checked:${userId}`

function read(userId: string): Record<string, string> {
  try {
    const v = JSON.parse(localStorage.getItem(keyFor(userId)) ?? "{}")
    return v && typeof v === "object" && !Array.isArray(v) ? v : {}
  } catch {
    return {}
  }
}

export type CheckStatus = "unchecked" | "verified" | "changed"

/** Where a number stands against what you checked before. */
export function checkStatus(me: string, other: string, number: string): CheckStatus {
  const saved = read(me)[other]
  if (!saved) return "unchecked"
  return saved === number ? "verified" : "changed"
}

/** Remember you checked this number. Returns false if the browser would not keep it. */
export function markChecked(me: string, other: string, number: string): boolean {
  try {
    localStorage.setItem(keyFor(me), JSON.stringify({ ...read(me), [other]: number }))
    return read(me)[other] === number
  } catch {
    return false
  }
}

export function clearChecked(me: string, other: string): void {
  try {
    const all = read(me)
    delete all[other]
    localStorage.setItem(keyFor(me), JSON.stringify(all))
  } catch {
    // Nothing kept, nothing to clear.
  }
}
