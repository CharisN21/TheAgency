/**
 * Safety numbers: a short number two people compare out loud or in person.
 * If it reads the same on both phones, nobody has slipped a key in between.
 *
 * It is worked out from every active key either person has (their devices,
 * and a recovery key if they made one), so adding a key for either of them
 * changes it. Both people get the same number, whoever works it out.
 */

type Key = { x: string; y: string }

const enc = new TextEncoder()

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("")

/** One person: their id and the sorted list of their public keys, hashed. */
async function personDigest(userId: string, keys: Key[]): Promise<string> {
  const lines = keys.map((k) => `${k.x}.${k.y}`).sort()
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(`${userId}|${lines.join("|")}`)))
}

/** Twelve groups of five digits, e.g. "04821 77315 …". */
export async function safetyNumber(
  a: { userId: string; keys: Key[] },
  b: { userId: string; keys: Key[] },
): Promise<string> {
  const digests = (await Promise.all([personDigest(a.userId, a.keys), personDigest(b.userId, b.keys)])).sort()
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-512", enc.encode(`agency-safety-number-v1|${digests.join("|")}`)))
  const groups: string[] = []
  for (let i = 0; i < 12; i++) {
    // Five bytes make one number, kept to five digits.
    let n = 0
    for (let j = 0; j < 5; j++) n = (n * 256 + bytes[i * 5 + j]) % 100000
    groups.push(String(n).padStart(5, "0"))
  }
  return groups.join(" ")
}
