"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2,
  CalendarDays,
  Contact,
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
import { WorkspaceSwitcher, type SwitcherWorkspace } from "./workspace-switcher"

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
  user,
  role,
  counts,
}: {
  workspaces: SwitcherWorkspace[]
  currentId: string
  user: { full_name: string; email: string }
  role: Role
  counts: { organisations: number; people: number; openDeals: number }
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
    { href: "/projects", label: "Projects", icon: FolderKanban, soon: true },
    { href: "/meetings", label: "Meetings", icon: CalendarDays, soon: true },
    { href: "/notebook", label: "Notebook", icon: NotebookPen, soon: true },
  ]

  const WORKSPACE: Item[] = [
    { href: "/team", label: "Team", icon: Users },
    { href: "/mentor", label: "Mentor", icon: Sparkles, soon: true },
    { href: "/settings", label: "Settings", icon: SlidersHorizontal },
  ]

  const item = (n: Item) => (
    <SidebarMenuItem key={n.href}>
      <SidebarMenuButton
        asChild={!n.soon}
        isActive={pathname === n.href || pathname.startsWith(n.href + "/")}
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
          <Link href={n.href}>
            <n.icon />
            <span>{n.label}</span>
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
        <WorkspaceSwitcher workspaces={workspaces} currentId={currentId} />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Relationships</SidebarGroupLabel>
          <SidebarMenu>{RELATIONSHIPS.map(item)}</SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Work</SidebarGroupLabel>
          <SidebarMenu>{WORK.map(item)}</SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarMenu>{WORKSPACE.map(item)}</SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="gap-3">
              <span className="bg-accent text-accent-foreground flex size-8 items-center justify-center rounded-full text-xs font-semibold">
                {initials}
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate font-medium">{user.full_name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {ROLE_LABEL[role]}
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
