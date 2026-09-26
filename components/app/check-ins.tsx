"use client"

import { useState, useTransition } from "react"
import { ClipboardCheck, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { cn } from "cn"
import { Button } from "@/components/ui/button"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { postCheckIn } from "@/lib/data/actions"
import { HEALTH, type CheckIn, type ProjectHealth } from "@/lib/data/types"

type Draft = { moved: string; stuck: string; next: string; progress: number; health: ProjectHealth }

const PARTS = [
  ["moved", "What moved", "What got done since the last check-in."],
  ["stuck", "What is stuck", "Blocked, late, or waiting on someone."],
  ["next", "Next", "What happens before the next check-in."],
] as const

/**
 * Opens with a draft written from the project's tasks since the last
 * check-in. Nothing is posted until the person has read and edited it.
 */
export function WriteCheckIn({
  projectId,
  projectName,
  draft,
  due,
}: {
  projectId: string
  projectName: string
  draft: Draft
  due: boolean
}) {
  const [open, setOpen] = useState(false)
  const [health, setHealth] = useState<ProjectHealth>(draft.health)
  const [pending, start] = useTransition()

  function submit(formData: FormData) {
    formData.set("health", health)
    start(async () => {
      const result = await postCheckIn(projectId, formData)
      if (result.ok) {
        setOpen(false)
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) setHealth(draft.health)
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant={due ? "default" : "outline"}>
          <ClipboardCheck /> Write check-in
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit(new FormData(e.currentTarget))
          }}
        >
          <DialogHeader>
            <DialogTitle>Check in on {projectName}</DialogTitle>
            <DialogDescription>
              Filled in from the tasks since the last check-in. Change anything before you post.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-6">
            {PARTS.map(([key, label, help]) => (
              <div key={key} className="flex flex-col gap-2">
                <Label htmlFor={`ci-${key}`}>{label}</Label>
                <Textarea
                  id={`ci-${key}`}
                  name={key}
                  rows={3}
                  defaultValue={draft[key]}
                  placeholder={help}
                />
              </div>
            ))}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="ci-progress">Progress (%)</Label>
                <Input
                  id="ci-progress"
                  name="progress"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={draft.progress}
                  required
                />
                <p className="text-muted-foreground text-xs">
                  {draft.progress}% of tasks are done.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ci-health">Overall</Label>
                <Select value={health} onValueChange={(v) => setHealth(v as ProjectHealth)}>
                  <SelectTrigger id="ci-health">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(HEALTH) as ProjectHealth[]).map((h) => (
                      <SelectItem key={h} value={h}>
                        {HEALTH[h].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ci-risks">Risks</Label>
              <Input
                id="ci-risks"
                name="risks"
                placeholder="If KEBS slips past 5 Oct, delivery moves too"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Post check-in
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })

/** The project's progress history, newest first. */
export function CheckInList({
  checkIns,
  names,
}: {
  checkIns: CheckIn[]
  names: Record<string, string>
}) {
  if (checkIns.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-6 text-center text-sm">
        No check-ins yet. The first one is a short note: what moved, what is stuck, what is next.
      </p>
    )
  }
  return (
    <ol className="flex flex-col gap-3">
      {checkIns.map((c) => (
        <li key={c.id} className="bg-card rounded-xl border p-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="font-semibold">{longDate(c.created_at)}</span>
            <span className="text-muted-foreground">{names[c.author_id] ?? "Someone"}</span>
            <span
              className={cn(
                "inline-flex h-6 items-center rounded-full px-2 text-xs font-medium",
                HEALTH[c.health].tone,
              )}
            >
              {HEALTH[c.health].label}
            </span>
            <span className="text-muted-foreground ml-auto text-xs tabular-nums">
              {c.progress}% done
            </span>
          </div>
          <dl className="mt-3 grid gap-3 text-sm md:grid-cols-3">
            {PARTS.map(([key, label]) => (
              <div key={key}>
                <dt className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  {label}
                </dt>
                <dd className="mt-1 whitespace-pre-line">
                  {c[key] || <span className="text-muted-foreground">—</span>}
                </dd>
              </div>
            ))}
          </dl>
          {c.risks && (
            <p className="bg-warn-soft mt-3 rounded-lg px-3 py-2 text-sm">
              <span className="text-warn font-medium">Risk: </span>
              {c.risks}
            </p>
          )}
        </li>
      ))}
    </ol>
  )
}
