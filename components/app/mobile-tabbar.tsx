"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Contact, Ellipsis, FolderKanban, HandCoins, Sun } from "lucide-react"

import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/ui/sidebar"
import { LinkPending } from "./link-pending"

const TABS = [
  { href: "/today", label: "Today", icon: Sun },
  { href: "/people", label: "People", icon: Contact },
  { href: "/deals", label: "Deals", icon: HandCoins },
  { href: "/projects", label: "Projects", icon: FolderKanban },
]

const tab = "relative flex min-h-11 flex-col items-center gap-1 text-[11px] font-medium"

/**
 * iPhone bottom tab bar: the four places used most, and More for everything
 * else (it opens the full menu). 44px targets, translucent over the content.
 */
export function MobileTabBar({ hidden = [] }: { hidden?: string[] }) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()

  return (
    <nav
      aria-label="Main tabs"
      className="bg-bar border-border fixed inset-x-0 bottom-0 z-40 grid border-t pt-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      style={{ gridTemplateColumns: `repeat(${TABS.filter((t) => !hidden.includes(t.href)).length + 1}, minmax(0, 1fr))` }}
    >
      {TABS.filter((t) => !hidden.includes(t.href)).map((t) => {
        const current = pathname === t.href || pathname.startsWith(t.href + "/")
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={current ? "page" : undefined}
            className={cn(tab, current ? "text-primary" : "text-muted-foreground")}
          >
            <t.icon className="size-6" />
            <span className={cn(current && "underline decoration-2 underline-offset-4")}>{t.label}</span>
            <LinkPending />
          </Link>
        )
      })}
      <button type="button" onClick={() => setOpenMobile(true)} className={cn(tab, "text-muted-foreground")}>
        <Ellipsis className="size-6" />
        More
      </button>
    </nav>
  )
}
