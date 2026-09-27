import "server-only"

import { newId } from "./store"
import type { Database, NotificationType } from "./types"

/**
 * Writes a notification in the same change as the thing it is about. Called
 * from inside `mutate`, so both land together or neither does.
 *
 * Nobody is notified about their own actions, only people in the workspace
 * are notified, and a kind the person switched off is skipped.
 */
export function notify(
  db: Database,
  n: {
    workspace_id: string
    user_id: string | undefined
    actor_id: string
    type: NotificationType
    title: string
    href?: string
    dedupe_key?: string
  },
) {
  if (!n.user_id || n.user_id === n.actor_id) return
  const member = db.memberships.some(
    (m) => m.workspace_id === n.workspace_id && m.user_id === n.user_id,
  )
  if (!member) return
  const prefs = db.notification_prefs.find(
    (p) => p.workspace_id === n.workspace_id && p.user_id === n.user_id,
  )
  if (prefs?.muted.includes(n.type)) return
  if (
    n.dedupe_key &&
    db.notifications.some((x) => x.user_id === n.user_id && x.dedupe_key === n.dedupe_key)
  )
    return

  db.notifications.unshift({
    id: newId(),
    workspace_id: n.workspace_id,
    user_id: n.user_id,
    type: n.type,
    title: n.title,
    href: n.href,
    actor_id: n.actor_id,
    dedupe_key: n.dedupe_key,
    created_at: new Date().toISOString(),
  })
  // Keep the newest 200 per person; older ones have done their job.
  const mine = db.notifications.filter((x) => x.user_id === n.user_id)
  if (mine.length > 200) {
    const drop = new Set(mine.slice(200).map((x) => x.id))
    db.notifications = db.notifications.filter((x) => !drop.has(x.id))
  }
}

/** First name, for titles like "Wanjiru moved PPE batch 2 to Negotiating". */
export function actorName(db: Database, userId: string) {
  return db.profiles.find((p) => p.id === userId)?.full_name.split(" ")[0] ?? "Someone"
}
