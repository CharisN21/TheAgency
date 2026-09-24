"use client"

import Link from "next/link"
import { useTransition } from "react"
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
import { signOut, switchWorkspace } from "@/lib/data/actions"
import { ROLE_LABEL, can, type Role } from "@/lib/data/types"

export type SwitcherWorkspace = {
  id: string
  name: string
  role: Role
  people: number
  accent_color: string
}

/** Top-left switcher between your ventures. Each keeps its own people and records. */
export function WorkspaceSwitcher({
  workspaces,
  currentId,
}: {
  workspaces: SwitcherWorkspace[]
  currentId: string
}) {
  const [pending, start] = useTransition()
  const current = workspaces.find((w) => w.id === currentId) ?? workspaces[0]

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="gap-3" disabled={pending}>
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-bold text-white"
                style={{ backgroundColor: current.accent_color }}
              >
                {current.name.trim()[0]?.toUpperCase()}
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate font-medium">{current.name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {ROLE_LABEL[current.role]} · {current.people}{" "}
                  {current.people === 1 ? "person" : "people"}
                </span>
              </span>
              <ChevronsUpDown className="text-muted-foreground size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="min-w-64">
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Your workspaces
            </DropdownMenuLabel>
            {workspaces.map((w) => (
              <DropdownMenuItem
                key={w.id}
                className="gap-3"
                onSelect={() => start(() => switchWorkspace(w.id).then(() => {}))}
              >
                <span
                  className="flex size-6 shrink-0 items-center justify-center rounded text-[11px] font-bold text-white"
                  style={{ backgroundColor: w.accent_color }}
                >
                  {w.name.trim()[0]?.toUpperCase()}
                </span>
                <span className="grid flex-1 leading-tight">
                  <span>{w.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {ROLE_LABEL[w.role]} · {w.people}{" "}
                    {w.people === 1 ? "person" : "people"}
                  </span>
                </span>
                {w.id === current.id && <Check className="size-4" />}
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/new-workspace">
                <Plus /> Create workspace
              </Link>
            </DropdownMenuItem>
            {can.invite(current.role) && (
              <DropdownMenuItem asChild>
                <Link href="/team?invite=1">
                  <UserPlus /> Invite people to {current.name}
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => start(() => signOut().then(() => {}))}>
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
