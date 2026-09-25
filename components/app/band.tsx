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
  className,
  children,
}: {
  tone?: "plain" | "soft" | "accent"
  index?: number
  /** A reading-width column, for pages like Today. */
  narrow?: boolean
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
        className
      )}
    >
      <div className={cn("band-reveal mx-auto w-full", narrow ? "max-w-4xl" : "max-w-5xl")}>
        {children}
      </div>
    </section>
  )
}

/** After the lead band, sections alternate plain and greige, whichever of them are shown. */
export const toneAfterLead = (position: number): "plain" | "soft" =>
  position % 2 === 0 ? "plain" : "soft"

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
