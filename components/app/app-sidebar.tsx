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
import { CompanySwitcher, type Company } from "./company-switcher"

const COMPANIES: Company[] = [
  { id: "kilima", name: "Kilima Labs", initial: "K", role: "Owner", people: 5 },
  { id: "ppe", name: "Nairobi PPE Supply", initial: "N", role: "Owner", people: 3 },
  { id: "ridge", name: "Ridge Moto Spares", initial: "R", role: "Admin", people: 7 },
]

// Order follows the build plan. `soon` modules arrive in later phases.
const NAV = [
  { href: "/today", label: "Today", icon: Sun, soon: false },
  { href: "/projects", label: "Projects", icon: FolderKanban, soon: true },
  { href: "/network", label: "Network", icon: Share2, soon: true },
  { href: "/meetings", label: "Meetings", icon: CalendarDays, soon: true },
  { href: "/notebook", label: "Notebook", icon: NotebookPen, soon: true },
]

const COMPANY_NAV = [
  { href: "/team", label: "Team", icon: Users, soon: false },
  { href: "/mentor", label: "Mentor", icon: Sparkles, soon: true },
  { href: "/settings", label: "Settings", icon: SlidersHorizontal, soon: true },
]

export function AppSidebar() {
  const pathname = usePathname()

  const item = (n: (typeof NAV)[number]) => (
    <SidebarMenuItem key={n.href}>
      <SidebarMenuButton
        asChild
        isActive={pathname.startsWith(n.href)}
        className={n.soon ? "text-muted-foreground" : undefined}
      >
        <Link href={n.soon ? "#" : n.href} aria-disabled={n.soon}>
          <n.icon />
          <span>{n.label}</span>
          {n.soon && (
            <span className="text-muted-foreground ml-auto text-xs">Soon</span>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <CompanySwitcher companies={COMPANIES} currentId="kilima" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Work</SidebarGroupLabel>
          <SidebarMenu>{NAV.map(item)}</SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Company</SidebarGroupLabel>
          <SidebarMenu>{COMPANY_NAV.map(item)}</SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="gap-3">
              <span className="bg-accent text-accent-foreground flex size-8 items-center justify-center rounded-full text-xs font-semibold">
                CN
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate font-medium">Charis N.</span>
                <span className="text-muted-foreground truncate text-xs">
                  Owner · Kilima Labs
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
