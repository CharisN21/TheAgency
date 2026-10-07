/**
 * Quiet hours: a window each day when no banner is sent. The notification is
 * still made and waits in the bell, so nothing is lost, it just does not buzz.
 * Times are the person's own clock, so the zone they set it in is kept with it.
 */
export type BannerPrefs = {
  banners_off?: boolean
  /** "HH:MM", 24 hour. */
  quiet_from?: string
  quiet_to?: string
  /** An IANA zone such as "Africa/Nairobi". */
  tz?: string
}

export const isClock = (v: unknown): v is string => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v)

export function isZone(v: unknown): v is string {
  if (typeof v !== "string" || v.length === 0 || v.length > 64) return false
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: v })
    return true
  } catch {
    return false
  }
}

const minutes = (clock: string) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5))

/** The window can cross midnight (22:00 to 06:00). From equal to To means no window. */
export function inQuietHours(prefs: BannerPrefs | undefined, at: Date = new Date()): boolean {
  if (!prefs || !isClock(prefs.quiet_from) || !isClock(prefs.quiet_to)) return false
  const from = minutes(prefs.quiet_from)
  const to = minutes(prefs.quiet_to)
  if (from === to) return false

  const zone = isZone(prefs.tz) ? prefs.tz : "Africa/Nairobi"
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(at)
  const now = Number(parts.find((p) => p.type === "hour")?.value) * 60 + Number(parts.find((p) => p.type === "minute")?.value)

  return from < to ? now >= from && now < to : now >= from || now < to
}

/** Whether a banner may be sent for this person in this workspace right now. */
export const bannersAllowed = (prefs: BannerPrefs | undefined, at?: Date) =>
  !prefs?.banners_off && !inQuietHours(prefs, at)
