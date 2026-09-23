"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Ellipsis, FolderKanban, Plus, Share2, Sun } from "lucide-react"

import { cn } from "@/lib/utils"

const TABS = [
  { href: "/today", label: "Today", icon: Sun, center: false },
  { href: "/projects", label: "Projects", icon: FolderKanban, center: false },
  { href: "/capture", label: "Capture", icon: Plus, center: true },
  { href: "/network", label: "Network", icon: Share2, center: false },
  { href: "/more", label: "More", icon: Ellipsis, center: false },
]

/** iPhone bottom tab bar: five tabs, 44px targets, translucent over the content. */
export function MobileTabBar() {
  const pathname = usePathname()

  return (
    <nav className="bg-bar border-border fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t pt-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      {TABS.map((t) =>
        t.center ? (
          <span key={t.href} className="flex min-h-11 items-center justify-center">
            <span className="bg-primary text-primary-foreground flex h-9 w-12 items-center justify-center rounded-xl">
              <t.icon className="size-5" />
            </span>
          </span>
        ) : (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "flex min-h-11 flex-col items-center gap-1 text-[10px] font-medium",
              pathname.startsWith(t.href) ? "text-primary" : "text-muted-foreground"
            )}
          >
            <t.icon className="size-6" />
            {t.label}
          </Link>
        )
      )}
    </nav>
  )
}
