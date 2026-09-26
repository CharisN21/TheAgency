import { cn } from "cn"

import type { ProjectHealth } from "@/lib/data/types"

const STROKE: Record<ProjectHealth, string> = {
  on_track: "stroke-primary",
  at_risk: "stroke-warn",
  blocked: "stroke-destructive",
}

/** A ring filled to `value` percent. Its colour follows the project's health, whose word sits beside it. */
export function ProgressRing({
  value,
  health = "on_track",
  size = 56,
  className,
}: {
  value: number
  health?: ProjectHealth
  size?: number
  className?: string
}) {
  const r = 26
  const c = 2 * Math.PI * r
  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${value}% done`}
    >
      <svg viewBox="0 0 64 64" className="size-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" className="stroke-fill-strong" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          className={STROKE[health]}
          strokeDasharray={`${(c * value) / 100} ${c}`}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-xs font-semibold tabular-nums">
        {value}%
      </span>
    </div>
  )
}
