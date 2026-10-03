import { ChevronDown } from "lucide-react"

import { cn } from "cn"

/**
 * A full-width section of a page. Neighbouring bands take different tones so
 * the eye can tell where one part ends and the next begins:
 *
 * - `plain`  — the page itself
 * - `soft`   — greige, with a hairline above and below
 * - `accent` — the soft maroon tint, leading the Workspace pages
 * - `maroon` — deep maroon, leading the Relationships pages
 * - `ink`    — near-black with a maroon glow, leading the Work pages
 *
 * `index` staggers the arrival: 0 first, then 60ms apart.
 */
export function Band({
  tone = "plain",
  index = 0,
  label,
  narrow = false,
  wide = false,
  className,
  fold,
  children,
}: {
  /**
   * Progressive disclosure: the band shows only its title and a one-line
   * summary until opened. Uses the browser's own details element, so it works
   * before any script loads and is announced as expandable.
   */
  fold?: { title: string; summary?: string; open?: boolean }
  tone?: "plain" | "soft" | "accent" | "maroon" | "ink"
  index?: number
  /** A reading-width column, for pages like Today. */
  narrow?: boolean
  /** The whole width, for boards and tables. */
  wide?: boolean
  /** Read out by screen readers as the name of the section. */
  label?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      aria-label={label}
      style={{ "--i": index } as React.CSSProperties}
      className={cn(
        "band-in px-4 py-6 md:px-8 md:py-8",
        tone === "soft" && "bg-muted/60 border-border border-y",
        tone === "accent" && "bg-accent/70 border-primary/10 border-b",
        tone === "maroon" && "band-dark band-maroon",
        tone === "ink" && "band-dark band-ink",
        className,
      )}
    >
      <div
        className={cn(
          "band-reveal mx-auto w-full",
          narrow ? "max-w-4xl" : wide ? "max-w-none" : "max-w-5xl",
        )}
      >
        {fold ? (
          <details open={fold.open} className="group">
            <summary className="focus-visible:ring-ring flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md focus-visible:ring-2 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
              <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                {fold.title}
              </span>
              {fold.summary && (
                <span className="text-muted-foreground text-xs group-open:hidden">
                  · {fold.summary}
                </span>
              )}
              <span className="text-muted-foreground ml-auto flex items-center gap-1 text-xs">
                <span className="group-open:hidden">Show</span>
                <span className="hidden group-open:inline">Hide</span>
                <ChevronDown className="size-4 transition-transform duration-200 group-open:rotate-180" />
              </span>
            </summary>
            <div className="pt-3">{children}</div>
          </details>
        ) : (
          children
        )}
      </div>
    </section>
  )
}

/** After the lead band, sections alternate plain and greige, whichever of them are shown. */
export const toneAfterLead = (position: number): "plain" | "soft" =>
  position % 2 === 0 ? "plain" : "soft"

/** A number worth leading a page with: label, figure, one line of help. */
export function BandStat({
  label,
  value,
  help,
  tone,
}: {
  label: string
  value: string
  help?: string
  /** Status colour for the figure; the help line says what it means. */
  tone?: "warn"
}) {
  return (
    <div className="bg-card/70 border-primary/10 min-w-0 rounded-xl border px-3 py-2.5 sm:px-4 sm:py-3">
      <p className="text-muted-foreground text-[11px] leading-tight font-semibold tracking-wide uppercase sm:text-xs">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 truncate text-lg font-bold tabular-nums sm:text-xl",
          tone === "warn" && "text-warn",
        )}
      >
        {value}
      </p>
      {/* On a phone the figure is enough; the help line waits for a wider screen. */}
      {help && <p className="text-muted-foreground sr-only mt-0.5 text-xs sm:not-sr-only sm:block">{help}</p>}
    </div>
  )
}

/** The small uppercase heading every band opens with. */
export function BandTitle({
  children,
  action,
}: {
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="mb-3 flex min-h-8 items-center justify-between gap-2">
      <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{children}</h2>
      {action}
    </div>
  )
}
