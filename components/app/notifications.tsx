"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Bell, CheckCheck, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import {
  markAllNotificationsRead,
  markNotificationRead,
  setNotificationMuted,
} from "@/lib/data/actions"
import type { NotificationRow } from "@/lib/data/queries"
import { NOTIFICATION_LABEL, type NotificationType } from "@/lib/data/types"

/** One notification. Opening it marks it read. */
export function NotificationItem({ n, onOpen }: { n: NotificationRow; onOpen?: () => void }) {
  const router = useRouter()
  const unread = !n.read_at
  return (
    <button
      type="button"
      onClick={() => {
        onOpen?.()
        if (unread) void markNotificationRead(n.id)
        if (n.href) router.push(n.href)
      }}
      className={cn(
        "hover:bg-muted/60 focus-visible:ring-ring flex min-h-14 w-full items-start gap-3 px-4 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
        unread && "bg-accent/40",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          unread ? "bg-primary" : "bg-transparent",
        )}
      />
      <span className="min-w-0 flex-1">
        <span className={cn("block text-sm leading-snug", unread && "font-medium")}>{n.title}</span>
        <span className="text-muted-foreground block text-xs">
          {n.ago}
          {unread && <span className="sr-only"> · unread</span>}
        </span>
      </span>
    </button>
  )
}

export function MarkAllRead({ disabled }: { disabled?: boolean }) {
  const [pending, start] = useTransition()
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={disabled || pending}
      onClick={() =>
        start(async () => {
          const result = await markAllNotificationsRead()
          toast.success(result.message)
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <CheckCheck />} Mark all read
    </Button>
  )
}

/** The bell in the top bar: unread count, and the latest few in a popover. */
export function BellPopover({ unread, recent }: { unread: number; recent: NotificationRow[] }) {
  const [open, setOpen] = useState(false)
  const label = unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} className="relative">
          <Bell />
          {unread > 0 && (
            <span className="bg-primary text-primary-foreground absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] leading-none font-semibold tabular-nums">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="border-border flex items-center justify-between border-b px-4 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          <MarkAllRead disabled={unread === 0} />
        </div>
        {recent.length === 0 ? (
          <p className="text-muted-foreground px-4 py-8 text-center text-sm">
            Nothing yet. When someone moves your deals, gives you a task or checks in on your
            project, it shows here.
          </p>
        ) : (
          <div className="divide-border max-h-96 divide-y overflow-y-auto">
            {recent.map((n) => (
              <NotificationItem key={n.id} n={n} onOpen={() => setOpen(false)} />
            ))}
          </div>
        )}
        <div className="border-border border-t p-1.5">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setOpen(false)}
          >
            <Link href="/notifications">See all</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/** Settings: which kinds of notification you get. Yours only; nobody else's change. */
export function NotificationSwitches({ muted }: { muted: NotificationType[] }) {
  const [off, setOff] = useState<NotificationType[]>(muted)
  const [pending, start] = useTransition()
  return (
    <ul className="divide-border divide-y">
      {(Object.keys(NOTIFICATION_LABEL) as NotificationType[]).map((type) => {
        const on = !off.includes(type)
        return (
          <li key={type} className="flex min-h-12 items-center justify-between gap-4 px-6 py-2">
            <label htmlFor={`n-${type}`} className="text-sm">
              {NOTIFICATION_LABEL[type]}
            </label>
            <Switch
              id={`n-${type}`}
              checked={on}
              disabled={pending}
              onCheckedChange={(checked) => {
                setOff((o) => (checked ? o.filter((t) => t !== type) : [...o, type]))
                start(async () => {
                  const result = await setNotificationMuted(type, !checked)
                  if (!result.ok) toast.error(result.message)
                })
              }}
            />
          </li>
        )
      })}
    </ul>
  )
}
