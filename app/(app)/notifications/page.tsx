import Link from "next/link"
import { Bell } from "lucide-react"

import { Band, BandStat } from "@/components/app/band"
import { MarkAllRead, NotificationItem } from "@/components/app/notifications"
import { PageHeader } from "@/components/app/page-header"
import { Card } from "@/components/ui/card"
import { cn } from "cn"
import { refreshDailyReminders } from "@/lib/data/actions"
import { listNotifications } from "@/lib/data/queries"
import { requireContext } from "@/lib/data/session"
import { NOTIFICATION_LABEL, type NotificationType } from "@/lib/data/types"

/** Short names for the filter chips. */
const CHIP: Partial<Record<NotificationType, string>> = {
  deal_moved: "Deals moved",
  deal_assigned: "Deals handed to you",
  task_assigned: "Tasks for you",
  task_done: "Tasks finished",
  check_in_posted: "Check-ins",
  check_in_due: "Check-ins due",
  people_overdue: "People overdue",
  records_assigned: "Handed to you",
  invite_accepted: "Invites",
  chat_message: "Chat",
  chat_mention: "Chat tags",
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; type?: string }>
}) {
  const { user, workspace } = await requireContext()
  const sp = await searchParams
  const unreadOnly = sp.show === "unread"
  const type = sp.type && sp.type in NOTIFICATION_LABEL ? sp.type : undefined
  await refreshDailyReminders()

  const [all, shown] = await Promise.all([
    listNotifications(workspace.id, user.id),
    listNotifications(workspace.id, user.id, { unread: unreadOnly, type }),
  ])
  const unread = all.filter((n) => !n.read_at).length
  const typesPresent = [...new Set(all.map((n) => n.type))]

  // Group by day, newest first.
  const days: { day: string; items: typeof shown }[] = []
  for (const n of shown) {
    const last = days[days.length - 1]
    if (last?.day === n.day) last.items.push(n)
    else days.push({ day: n.day, items: [n] })
  }

  const href = (next: { show?: string; type?: string }) => {
    const q = new URLSearchParams()
    const show = "show" in next ? next.show : sp.show
    const t = "type" in next ? next.type : type
    if (show) q.set("show", show)
    if (t) q.set("type", t)
    const s = q.toString()
    return s ? `/notifications?${s}` : "/notifications"
  }
  const chip = (on: boolean) =>
    cn(
      "inline-flex min-h-9 items-center rounded-full px-3 text-xs font-semibold transition-colors",
      on ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted",
    )

  return (
    <div className="flex min-h-svh flex-col">
      <PageHeader title="Notifications" meta={unread ? `${unread} unread` : "All read"}>
        <MarkAllRead disabled={unread === 0} />
      </PageHeader>

      <main className="flex-1">
        <Band tone="accent" index={0} narrow label="Your notifications">
          <p className="text-muted-foreground mb-4 text-sm">
            What happened to your work: deals you own, tasks you were given or set, check-ins on
            your projects. Only you see these. Choose which kinds you get in{" "}
            <Link href="/settings#notifications" className="text-primary hover:underline">
              Settings
            </Link>
            .
          </p>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <BandStat lead label="Unread" value={String(unread)} help="Open one to mark it read" />
            <BandStat label="Kept" value={String(all.length)} help="Your newest 200 are kept" />
          </div>
        </Band>

        <Band index={1} narrow label="All notifications" className="pb-10">
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            <Link href={href({ show: undefined })} className={chip(!unreadOnly)}>
              All
            </Link>
            <Link href={href({ show: "unread" })} className={chip(unreadOnly)}>
              Unread
            </Link>
            {typesPresent.length > 1 && <span className="bg-border mx-1 h-5 w-px" aria-hidden />}
            {typesPresent.length > 1 &&
              typesPresent.map((t) => (
                <Link
                  key={t}
                  href={href({ type: type === t ? undefined : t })}
                  className={chip(type === t)}
                >
                  {CHIP[t] ?? NOTIFICATION_LABEL[t]}
                </Link>
              ))}
          </div>

          {shown.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center">
              <Bell className="text-ink-3 size-8" />
              <h3 className="font-semibold">
                {unreadOnly || type ? "Nothing here" : "No notifications yet"}
              </h3>
              <p className="text-muted-foreground max-w-sm text-sm">
                {unreadOnly || type
                  ? "You are all caught up. Show everything to see older ones."
                  : "When someone moves your deals, gives you a task or checks in on your project, it shows here."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {days.map((g) => (
                <section key={g.day} aria-label={g.day}>
                  <h2 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                    {g.day}
                  </h2>
                  <Card className="divide-border divide-y overflow-hidden py-0">
                    {g.items.map((n) => (
                      <NotificationItem key={n.id} n={n} />
                    ))}
                  </Card>
                </section>
              ))}
            </div>
          )}
        </Band>
      </main>
    </div>
  )
}
