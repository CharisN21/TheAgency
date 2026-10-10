"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2,
  CalendarDays,
  Contact,
  Flag,
  FolderKanban,
  HandCoins,
  NotebookPen,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Users,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { ROLE_LABEL, type Role } from "@/lib/data/types"
import { LinkPending } from "./link-pending"
import { WorkspaceSwitcher, type SwitcherVenture, type SwitcherWorkspace } from "./workspace-switcher"

type Item = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  soon?: boolean
  count?: number
}

export function AppSidebar({
  workspaces,
  currentId,
  venture,
  user,
  role,
  counts,
  hidden = [],
}: {
  workspaces: SwitcherWorkspace[]
  currentId: string
  venture: SwitcherVenture
  /** Pages this person may not open (an Observer's closed tabs). */
  hidden?: string[]
  user: { full_name: string; email: string }
  role: Role
  counts: { organisations: number; people: number; openDeals: number; projects: number; flags: number }
}) {
  const pathname = usePathname()
  const initials = user.full_name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  const RELATIONSHIPS: Item[] = [
    { href: "/organisations", label: "Organisations", icon: Building2, count: counts.organisations },
    { href: "/people", label: "People", icon: Contact, count: counts.people },
    { href: "/deals", label: "Deals", icon: HandCoins, count: counts.openDeals },
  ]

  const WORK: Item[] = [
    { href: "/today", label: "Today", icon: Sun },
    { href: "/projects", label: "Projects", icon: FolderKanban, count: counts.projects },
    { href: "/meetings", label: "Meetings", icon: CalendarDays, soon: true },
    { href: "/notebook", label: "Notebook", icon: NotebookPen },
  ]

  const WORKSPACE: Item[] = [
    { href: "/team", label: "Team", icon: Users },
    { href: "/flags", label: "Flags", icon: Flag, count: counts.flags },
    { href: "/mentor", label: "Mentor", icon: Sparkles, soon: true },
    { href: "/settings", label: "Settings", icon: SlidersHorizontal },
  ]

  const isCurrent = (href: string) => pathname === href || pathname.startsWith(href + "/")

  const item = (n: Item) => (
    <SidebarMenuItem key={n.href}>
      <SidebarMenuButton
        asChild={!n.soon}
        isActive={isCurrent(n.href)}
        disabled={n.soon}
        className={n.soon ? "text-muted-foreground cursor-default" : undefined}
        tooltip={n.soon ? `${n.label} — a later phase` : n.label}
      >
        {n.soon ? (
          <>
            <n.icon />
            <span>{n.label}</span>
          </>
        ) : (
          <Link href={n.href} className="relative" aria-current={isCurrent(n.href) ? "page" : undefined}>
            <n.icon />
            <span>{n.label}</span>
            <LinkPending />
          </Link>
        )}
      </SidebarMenuButton>
      {n.soon ? (
        <SidebarMenuBadge className="text-muted-foreground">Soon</SidebarMenuBadge>
      ) : n.count ? (
        <SidebarMenuBadge>{n.count}</SidebarMenuBadge>
      ) : null}
    </SidebarMenuItem>
  )

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <WorkspaceSwitcher workspaces={workspaces} currentId={currentId} venture={venture} />
      </SidebarHeader>

      <SidebarContent>
        <nav aria-label="Main" className="contents">
        {(
          [
            ["Relationships", RELATIONSHIPS],
            ["Work", WORK],
            ["Workspace", WORKSPACE],
          ] as const
        ).map(([label, items]) => {
          const shown = items.filter((n) => !n.soon && !hidden.includes(n.href))
          return shown.length === 0 ? null : (
            <SidebarGroup key={label}>
              <SidebarGroupLabel>{label}</SidebarGroupLabel>
              <SidebarMenu>{shown.map(item)}</SidebarMenu>
            </SidebarGroup>
          )
        })}
        </nav>
      </SidebarContent>

      <SidebarFooter>
        <p className="text-muted-foreground px-2 text-xs leading-snug group-data-[collapsible=icon]:hidden">
          Coming later: {[...RELATIONSHIPS, ...WORK, ...WORKSPACE]
            .filter((n) => n.soon)
            .map((n) => n.label)
            .join(", ")}
        </p>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex h-12 w-full items-center gap-3 rounded-md p-2 text-sm group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0">
              <span className="bg-accent text-accent-foreground flex size-8 items-center justify-center rounded-full text-xs font-semibold">
                {initials}
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate font-medium">{user.full_name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {ROLE_LABEL[role]}
                </span>
              </span>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
