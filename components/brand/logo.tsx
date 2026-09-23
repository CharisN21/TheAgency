import { cn } from "@/lib/utils"

/** The Agency mark: maroon tile, white A, open brass ring. */
export function Mark({
  size = 32,
  tile = true,
  className,
  animated = false,
}: {
  size?: number
  tile?: boolean
  className?: string
  animated?: boolean
}) {
  const stroke = tile ? "#ffffff" : "var(--foreground)"
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn("shrink-0 overflow-visible", className)}
      role="img"
      aria-label="The Agency"
    >
      {tile && (
        <rect
          id={animated ? "lgTile" : undefined}
          x="0"
          y="0"
          width="64"
          height="64"
          rx={15}
          fill="var(--primary)"
        />
      )}
      <circle
        id={animated ? "lgArc" : undefined}
        cx="32"
        cy="34"
        r="19"
        fill="none"
        stroke="var(--brass)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeDasharray="86 119.4"
        transform="rotate(128 32 34)"
      />
      <path
        id={animated ? "lgA" : undefined}
        d="M21.6 43.4 32 20.6 42.4 43.4"
        fill="none"
        stroke={stroke}
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        id={animated ? "lgBar" : undefined}
        d="M26.2 35.2h11.6"
        fill="none"
        stroke={stroke}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-semibold tracking-[0.18em]", className)}>
      THE AGENCY
    </span>
  )
}

export function Lockup({
  size = 32,
  className,
  wordClassName,
}: {
  size?: number
  className?: string
  wordClassName?: string
}) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <Mark size={size} />
      <Wordmark className={wordClassName} />
    </span>
  )
}
