"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { ArrowRightLeft, CalendarClock, Download, Loader2, Trash2, UserCog, X } from "lucide-react"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  bulkDealsClose,
  bulkDealsDelete,
  bulkDealsOwner,
  bulkDealsStage,
  exportDeals,
} from "@/lib/data/actions"
import { STAGES, money, stageOf, type StageId } from "@/lib/data/types"

export type DealRow = {
  id: string
  title: string
  organisation?: { id: string; name: string }
  contactName?: string
  value: number
  stage: StageId
  closesInDays: number | null
  ownerInitials: string
  ownerName: string
}

const word = (n: number) => `${n} deal${n === 1 ? "" : "s"}`

function closes(days: number | null, stage: StageId) {
  if (stage === "won" || stage === "lost") return { text: "Closed", tone: "text-muted-foreground" }
  if (days === null) return { text: "No date", tone: "text-muted-foreground" }
  if (days < 0) return { text: `${Math.abs(days)}d late`, tone: "text-warn font-medium" }
  if (days === 0) return { text: "Today", tone: "text-warn font-medium" }
  return { text: `in ${days}d`, tone: "text-muted-foreground" }
}

export function DealTable({
  rows,
  owners,
  canEdit,
  canDelete,
}: {
  rows: DealRow[]
  owners: { value: string; label: string }[]
  canEdit: boolean
  canDelete: boolean
}) {
  const [selected, setSelected] = useState<string[]>([])
  const [pending, start] = useTransition()
  const [date, setDate] = useState("")
  const [losing, setLosing] = useState(false)
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
      const { filename, csv } = await exportDeals(selected)
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast.success(
        selected.length > 0 ? `Exported ${word(selected.length)}` : "Exported every deal",
      )
    })
  }

  const total = rows.filter((r) => selected.includes(r.id)).reduce((s, r) => s + r.value, 0)

  return (
    <>
      <Card className="mt-4 py-0">
        <CardContent className="p-0">
          {selected.length > 0 && canEdit && (
            <div className="bg-accent text-accent-foreground flex flex-wrap items-center gap-2 px-4 py-2.5">
              <span className="text-sm font-semibold">
                {selected.length} selected · {money(total)}
              </span>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={pending}>
                    <ArrowRightLeft /> Stage
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel className="text-muted-foreground text-xs">
                    Move to
                  </DropdownMenuLabel>
                  {STAGES.map((s) => (
                    <DropdownMenuItem
                      key={s.id}
                      onSelect={() =>
                        s.id === "lost"
                          ? setLosing(true)
                          : run(() => bulkDealsStage(selected, s.id))
                      }
                    >
                      {s.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

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
                      onSelect={() => run(() => bulkDealsOwner(selected, p.value))}
                    >
                      {p.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" disabled={pending}>
                    <CalendarClock /> Close date
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-72">
                  <form
                    className="flex flex-col gap-2"
                    onSubmit={(e) => {
                      e.preventDefault()
                      run(() => bulkDealsClose(selected, date))
                      setDate("")
                    }}
                  >
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      aria-label="Expected to close"
                    />
                    <div className="flex justify-between gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => run(() => bulkDealsClose(selected, ""))}
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
                      aria-label="Select every deal shown"
                    />
                  )}
                </th>
                <th className="px-4 py-2.5">Deal</th>
                <th className="px-4 py-2.5 text-right">Worth</th>
                <th className="hidden px-4 py-2.5 sm:table-cell">Stage</th>
                <th className="hidden px-4 py-2.5 md:table-cell">Closes</th>
                <th className="hidden px-4 py-2.5 md:table-cell">Owner</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {rows.map((d) => {
                const c = closes(d.closesInDays, d.stage)
                const on = selected.includes(d.id)
                return (
                  <tr key={d.id} className={on ? "bg-accent/40" : "hover:bg-muted/50"}>
                    <td className="px-4 py-3">
                      {canEdit && (
                        <Checkbox
                          checked={on}
                          onCheckedChange={() => toggle(d.id)}
                          aria-label={`Select ${d.title}`}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/deals/${d.id}`} className="block min-w-0">
                        <span className="block truncate font-medium hover:underline">
                          {d.title}
                        </span>
                        <span className="text-muted-foreground block truncate text-xs">
                          {d.organisation?.name ?? "No organisation"}
                          {d.contactName ? ` · ${d.contactName}` : ""}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums whitespace-nowrap">
                      {money(d.value)}
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <Badge variant={d.stage === "won" ? "default" : "secondary"}>
                        {stageOf(d.stage).label}
                      </Badge>
                    </td>
                    <td className={`hidden px-4 py-3 text-xs md:table-cell ${c.tone}`}>{c.text}</td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span
                        className="bg-fill-strong grid size-7 place-items-center rounded-full text-[10px] font-semibold"
                        title={d.ownerName}
                      >
                        {d.ownerInitials}
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
          {rows.length} shown · {money(rows.reduce((s, r) => s + r.value, 0))}
        </p>
        <Button variant="ghost" size="sm" onClick={download} disabled={pending}>
          <Download /> Export CSV
        </Button>
      </div>

      {/* Losing deals is worth one question, asked once for all of them. */}
      <Dialog open={losing} onOpenChange={setLosing}>
        <DialogContent className="sm:max-w-md">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const reason = String(new FormData(e.currentTarget).get("reason") ?? "")
              setLosing(false)
              run(() => bulkDealsStage(selected, "lost", reason))
            }}
          >
            <DialogHeader>
              <DialogTitle>Why were these {word(selected.length)} lost?</DialogTitle>
              <DialogDescription>One line, kept on each of them.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 py-6">
              <Label htmlFor="bulk-lost">Reason</Label>
              <Input
                id="bulk-lost"
                name="reason"
                placeholder="Went with a cheaper supplier"
                autoFocus
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLosing(false)}>
                Cancel
              </Button>
              <Button type="submit">Mark as lost</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {word(selected.length)}?</AlertDialogTitle>
            <AlertDialogDescription>
              They are removed for good. Their tasks, projects and history are kept and simply lose
              the link. To close a deal instead, move it to Won or Lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={(e) => {
                e.preventDefault()
                setConfirmDelete(false)
                run(() => bulkDealsDelete(selected))
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
