"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CalendarDays,
  FolderKanban,
  NotebookPen,
  Share2,
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
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { ROLE_LABEL, type Role } from "@/lib/data/types"
import { CompanySwitcher, type SwitcherCompany } from "./company-switcher"

// Order follows the build plan. `soon` modules arrive in later phases.
const WORK = [
  { href: "/today", label: "Today", icon: Sun, soon: false },
  { href: "/projects", label: "Projects", icon: FolderKanban, soon: true },
  { href: "/network", label: "Network", icon: Share2, soon: true },
  { href: "/meetings", label: "Meetings", icon: CalendarDays, soon: true },
  { href: "/notebook", label: "Notebook", icon: NotebookPen, soon: true },
]

const COMPANY = [
  { href: "/team", label: "Team", icon: Users, soon: false },
  { href: "/mentor", label: "Mentor", icon: Sparkles, soon: true },
  { href: "/settings", label: "Settings", icon: SlidersHorizontal, soon: false },
]

export function AppSidebar({
  companies,
  currentId,
  user,
  role,
}: {
  companies: SwitcherCompany[]
  currentId: string
  user: { full_name: string; email: string }
  role: Role
}) {
  const pathname = usePathname()
  const initials = user.full_name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  const item = (n: (typeof WORK)[number]) => (
    <SidebarMenuItem key={n.href}>
      <SidebarMenuButton
        asChild={!n.soon}
        isActive={pathname.startsWith(n.href)}
        disabled={n.soon}
        className={n.soon ? "text-muted-foreground cursor-default" : undefined}
        tooltip={n.soon ? `${n.label} — a later phase` : n.label}
      >
        {n.soon ? (
          <>
            <n.icon />
            <span>{n.label}</span>
            <span className="text-muted-foreground ml-auto text-xs">Soon</span>
          </>
        ) : (
          <Link href={n.href}>
            <n.icon />
            <span>{n.label}</span>
          </Link>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  )

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <CompanySwitcher companies={companies} currentId={currentId} />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Work</SidebarGroupLabel>
          <SidebarMenu>{WORK.map(item)}</SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Company</SidebarGroupLabel>
          <SidebarMenu>{COMPANY.map(item)}</SidebarMenu>
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
