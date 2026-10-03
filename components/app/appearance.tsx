"use client"

import { useSyncExternalStore } from "react"
import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { cn } from "cn"

const OPTIONS = [
  { value: "system", label: "Match this device", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const

const noop = () => () => {}

/** Light, dark, or whatever this device is set to. */
export function AppearancePicker() {
  const { theme, setTheme } = useTheme()
  // The saved choice is only known in the browser; until then show nothing as chosen.
  const ready = useSyncExternalStore(noop, () => true, () => false)
  const current = ready ? (theme ?? "system") : undefined

  return (
    <div role="radiogroup" aria-label="Appearance" className="grid gap-2 sm:grid-cols-3">
      {OPTIONS.map((o) => {
        const on = current === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setTheme(o.value)}
            className={cn(
              "focus-visible:ring-ring flex min-h-12 items-center gap-3 rounded-xl border px-4 text-left text-sm transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none",
              on ? "border-primary bg-accent text-accent-foreground font-medium" : "border-border hover:bg-muted/60",
            )}
          >
            <o.icon className="size-4 shrink-0" />
            <span className="flex-1">{o.label}</span>
            {on && <span className="sr-only">(chosen)</span>}
          </button>
        )
      })}
    </div>
  )
}
