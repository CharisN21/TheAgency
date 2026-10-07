/**
 * The server posts to the address a browser hands it, so only the push
 * services run by Apple, Google, Mozilla and Microsoft are accepted. Without
 * this, anyone signed in could point the server at any address they like.
 */
const SERVICES = [
  /^fcm\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^[a-z0-9-]+\.push\.services\.mozilla\.com$/,
  /^web\.push\.apple\.com$/,
  /^[a-z0-9.-]+\.push\.apple\.com$/,
  /^[a-z0-9.-]+\.notify\.windows\.com$/,
]

export function isPushEndpoint(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false
  try {
    const u = new URL(value)
    if (u.protocol !== "https:" || u.port !== "" || u.username || u.password) return false
    return SERVICES.some((re) => re.test(u.hostname))
  } catch {
    return false
  }
}

/** The two keys a browser gives with a subscription: base64url text of a sensible length. */
export const isPushKey = (v: unknown): v is string =>
  typeof v === "string" && v.length >= 8 && v.length <= 200 && /^[A-Za-z0-9_-]+={0,2}$/.test(v)
