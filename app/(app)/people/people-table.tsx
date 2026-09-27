"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import {
  CalendarClock,
  Download,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Tag,
  Trash2,
  UserCog,
  X,
} from "lucide-react"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  bulkPeopleDelete,
  bulkPeopleNextTouch,
  bulkPeopleOwner,
  bulkPeopleTag,
  exportPeople,
} from "@/lib/data/actions"

export type PersonRow = {
  id: string
  name: string
  title?: string
  organisation?: { id: string; name: string }
  touchDueInDays: number | null
  tags: string[]
  phone?: string
  email?: string
  ownerInitials: string
  ownerName: string
}

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

function touch(days: number | null) {
  if (days === null) return { text: "No date set", tone: "text-muted-foreground" }
  if (days < 0)
    return { text: `${Math.abs(days)} days overdue`, tone: "text-destructive font-medium" }
  if (days === 0) return { text: "Speak today", tone: "text-warn font-medium" }
  if (days <= 7) return { text: `in ${days} days`, tone: "text-warn" }
  return { text: `in ${days} days`, tone: "text-muted-foreground" }
}

const word = (n: number) => `${n} ${n === 1 ? "person" : "people"}`

export function PeopleTable({
  rows,
  owners,
  canEdit,
  canDelete,
}: {
  rows: PersonRow[]
  owners: { value: string; label: string }[]
  canEdit: boolean
  canDelete: boolean
}) {
  const [selected, setSelected] = useState<string[]>([])
  const [pending, start] = useTransition()
  const [tag, setTag] = useState("")
  const [date, setDate] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)

  const allOn = rows.length > 0 && selected.length === rows.length
  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  function run(fn: () => Promise<{ ok: boolean; message: string }>) {
    start(async () => {
      const result = await fn()
      if (result.ok) {
        toast.success(result.message)
        setSelected([])
      } else {
        toast.error(result.message)
      }
    })
  }

  function download() {
    start(async () => {
      const { filename, csv } = await exportPeople(selected)
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast.success(selected.length > 0 ? `Exported ${word(selected.length)}` : "Exported everyone")
    })
  }

  return (
    <>
      <Card className="mt-4 py-0">
        <CardContent className="p-0">
          {/* The bulk bar appears the moment something is ticked. */}
          {selected.length > 0 && canEdit && (
            <div className="bg-accent text-accent-foreground flex flex-wrap items-center gap-2 px-4 py-2.5">
              <span className="text-sm font-semibold">{selected.length} selected</span>

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
                  {owners.map((p) => (
                    <DropdownMenuItem
                      key={p.value}
                      onSelect={() => run(() => bulkPeopleOwner(selected, p.value))}
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
                      run(() => bulkPeopleTag(selected, tag))
                      setTag("")
                    }}
                  >
                    <Input
                      value={tag}
                      onChange={(e) => setTag(e.target.value)}
                      placeholder="Decision maker"
                      autoFocus
                      aria-label="Tag"
                    />
                    <Button type="submit" size="sm" disabled={!tag.trim()}>
                      Add
                    </Button>
                  </form>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" disabled={pending}>
                    <CalendarClock /> Speak again on
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-72">
                  <form
                    className="flex flex-col gap-2"
                    onSubmit={(e) => {
                      e.preventDefault()
                      run(() => bulkPeopleNextTouch(selected, date))
                      setDate("")
                    }}
                  >
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      aria-label="Speak again on"
                    />
                    <div className="flex justify-between gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => run(() => bulkPeopleNextTouch(selected, ""))}
                      >
                        Clear the date
                      </Button>
                      <Button type="submit" size="sm" disabled={!date}>
                        Set
                      </Button>
                    </div>
                  </form>
                </PopoverContent>
              </Popover>

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

              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setSelected([])}>
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
                      onCheckedChange={() => setSelected(allOn ? [] : rows.map((r) => r.id))}
                      aria-label="Select everyone shown"
                    />
                  )}
                </th>
                <th className="px-4 py-2.5">Person</th>
                <th className="px-4 py-2.5">Speak next</th>
                <th className="hidden px-4 py-2.5 lg:table-cell">Tags</th>
                <th className="hidden px-4 py-2.5 md:table-cell">Owner</th>
                <th className="hidden px-4 py-2.5 sm:table-cell">
                  <span className="sr-only">Contact</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {rows.map((p) => {
                const t = touch(p.touchDueInDays)
                const on = selected.includes(p.id)
                return (
                  <tr key={p.id} className={on ? "bg-accent/40" : "hover:bg-muted/50"}>
                    <td className="px-4 py-3">
                      {canEdit && (
                        <Checkbox
                          checked={on}
                          onCheckedChange={() => toggle(p.id)}
                          aria-label={`Select ${p.name}`}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-3">
                        <span className="bg-fill-strong grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold">
                          {initials(p.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{p.name}</span>
                          <span className="text-muted-foreground block truncate text-xs">
                            {p.title ? `${p.title} · ` : ""}
                            {p.organisation ? (
                              <Link
                                href={`/organisations/${p.organisation.id}`}
                                className="hover:underline"
                              >
                                {p.organisation.name}
                              </Link>
                            ) : (
                              "No organisation"
                            )}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-xs whitespace-nowrap ${t.tone}`}>{t.text}</td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <span className="flex flex-wrap gap-1">
                        {p.tags.slice(0, 2).map((tg) => (
                          <Badge key={tg} variant="outline">
                            {tg}
                          </Badge>
                        ))}
                        {p.tags.length > 2 && (
                          <span className="text-muted-foreground text-xs">
                            +{p.tags.length - 2}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span
                        className="bg-fill-strong grid size-7 place-items-center rounded-full text-[10px] font-semibold"
                        title={p.ownerName}
                      >
                        {p.ownerInitials}
                      </span>
                    </td>
                    <td className="hidden px-2 py-2 sm:table-cell">
                      <span className="flex justify-end gap-0.5">
                        {p.phone && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              asChild
                              aria-label={`Call ${p.name}`}
                            >
                              <a href={`tel:${p.phone.replace(/\s/g, "")}`}>
                                <Phone />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              asChild
                              aria-label={`WhatsApp ${p.name}`}
                            >
                              <a
                                href={`https://wa.me/?text=${encodeURIComponent(`Hi ${p.name.split(" ")[0]},`)}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <MessageCircle />
                              </a>
                            </Button>
                          </>
                        )}
                        {p.email && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            asChild
                            aria-label={`Email ${p.name}`}
                          >
                            <a href={`mailto:${p.email}`}>
                              <Mail />
                            </a>
                          </Button>
                        )}
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
            <AlertDialogTitle>Delete {word(selected.length)}?</AlertDialogTitle>
            <AlertDialogDescription>
              They are removed for good. Their deals, tasks and history are kept and simply lose the
              link to them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={(e) => {
                e.preventDefault()
                setConfirmDelete(false)
                run(() => bulkPeopleDelete(selected))
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
