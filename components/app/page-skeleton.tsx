import { cn } from "cn"
import { Skeleton } from "@/components/ui/skeleton"

type Body = "table" | "board" | "cards" | "list" | "detail" | "form"

/**
 * What a page looks like while it loads: the header, the lead band in the
 * page's own tone with its number boxes, and the shape of what comes below.
 * Shaped like the real page, so nothing jumps when the data arrives.
 */
export function PageSkeleton({
  tone,
  stats = 4,
  body,
  narrow = false,
  label,
}: {
  /** The page's lead tone: maroon for Relationships, ink for Work, accent for Workspace. */
  tone: "maroon" | "ink" | "accent"
  /** How many number boxes the lead band holds; 0 for a band with text only. */
  stats?: number
  body: Body
  narrow?: boolean
  /** Read out while loading, e.g. "Loading people". */
  label: string
}) {
  const width = narrow ? "max-w-4xl" : body === "board" ? "max-w-none" : "max-w-5xl"
  return (
    <div className="flex min-h-svh flex-col" aria-busy="true">
      <p role="status" className="sr-only">
        {label}
      </p>
      <header className="border-border flex h-14 items-center gap-2 border-b px-4">
        <Skeleton className="h-5 w-28" />
        <div className="flex-1" />
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="size-8 rounded-full" />
      </header>

      <div
        className={cn(
          "px-4 py-6 md:px-8 md:py-8",
          tone === "maroon" && "band-dark band-maroon",
          tone === "ink" && "band-dark band-ink",
          tone === "accent" && "bg-accent/70 border-primary/10 border-b",
        )}
      >
        <div className={cn("mx-auto w-full", width)}>
          {stats > 0 ? (
            <div className={cn("grid grid-cols-2 gap-2 sm:gap-3", stats >= 4 && "lg:grid-cols-4", stats === 3 && "sm:grid-cols-3")}>
              {Array.from({ length: stats }, (_, i) => (
                <div key={i} className="border-primary/10 bg-card/70 flex flex-col gap-2 rounded-xl border px-4 py-3">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="hidden h-3 w-28 sm:block" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-3.5 w-80 max-w-full" />
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className={cn("mx-auto w-full", width)}>
          <BodySkeleton body={body} />
        </div>
      </div>
    </div>
  )
}

function BodySkeleton({ body }: { body: Body }) {
  if (body === "board") {
    return (
      <div className="flex gap-3 overflow-hidden">
        {[3, 2, 1, 2, 1].map((cards, c) => (
          <div key={c} className="bg-muted/60 flex w-64 shrink-0 flex-col gap-2 rounded-xl p-2.5">
            <Skeleton className="h-4 w-24" />
            {Array.from({ length: cards }, (_, i) => (
              <Skeleton key={i} className="bg-card h-24 rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    )
  }
  if (body === "cards") {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    )
  }
  if (body === "form") {
    return (
      <div className="flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-card border-border flex flex-col gap-3 rounded-xl border p-5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    )
  }
  if (body === "detail") {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-3 lg:col-span-2">
          <Skeleton className="h-4 w-32" />
          {[70, 55, 62, 48].map((w, i) => (
            <div key={i} className="bg-card border-border flex items-center gap-3 rounded-xl border px-4 py-3">
              <Skeleton className="size-6 rounded-full" />
              <Skeleton className="h-3.5" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
        <Skeleton className="h-56 rounded-xl" />
      </div>
    )
  }
  // table and list
  return (
    <div className="bg-card border-border overflow-hidden rounded-xl border">
      {body === "table" && (
        <div className="border-border flex items-center gap-3 border-b px-4 py-3">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <div className="flex-1" />
          <Skeleton className="h-8 w-48 rounded-lg" />
        </div>
      )}
      <ul className="divide-border divide-y">
        {[62, 48, 55, 44, 58, 50].map((w, i) => (
          <li key={i} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
            <Skeleton className="size-8 rounded-full" />
            <span className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3.5" style={{ width: `${w}%` }} />
              <Skeleton className="h-3 w-2/5" />
            </span>
            <Skeleton className="hidden h-5 w-20 rounded-full sm:block" />
          </li>
        ))}
      </ul>
    </div>
  )
}
