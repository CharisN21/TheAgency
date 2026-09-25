import { cn } from "cn"

/**
 * A full-width section of a page. Neighbouring bands take different tones so
 * the eye can tell where one part ends and the next begins:
 *
 * - `plain`  — the page itself
 * - `soft`   — greige, with a hairline above and below
 * - `accent` — the soft maroon tint, for the one band that leads a page
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
  children,
}: {
  tone?: "plain" | "soft" | "accent"
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
        className,
      )}
    >
      <div
        className={cn(
          "band-reveal mx-auto w-full",
          narrow ? "max-w-4xl" : wide ? "max-w-none" : "max-w-5xl",
        )}
      >
        {children}
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
      {help && <p className="text-muted-foreground mt-0.5 hidden text-xs sm:block">{help}</p>}
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
    <h2 className="text-muted-foreground mb-3 flex min-h-8 items-center justify-between gap-2 text-xs font-semibold tracking-wide uppercase">
      {children}
      {action}
    </h2>
  )
}
