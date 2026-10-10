"use client"

import Link from "next/link"
import { useTransition } from "react"
import { Check, ChevronsUpDown, LayoutGrid, LogOut, Plus, UserPlus } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { signOut, switchWorkspace } from "@/lib/data/actions"
import { ROLE_LABEL, can, type Role } from "@/lib/data/types"

export type SwitcherWorkspace = {
  id: string
  name: string
  role: Role
  people: number
  accent_color: string
  venture_id: string
}

export type SwitcherVenture = { id: string; name: string; accent_color: string; canAdd: boolean }

const mark = (name: string) => Array.from(name.trim())[0]?.toUpperCase()

/**
 * Top left: the venture's mark and the workspace you are in. The menu lists the
 * other workspaces of this venture, and "All ventures" goes back to the start.
 */
export function WorkspaceSwitcher({
  workspaces,
  currentId,
  venture,
}: {
  workspaces: SwitcherWorkspace[]
  currentId: string
  venture: SwitcherVenture
}) {
  const [pending, start] = useTransition()
  const current = workspaces.find((w) => w.id === currentId) ?? workspaces[0]
  const siblings = workspaces.filter((w) => w.venture_id === current.venture_id)
  const sameName = venture.name.trim().toLowerCase() === current.name.trim().toLowerCase()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="gap-3" disabled={pending}>
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-bold text-white"
                style={{ backgroundColor: venture.accent_color }}
              >
                {mark(venture.name)}
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate font-medium">{current.name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {sameName ? `${ROLE_LABEL[current.role]} · ${current.people} ${current.people === 1 ? "person" : "people"}` : venture.name}
                </span>
              </span>
              <ChevronsUpDown className="text-muted-foreground size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="min-w-64">
            <DropdownMenuLabel className="text-muted-foreground text-xs">Workspaces in {venture.name}</DropdownMenuLabel>
            {siblings.map((w) => (
              <DropdownMenuItem key={w.id} className="gap-3" onSelect={() => start(() => switchWorkspace(w.id).then(() => {}))}>
                <span className="grid flex-1 leading-tight">
                  <span>{w.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {ROLE_LABEL[w.role]} · {w.people} {w.people === 1 ? "person" : "people"}
                  </span>
                </span>
                {w.id === current.id && <Check className="size-4" />}
              </DropdownMenuItem>
            ))}
            {venture.canAdd && (
              <DropdownMenuItem asChild>
                <Link href={`/ventures/${venture.id}`}>
                  <Plus /> Add a workspace to {venture.name}
                </Link>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/ventures">
                <LayoutGrid /> All ventures
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
