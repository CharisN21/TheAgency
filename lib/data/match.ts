/**
 * How two records are recognised as the same person or the same organisation.
 *
 * Nothing here writes anything. It only ever suggests; a person decides.
 */

/** 0722 410 118, +254 722 410 118 and 254722410118 are one number. */
export function phoneKey(raw?: string): string | null {
  const digits = (raw ?? "").replace(/\D/g, "")
  if (digits.startsWith("254") && digits.length === 12) return digits.slice(3)
  if (digits.startsWith("0") && digits.length === 10) return digits.slice(1)
  // Too short to be a real number (placeholders like "+254 7•• ••• •••").
  return digits.length >= 9 ? digits.slice(-9) : null
}

export function emailKey(raw?: string): string | null {
  const e = (raw ?? "").trim().toLowerCase()
  return e.includes("@") ? e : null
}

const TITLES = new Set(["dr", "mr", "mrs", "ms", "miss", "prof", "eng", "hon"])

/** "Dr. Mercy  Wambui" and "wambui mercy" are one name. */
export function personNameKey(raw: string): string | null {
  const words = raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w && !TITLES.has(w))
  if (words.length === 0) return null
  return words.sort().join(" ")
}

const ORG_NOISE = new Set(["the", "ltd", "limited", "plc", "co", "company", "inc", "llc", "and"])

/** "Vision Safety Ltd.", "The Vision Safety" and "vision safety" are one name. */
export function orgNameKey(raw: string): string | null {
  const words = raw
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w && !ORG_NOISE.has(w))
  return words.length === 0 ? null : words.join(" ")
}

export type MatchReason = "phone" | "email" | "name"

export const REASON_LABEL: Record<MatchReason, string> = {
  phone: "Same phone number",
  email: "Same email",
  name: "Same name",
}

type Keyed = { id: string; keys: Partial<Record<MatchReason, string | null>> }

/** A pair key that does not care which way round the two ids are. */
export const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)

/**
 * Every pair that shares at least one key, with every reason they share.
 * Pairs in `ignore` (marked "not a duplicate") are left out.
 */
export function findPairs(
  items: Keyed[],
  ignore: Set<string> = new Set()
): { a: string; b: string; reasons: MatchReason[] }[] {
  const buckets = new Map<string, string[]>()
  for (const item of items) {
    for (const [reason, key] of Object.entries(item.keys)) {
      if (!key) continue
      const k = `${reason}:${key}`
      buckets.set(k, [...(buckets.get(k) ?? []), item.id])
    }
  }

  const pairs = new Map<string, { a: string; b: string; reasons: MatchReason[] }>()
  for (const [k, ids] of buckets) {
    // A number shared by many records is a switchboard, not a duplicate.
    if (ids.length < 2 || ids.length > 6) continue
    const reason = k.split(":")[0] as MatchReason
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = pairKey(ids[i], ids[j])
        if (ignore.has(key)) continue
        const pair = pairs.get(key) ?? { a: ids[i], b: ids[j], reasons: [] }
        if (!pair.reasons.includes(reason)) pair.reasons.push(reason)
        pairs.set(key, pair)
      }
    }
  }

  // Strongest first: more reasons, and a shared phone or email beats a shared name.
  const weight = (r: MatchReason[]) => r.length * 10 + (r.includes("name") ? 0 : 5)
  return [...pairs.values()].sort((x, y) => weight(y.reasons) - weight(x.reasons))
}

/** The fields a merge asks about, in the order they are shown. Tags are always combined. */
export const PERSON_FIELDS = [
  ["full_name", "Name"],
  ["organisation_id", "Organisation"],
  ["title", "Role"],
  ["phone", "Phone"],
  ["email", "Email"],
  ["owner_id", "Owner"],
  ["next_touch_at", "Speak again on"],
] as const

export const ORG_FIELDS = [
  ["name", "Name"],
  ["category", "Type"],
  ["what_they_do", "What they do"],
  ["location", "Where"],
  ["phone", "Phone"],
  ["email", "Email"],
  ["owner_id", "Owner"],
] as const

export type PersonField = (typeof PERSON_FIELDS)[number][0]
export type OrgField = (typeof ORG_FIELDS)[number][0]
