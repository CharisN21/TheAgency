import { CalendarDays, Mail, MapPin, MessageCircle, NotebookPen, Phone } from "lucide-react"

import { ACTIVITY_LABEL, type Activity, type ActivityType, type Profile } from "@/lib/data/types"

const ICON: Record<ActivityType, typeof Phone> = {
  call: Phone,
  whatsapp: MessageCircle,
  meeting: CalendarDays,
  email: Mail,
  visit: MapPin,
  note: NotebookPen,
  system: NotebookPen,
}

export const when = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5)
  if (days === 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 30) return `${days} days ago`
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

/** Every call, message and change, newest first. */
export function Timeline({
  activities,
  people,
  empty,
}: {
  activities: Activity[]
  people: Profile[]
  empty: string
}) {
  if (activities.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-10 text-center text-sm">
        {empty}
      </p>
    )
  }

  return (
    <ol className="flex flex-col gap-4">
      {activities.map((a) => {
        const Icon = ICON[a.type]
        const actor = people.find((p) => p.id === a.actor_id)
        return (
          <li key={a.id} className="flex gap-3">
            <span
              className={
                a.type === "system"
                  ? "bg-muted text-muted-foreground grid size-7 shrink-0 place-items-center rounded-full"
                  : "bg-accent text-accent-foreground grid size-7 shrink-0 place-items-center rounded-full"
              }
            >
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm leading-snug">{a.summary}</p>
              <p className="text-muted-foreground text-xs">
                {ACTIVITY_LABEL[a.type]} · {when(a.occurred_at)}
                {actor ? ` · ${actor.full_name.split(" ")[0]}` : ""}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
