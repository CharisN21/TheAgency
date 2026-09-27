import { BellPopover } from "@/components/app/notifications"
import { refreshDailyReminders } from "@/lib/data/actions"
import { listNotifications, unreadNotificationCount } from "@/lib/data/queries"
import { requireContext } from "@/lib/data/session"

/** Fetches your unread count and latest notifications for the bell in the top bar. */
export async function NotificationBell() {
  const { user, workspace } = await requireContext()
  // Date-based reminders are made once a day, before anything is counted.
  await refreshDailyReminders()
  const [unread, recent] = await Promise.all([
    unreadNotificationCount(workspace.id, user.id),
    listNotifications(workspace.id, user.id, { limit: 20 }),
  ])
  return <BellPopover unread={unread} recent={recent} />
}
