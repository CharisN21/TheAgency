"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Checkbox } from "@/components/ui/checkbox"
import { setObserverTabs } from "@/lib/data/actions"
import { OBSERVABLE_TABS, type ObservableTab } from "@/lib/data/types"

/** Settings, for owners and admins: tick the tabs Observers in this workspace may open. */
export function ObserverTabs({ initial }: { initial: ObservableTab[] }) {
  const [tabs, setTabs] = useState(initial)
  const [pending, start] = useTransition()

  const toggle = (key: ObservableTab, on: boolean) => {
    const before = tabs
    const next = on ? [...tabs, key] : tabs.filter((t) => t !== key)
    setTabs(next)
    start(async () => {
      const r = await setObserverTabs(next)
      if (!r.ok) {
        setTabs(before)
        toast.error(r.message)
      }
    })
  }

  return (
    <fieldset className="grid gap-1 sm:grid-cols-2" disabled={pending}>
      <legend className="sr-only">Tabs Observers can open</legend>
      {OBSERVABLE_TABS.map((t) => (
        <label key={t.key} htmlFor={`obs-${t.key}`} className="hover:bg-muted/50 flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2">
          <Checkbox id={`obs-${t.key}`} checked={tabs.includes(t.key)} onCheckedChange={(v) => toggle(t.key, v === true)} />
          <span className="text-sm">{t.label}</span>
        </label>
      ))}
    </fieldset>
  )
}
