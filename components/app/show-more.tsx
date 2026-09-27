"use client"

import { Children, useState } from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "cn"
import { Button } from "@/components/ui/button"

/**
 * Progressive disclosure for lists: the first few items, then "Show all 23
 * entries". The rest are already on the page, so opening is instant.
 */
export function ShowMore({
  initial,
  noun,
  className,
  as: List = "ol",
  children,
}: {
  /** How many to show before the button. */
  initial: number
  /** Plural word for the button, e.g. "entries", "older check-ins". */
  noun: string
  className?: string
  as?: "ol" | "ul" | "div"
  children: React.ReactNode
}) {
  const items = Children.toArray(children)
  const [open, setOpen] = useState(false)
  const hidden = items.length - initial

  return (
    <>
      <List className={className}>{open || hidden <= 0 ? items : items.slice(0, initial)}</List>
      {hidden > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground mt-2"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <ChevronDown className={cn("transition-transform duration-200", open && "rotate-180")} />
          {open ? "Show fewer" : hidden === 1 ? "Show 1 more" : `Show all ${items.length} ${noun}`}
        </Button>
      )}
    </>
  )
}
