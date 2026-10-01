"use client"

import { useTransition } from "react"
import { Loader2, MonitorSmartphone } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { revokeDevice } from "@/lib/data/actions"

type Device = { id: string; name: string; added: string; lastSeen: string }

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })

/** The browsers and phones that can read your channels, each removable. */
export function DeviceList({ devices }: { devices: Device[] }) {
  if (devices.length === 0) {
    return (
      <p className="text-muted-foreground px-6 pb-2 text-sm">
        No devices yet. Open team chat (the speech bubble in the top bar, or Ctrl J) and this one is added.
      </p>
    )
  }
  return (
    <ul className="divide-border divide-y">
      {devices.map((d) => (
        <DeviceRow key={d.id} d={d} />
      ))}
    </ul>
  )
}

function DeviceRow({ d }: { d: Device }) {
  const [pending, start] = useTransition()
  return (
    <li className="flex min-h-14 items-center gap-3 px-6 py-2">
      <MonitorSmartphone className="text-muted-foreground size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{d.name}</span>
        <span className="text-muted-foreground block text-xs">
          Added {day(d.added)} · last used {day(d.lastSeen)}
        </span>
      </span>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />} Remove
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {d.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              It will not be able to read any new messages, and it will not add itself back: chat on that device
              will say it was removed and ask before adding it again. If this is the device you are on now and you
              add it back, older messages will not open here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                start(async () => {
                  const r = await revokeDevice(d.id)
                  if (r.ok) toast.success(r.message)
                  else toast.error(r.message)
                })
              }
            >
              Remove device
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  )
}
