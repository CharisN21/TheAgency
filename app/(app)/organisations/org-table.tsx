"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Download, Loader2, Tag, Trash2, UserCog, X } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  bulkAddTag,
  bulkAssignOwner,
  bulkDelete,
  bulkSetCategory,
  exportOrganisations,
} from "@/lib/data/actions"
import {
  ORG_CATEGORIES,
  ORG_CATEGORY_LABEL,
  money,
  type OrgCategory,
} from "@/lib/data/types"

export type OrgRow = {
  id: string
  name: string
  subtitle: string
  category: OrgCategory
  people: number
  openDeals: number
  openValue: number
  daysSinceContact: number | null
  ownerInitials: string
  ownerName: string
}

function contactAge(days: number | null) {
  if (days === null) return { text: "Never", tone: "text-warn" }
  if (days === 0) return { text: "Today", tone: "text-muted-foreground" }
  if (days >= 30) return { text: `${days} days ago`, tone: "text-destructive font-medium" }
  return { text: `${days} ${days === 1 ? "day" : "days"} ago`, tone: "text-muted-foreground" }
}

export function OrgTable({
  rows,
  people,
  canEdit,
  canDelete,
}: {
  rows: OrgRow[]
  people: { value: string; label: string }[]
  canEdit: boolean
  canDelete: boolean
}) {
  const [selected, setSelected] = useState<string[]>([])
  const [pending, start] = useTransition()
  const [tag, setTag] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)

  const allOn = rows.length > 0 && selected.length === rows.length
  const toggleAll = () => setSelected(allOn ? [] : rows.map((r) => r.id))
  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  function run(fn: () => Promise<{ ok: boolean; message: string }>, clear = true) {
    start(async () => {
      const result = await fn()
      if (result.ok) {
        toast.success(result.message)
        if (clear) setSelected([])
      } else {
        toast.error(result.message)
      }
    })
  }

  function download() {
    start(async () => {
      const { filename, csv } = await exportOrganisations(selected)
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast.success(
        selected.length > 0
          ? `Exported ${selected.length} organisation${selected.length === 1 ? "" : "s"}`
          : "Exported everything"
      )
    })
  }

  return (
    <>
      <Card className="mt-4 py-0">
        <CardContent className="p-0">
          {/* The bulk bar replaces the header row the moment something is selected. */}
          {selected.length > 0 && canEdit && (
            <div className="bg-accent text-accent-foreground flex flex-wrap items-center gap-2 px-4 py-2.5">
              <span className="text-sm font-semibold">
                {selected.length} selected
              </span>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={pending}>
                    <UserCog /> Owner
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel className="text-muted-foreground text-xs">
                    Give them to
                  </DropdownMenuLabel>
                  {people.map((p) => (
                    <DropdownMenuItem
                      key={p.value}
                      onSelect={() => run(() => bulkAssignOwner(selected, p.value))}
                    >
                      {p.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" disabled={pending}>
                    <Tag /> Tag
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-64">
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault()
                      run(() => bulkAddTag(selected, tag))
                      setTag("")
                    }}
                  >
                    <Input
                      value={tag}
                      onChange={(e) => setTag(e.target.value)}
                      placeholder="PPE"
                      autoFocus
                    />
                    <Button type="submit" size="sm" disabled={!tag.trim()}>
                      Add
                    </Button>
                  </form>
                </PopoverContent>
              </Popover>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={pending}>
                    Type
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {ORG_CATEGORIES.map((c) => (
                    <DropdownMenuItem
                      key={c}
                      onSelect={() => run(() => bulkSetCategory(selected, c))}
                    >
                      {ORG_CATEGORY_LABEL[c]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="outline" size="sm" onClick={download} disabled={pending}>
                <Download /> Export
              </Button>

              {canDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  onClick={() => setConfirmDelete(true)}
                  disabled={pending}
                >
                  <Trash2 /> Delete
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => setSelected([])}
              >
                <X /> Clear
              </Button>
              {pending && <Loader2 className="size-4 animate-spin" />}
            </div>
          )}

          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-border border-b text-left text-[11px] font-semibold tracking-wide uppercase">
                <th className="w-10 px-4 py-2.5">
                  {canEdit && (
                    <Checkbox
                      checked={allOn}
                      onCheckedChange={toggleAll}
                      aria-label="Select every organisation"
                    />
                  )}
                </th>
                <th className="px-4 py-2.5">Organisation</th>
                <th className="hidden px-4 py-2.5 md:table-cell">Type</th>
                <th className="hidden px-4 py-2.5 md:table-cell">People</th>
                <th className="px-4 py-2.5">Open deals</th>
                <th className="hidden px-4 py-2.5 sm:table-cell">Last contact</th>
                <th className="hidden px-4 py-2.5 md:table-cell">Owner</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {rows.map((o) => {
                const age = contactAge(o.daysSinceContact)
                const on = selected.includes(o.id)
                return (
                  <tr key={o.id} className={on ? "bg-accent/40" : "hover:bg-muted/50"}>
                    <td className="px-4 py-3">
                      {canEdit && (
                        <Checkbox
                          checked={on}
                          onCheckedChange={() => toggle(o.id)}
                          aria-label={`Select ${o.name}`}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/organisations/${o.id}`}
                        className="flex items-center gap-3"
                      >
                        <span className="bg-accent text-accent-foreground grid size-9 shrink-0 place-items-center rounded-md text-xs font-bold">
                          {o.name.trim()[0]?.toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{o.name}</span>
                          <span className="text-muted-foreground block truncate text-xs">
                            {o.subtitle}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <Badge variant="secondary">{ORG_CATEGORY_LABEL[o.category]}</Badge>
                    </td>
                    <td className="text-muted-foreground hidden px-4 py-3 tabular-nums md:table-cell">
                      {o.people}
                    </td>
                    <td className="px-4 py-3">
                      {o.openDeals > 0 ? (
                        <span className="tabular-nums">
                          <span className="font-medium">{money(o.openValue)}</span>
                          <span className="text-muted-foreground"> · {o.openDeals}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className={`hidden px-4 py-3 sm:table-cell ${age.tone}`}>
                      {age.text}
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span
                        className="bg-fill-strong grid size-7 place-items-center rounded-full text-[10px] font-semibold"
                        title={o.ownerName}
                      >
                        {o.ownerInitials}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-muted-foreground text-xs">
          {rows.length} shown
          {selected.length > 0 ? ` · ${selected.length} selected` : ""}
        </p>
        <Button variant="ghost" size="sm" onClick={download} disabled={pending}>
          <Download /> Export CSV
        </Button>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selected.length} organisation{selected.length === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Their people are kept and simply lose the link. Anything with an open deal
              is refused, so nothing in flight disappears.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault()
                setConfirmDelete(false)
                run(() => bulkDelete(selected))
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
