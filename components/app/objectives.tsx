"use client"

import { useState, useTransition } from "react"
import { Check, Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createObjective, deleteObjective, updateObjective } from "@/lib/data/actions"
import type { ObjectiveRow } from "@/lib/data/queries"
import { PERIOD_LABEL, moneyShort, type ObjectivePeriod } from "@/lib/data/types"

type Measure = ObjectiveRow["measure"]

const MEASURE_LABEL: Record<Measure, string> = {
  number: "A number (visits, orders, calls)",
  money: "An amount in KSh",
  won: "KSh won in deals (counted for you)",
  done: "Done or not done",
}

/** "2 of 5", "KSh 340k of KSh 1M", or "Done". */
function amount(o: ObjectiveRow) {
  if (o.measure === "done") return o.done ? "Done" : "Not done yet"
  const show = (n: number) => (o.measure === "number" ? n.toLocaleString("en-KE") : moneyShort(n))
  return `${show(o.current)} of ${show(o.target ?? 0)}`
}

function ObjectiveItem({ o, canEdit }: { o: ObjectiveRow; canEdit: boolean }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()

  function run(action: () => Promise<{ ok: boolean; message: string }>, close = true) {
    start(async () => {
      const result = await action()
      if (result.ok) {
        if (close) setOpen(false)
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    })
  }

  const body = (
    <>
      <span className="flex items-start gap-2">
        {o.measure === "done" && (
          <span className="grid size-5 shrink-0 place-items-center">
            {o.done ? (
              <Check className="text-ok size-4" />
            ) : (
              <span className="border-input size-3.5 rounded-sm border" />
            )}
          </span>
        )}
        <span
          className={
            o.done
              ? "text-muted-foreground text-sm font-medium line-through"
              : "text-sm font-medium"
          }
        >
          {o.title}
        </span>
      </span>
      {o.measure !== "done" && (
        <Progress value={o.percent} className="mt-2 h-1.5" aria-label={`${o.percent}%`} />
      )}
      <span className="text-muted-foreground mt-1.5 flex justify-between gap-2 text-xs">
        <span className="tabular-nums">{amount(o)}</span>
        {o.measure === "won" ? (
          <span>From won deals</span>
        ) : (
          o.measure !== "done" && <span>{o.percent}%</span>
        )}
      </span>
    </>
  )

  // Counted objectives, and anything you may not change, are read-only.
  if (!canEdit || o.measure === "won") {
    return <li className="bg-card rounded-lg border p-3">{body}</li>
  }

  return (
    <li>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="bg-card hover:border-primary/40 focus-visible:ring-ring block w-full rounded-lg border p-3 text-left transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none"
          >
            {body}
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const raw = String(new FormData(e.currentTarget).get("progress") ?? "")
              run(() => updateObjective(o.id, { progress: Number(raw.replace(/[^0-9.]/g, "")) }))
            }}
          >
            <DialogHeader>
              <DialogTitle>{o.title}</DialogTitle>
              <DialogDescription>{PERIOD_LABEL[o.period]}</DialogDescription>
            </DialogHeader>
            <div className="py-6">
              {o.measure === "done" ? (
                <Label className="flex min-h-11 cursor-pointer items-center gap-3 font-normal">
                  <Checkbox
                    checked={o.done}
                    disabled={pending}
                    onCheckedChange={(c) => run(() => updateObjective(o.id, { done: Boolean(c) }))}
                  />
                  Done
                </Label>
              ) : (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`o-${o.id}`}>
                    {o.measure === "money" ? "Where it stands now (KSh)" : "Where it stands now"}
                  </Label>
                  <Input
                    id={`o-${o.id}`}
                    name="progress"
                    inputMode="numeric"
                    defaultValue={o.current.toLocaleString("en-KE")}
                    autoFocus
                  />
                  <p className="text-muted-foreground text-xs">
                    Target: {o.measure === "money" ? moneyShort(o.target ?? 0) : o.target}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter className="sm:justify-between">
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={() => run(() => deleteObjective(o.id))}
              >
                <Trash2 /> Remove
              </Button>
              {o.measure !== "done" && (
                <Button type="submit" disabled={pending}>
                  {pending && <Loader2 className="animate-spin" />}
                  Save
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </li>
  )
}

/** This week, this month, this year: side by side on a wide screen, one after another on a phone. */
export function Objectives({
  objectives,
  canEdit,
  empty,
}: {
  objectives: Record<ObjectivePeriod, ObjectiveRow[]>
  canEdit: boolean
  empty: string
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {(["week", "month", "year"] as ObjectivePeriod[]).map((period) => {
        const list = objectives[period]
        const done = list.filter((o) => o.percent >= 100).length
        return (
          <section key={period} aria-label={PERIOD_LABEL[period]} className="flex flex-col gap-2">
            <h3 className="flex items-baseline justify-between text-sm font-semibold">
              {PERIOD_LABEL[period]}
              {list.length > 0 && (
                <span className="text-muted-foreground text-xs font-normal">
                  {done} of {list.length} met
                </span>
              )}
            </h3>
            {list.length === 0 ? (
              <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-xs">
                {empty}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {list.map((o) => (
                  <ObjectiveItem key={o.id} o={o} canEdit={canEdit} />
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}

export function NewObjective({ ownerId, forName }: { ownerId: string; forName?: string }) {
  const [open, setOpen] = useState(false)
  const [period, setPeriod] = useState<ObjectivePeriod>("week")
  const [measure, setMeasure] = useState<Measure>("number")
  const [pending, start] = useTransition()

  function submit(formData: FormData) {
    formData.set("owner_id", ownerId)
    formData.set("period", period)
    formData.set("measure", measure)
    start(async () => {
      const result = await createObjective(formData)
      if (result.ok) {
        setOpen(false)
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Add an objective">
          <Plus /> Objective
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit(new FormData(e.currentTarget))
          }}
        >
          <DialogHeader>
            <DialogTitle>Add an objective{forName ? ` for ${forName}` : ""}</DialogTitle>
            <DialogDescription>
              One thing worth reaching by the end of the week, the month or the year.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="o-title">Objective</Label>
              <Input id="o-title" name="title" placeholder="Visit 5 suppliers" autoFocus required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="o-period">By the end of</Label>
                <Select value={period} onValueChange={(v) => setPeriod(v as ObjectivePeriod)}>
                  <SelectTrigger id="o-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">This week</SelectItem>
                    <SelectItem value="month">This month</SelectItem>
                    <SelectItem value="year">This year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {measure !== "done" && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="o-target">
                    {measure === "number" ? "Target" : "Target (KSh)"}
                  </Label>
                  <Input
                    id="o-target"
                    name="target"
                    inputMode="numeric"
                    placeholder={measure === "number" ? "5" : "1,000,000"}
                    required
                  />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="o-measure">Measured as</Label>
              <Select value={measure} onValueChange={(v) => setMeasure(v as Measure)}>
                <SelectTrigger id="o-measure">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(MEASURE_LABEL) as Measure[]).map((m) => (
                    <SelectItem key={m} value={m}>
                      {MEASURE_LABEL[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Add objective
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
