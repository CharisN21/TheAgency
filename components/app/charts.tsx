"use client"

import { useState } from "react"
import { Table2 } from "lucide-react"

import { cn } from "cn"
import { Button } from "@/components/ui/button"

/**
 * Tasks finished per week: one series in the primary colour, so no legend.
 * Bars are thin, rounded only where the data ends, 2px apart, anchored to the
 * baseline. Hover or focus a week for its number; the latest is labelled.
 * "Table" shows the same numbers as a table.
 */
export function WeeklyBars({
  values,
  labels,
  unit = "tasks finished",
}: {
  values: number[]
  labels: string[]
  unit?: string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const [table, setTable] = useState(false)
  const max = Math.max(1, ...values)
  const last = values.length - 1

  return (
    <figure className="flex flex-col gap-2">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={table}
          onClick={() => setTable((t) => !t)}
        >
          <Table2 /> {table ? "Chart" : "Table"}
        </Button>
      </div>

      {table ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground text-left text-xs">
              <th className="py-1 font-medium">Week</th>
              <th className="py-1 text-right font-medium">Tasks finished</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {values.map((v, i) => (
              <tr key={labels[i]}>
                <td className="py-1.5">{labels[i]}</td>
                <td className="py-1.5 text-right tabular-nums">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div role="img" aria-label={values.map((v, i) => `${labels[i]}: ${v}`).join(", ")}>
          <div className="border-border relative flex h-40 items-end gap-0.5 border-b">
            {values.map((v, i) => {
              // Tallest bar stops short of the top, so its label has room.
              const h = (v / max) * 82
              const active = hover === i
              return (
                <button
                  key={labels[i]}
                  type="button"
                  aria-label={`${labels[i]}: ${v} ${unit}`}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  className="focus-visible:ring-ring relative flex h-full flex-1 items-end justify-center rounded-sm focus-visible:ring-2 focus-visible:outline-none"
                >
                  {/* The bar itself: at most 28px wide, whatever the space. */}
                  <span
                    className={cn(
                      "bg-primary block w-full max-w-7 rounded-t-[4px] transition-opacity duration-150",
                      hover !== null && !active && "opacity-50",
                    )}
                    style={{ height: v === 0 ? 0 : `max(${h}%, 3px)` }}
                  />
                  {(active || (hover === null && i === last)) && (
                    <span
                      className="text-foreground absolute text-xs font-semibold tabular-nums"
                      style={{ bottom: `calc(${h}% + 4px)` }}
                    >
                      {v}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <div className="text-muted-foreground mt-1.5 flex gap-0.5 text-[11px]">
            {labels.map((l) => (
              <span key={l} className="flex-1 truncate text-center">
                {l}
              </span>
            ))}
          </div>
        </div>
      )}
      <figcaption className="sr-only">Tasks finished each week, last six weeks</figcaption>
    </figure>
  )
}

/** A tiny week-by-week trend for a table row. Values are in its label. */
export function Spark({ values }: { values: number[] }) {
  const max = Math.max(1, ...values)
  return (
    <span
      role="img"
      aria-label={`Finished per week, oldest first: ${values.join(", ")}`}
      className="flex h-6 w-16 items-end gap-0.5"
    >
      {values.map((v, i) => (
        <span
          key={i}
          className={cn(
            "flex-1 rounded-t-[2px]",
            i === values.length - 1 ? "bg-primary" : "bg-primary/40",
          )}
          style={{ height: v === 0 ? 1 : `${(v / max) * 100}%` }}
        />
      ))}
    </span>
  )
}
