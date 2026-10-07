/**
 * Where a banner takes you. A banner can be from a workspace other than the one
 * you have open, so its link goes through /open, which switches to that
 * workspace (only if you belong to it) and then lands on the page.
 */

/** A path inside the app, or null. Never another site, never "//host" or "/\host". */
export function safeTarget(to: unknown): string | null {
  if (typeof to !== "string" || to.length === 0 || to.length > 500) return null
  if (!to.startsWith("/") || to.startsWith("//") || to.startsWith("/\\")) return null
  if (/[\u0000-\u001f]/.test(to)) return null
  try {
    const u = new URL(to, "https://app.invalid")
    return u.origin === "https://app.invalid" ? `${u.pathname}${u.search}${u.hash}` : null
  } catch {
    return null
  }
}

/** The link a banner carries. */
export const openLink = (workspaceId: string, to: string | undefined) =>
  `/open?w=${encodeURIComponent(workspaceId)}&to=${encodeURIComponent(safeTarget(to) ?? "/today")}`

/** The small square the OS shows beside a banner: the workspace's colour and first letter. */
export function workspaceIconPath(name: string, color: string) {
  const letter = Array.from(name.trim())[0]?.toUpperCase() ?? "A"
  const hex = /^#[0-9a-fA-F]{6}$/.test(color) ? color.slice(1) : "7c1f35"
  return `/workspace-icon?l=${encodeURIComponent(letter)}&c=${hex}`
}
