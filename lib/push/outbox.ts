/**
 * Pushes waiting to be sent. notify() runs inside a store change, so it only
 * queues here; the store sends them after the change is saved. Keyed by the
 * database object of that one change, so two requests never mix their queues.
 */
export type PushItem = {
  user_id: string
  /** What happened. Safe to read on a lock screen. */
  title: string
  /** The workspace it is about: its name heads the banner and its mark is the icon. */
  workspace: { id: string; name: string; color: string; logo?: string }
  /** The page inside the app it opens. */
  href?: string
  /** Same tag replaces an earlier banner instead of stacking. */
  tag?: string
}

const waiting = new WeakMap<object, PushItem[]>()

export function queuePush(db: object, item: PushItem) {
  const list = waiting.get(db)
  if (list) list.push(item)
  else waiting.set(db, [item])
}

export function takePushes(db: object): PushItem[] {
  const list = waiting.get(db) ?? []
  waiting.delete(db)
  return list
}
