/**
 * Tagging people in chat: "@Achieng" or, when two people share a first name,
 * "@Mercy Wambui". Pure functions, so they run the same in the browser and in
 * tests. Tags live inside the sealed message; the server never sees them.
 */

export type Person = { id: string; name: string }

const first = (name: string) => name.trim().split(/\s+/)[0] ?? ""
const norm = (s: string) => s.toLocaleLowerCase("en")

/** What to type after the @ for this person: first name, or full name if a first name is shared. */
export function handleFor(person: Person, everyone: Person[]): string {
  const f = first(person.name)
  const shared = everyone.filter((p) => norm(first(p.name)) === norm(f)).length > 1
  return shared ? person.name.trim() : f
}

/**
 * The people tagged in this text, in the order tagged, once each. A tag is "@"
 * at the start or after a space, then a name, then anything that is not a
 * letter. Full names are tried before first names, so "@Mercy Wambui" is
 * Mercy Wambui, and a first name shared by two people matches nobody.
 */
export function parseMentions(text: string, people: Person[]): string[] {
  const found: { at: number; id: string }[] = []
  for (const p of people) {
    const candidates = [p.name.trim(), first(p.name)]
      .filter((c, i, all) => c && all.indexOf(c) === i)
      // A first name only counts if nobody else shares it.
      .filter((c) => c.includes(" ") || people.filter((o) => norm(first(o.name)) === norm(c)).length === 1)
    for (const c of candidates) {
      const re = new RegExp(`(^|[\\s(["'])@${c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "giu")
      const m = re.exec(text)
      if (m) {
        found.push({ at: m.index + m[1].length, id: p.id })
        break
      }
    }
  }
  return found.sort((a, b) => a.at - b.at).map((f) => f.id)
}

/**
 * While typing: the "@something" at the very end of the draft, if there is
 * one, so a list of matching people can be offered.
 */
export function openTag(draft: string): { query: string; start: number } | null {
  const m = /(^|[\s(["'])@([\p{L}]*)$/u.exec(draft)
  return m ? { query: m[2], start: m.index + m[1].length } : null
}

/** People whose name starts with what has been typed after the @. */
export function matchTag(query: string, people: Person[]): Person[] {
  const q = norm(query)
  return people
    .filter((p) => norm(p.name).startsWith(q) || norm(first(p.name)).startsWith(q))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 5)
}
