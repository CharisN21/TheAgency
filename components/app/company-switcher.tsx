"use client"

import { Check, ChevronsUpDown, LogOut, Plus, UserPlus } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export type Company = {
  id: string
  name: string
  initial: string
  role: "Owner" | "Admin" | "Member" | "Viewer"
  people: number
}

/** Top-left switcher. Every company keeps its own data; switching reloads the panes. */
export function CompanySwitcher({
  companies,
  currentId,
}: {
  companies: Company[]
  currentId: string
}) {
  const current = companies.find((c) => c.id === currentId) ?? companies[0]

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="gap-3">
              <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-bold">
                {current.initial}
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate font-medium">{current.name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {current.role} · {current.people} people
                </span>
              </span>
              <ChevronsUpDown className="text-muted-foreground size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-64">
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Your companies
            </DropdownMenuLabel>
            {companies.map((c) => (
              <DropdownMenuItem key={c.id} className="gap-3">
                <span className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded text-[11px] font-bold">
                  {c.initial}
                </span>
                <span className="grid flex-1 leading-tight">
                  <span>{c.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {c.role} · {c.people} people
                  </span>
                </span>
                {c.id === current.id && <Check className="size-4" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Plus /> Create company
            </DropdownMenuItem>
            <DropdownMenuItem>
              <UserPlus /> Invite people to {current.name}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
