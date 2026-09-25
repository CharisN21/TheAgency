import Link from "next/link"
import { ChevronRight, CopyCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { REASON_LABEL } from "@/lib/data/match"
import type { DuplicatePair, DuplicateSide } from "@/lib/data/queries"

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** The quiet line at the top of a list: "2 possible duplicates · Review". */
export function DuplicatesNotice({ count, href }: { count: number; href: string }) {
  if (count === 0) return null
  return (
    <Link
      href={href}
      className="bg-warn-soft hover:bg-warn-soft/80 focus-visible:ring-ring flex min-h-11 items-center gap-3 rounded-lg px-4 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <CopyCheck className="text-warn size-4 shrink-0" />
      <span className="flex-1">
        <span className="font-medium">{plural(count, "possible duplicate")}</span>
        <span className="text-muted-foreground"> · the same person or place entered twice</span>
      </span>
      <span className="text-warn flex items-center font-medium">
        Review <ChevronRight className="size-4" />
      </span>
    </Link>
  )
}

function Side({ side, label }: { side: DuplicateSide; label: string }) {
  const counts = [
    side.people !== undefined ? plural(side.people, "person", "people") : null,
    plural(side.deals, "deal"),
    plural(side.activities, "activity", "activities"),
  ].filter(Boolean)

  return (
    <div className="min-w-0">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</p>
      <p className="mt-1 truncate font-semibold">
        {side.href ? (
          <Link href={side.href} className="hover:underline">
            {side.name}
          </Link>
        ) : (
          side.name
        )}
      </p>
      <p className="text-muted-foreground truncate text-sm">{side.subtitle}</p>
      <p className="text-muted-foreground mt-1 text-xs">
        {counts.join(" · ")} · added {shortDate(side.created_at)}
      </p>
    </div>
  )
}

/** Two records side by side, with every field compared. Actions go in `children`. */
export function PairCard({ pair, children }: { pair: DuplicatePair; children?: React.ReactNode }) {
  const shown = pair.fields.filter((f) => f.a || f.b)

  return (
    <Card className="py-0">
      <CardContent className="flex flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap gap-1.5">
          {pair.reasons.map((r) => (
            <Badge key={r} variant="outline">
              {REASON_LABEL[r]}
            </Badge>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Side side={pair.a} label="First" />
          <Side side={pair.b} label="Second" />
        </div>

        <dl className="divide-border border-border divide-y rounded-lg border text-sm">
          {shown.map((f) => (
            <div
              key={f.key}
              className={`grid grid-cols-[6.5rem_1fr_1fr] gap-3 px-3 py-2 ${f.clash ? "bg-warn-soft" : ""}`}
            >
              <dt className="text-muted-foreground">
                {f.label}
                {f.clash && <span className="text-warn block text-xs font-medium">Different</span>}
              </dt>
              <dd className="break-words">{f.a || <span className="text-muted-foreground">—</span>}</dd>
              <dd className="break-words">{f.b || <span className="text-muted-foreground">—</span>}</dd>
            </div>
          ))}
          {pair.tags.length > 0 && (
            <div className="grid grid-cols-[6.5rem_1fr] gap-3 px-3 py-2">
              <dt className="text-muted-foreground">Tags</dt>
              <dd className="flex flex-wrap gap-1">
                {pair.tags.map((t) => (
                  <Badge key={t} variant="secondary">
                    {t}
                  </Badge>
                ))}
                <span className="text-muted-foreground basis-full text-xs">
                  A merge keeps all of these.
                </span>
              </dd>
            </div>
          )}
        </dl>

        {children}
      </CardContent>
    </Card>
  )
}

export function NoDuplicates({ what }: { what: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
      <CopyCheck className="text-ink-3 size-9" />
      <h3 className="font-semibold">No duplicates found</h3>
      <p className="text-muted-foreground max-w-sm text-sm">
        Nobody in {what} shares a phone number, an email or a name. This is checked again every
        time you open the list.
      </p>
    </div>
  )
}
