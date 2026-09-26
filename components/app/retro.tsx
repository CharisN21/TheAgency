"use client"

import { useState, useTransition } from "react"
import { Archive, Check, Loader2, Plus, RotateCcw, X } from "lucide-react"
import { toast } from "sonner"

import { cn } from "cn"
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
import { closeProject, reopenProject } from "@/lib/data/actions"
import type { Noticed } from "@/lib/data/queries"

const STEPS = ["What went well", "What went wrong", "Lessons"] as const

/** Tick what applies from the list, or add your own line. */
function PickList({
  options,
  picked,
  toggle,
  own,
  setOwn,
  placeholder,
  empty,
  hint = "What the app noticed. Tick what is true.",
}: {
  hint?: string
  options: string[]
  picked: string[]
  toggle: (text: string) => void
  own: string[]
  setOwn: (v: string[]) => void
  placeholder: string
  empty: string
}) {
  const [draft, setDraft] = useState("")
  const add = () => {
    const t = draft.trim()
    if (t && !own.includes(t)) setOwn([...own, t])
    setDraft("")
  }

  return (
    <div className="flex flex-col gap-3">
      {options.length === 0 ? (
        <p className="text-muted-foreground text-sm">{empty}</p>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground text-xs">{hint}</p>
          {options.map((o) => (
            <Label
              key={o}
              className="hover:bg-muted/50 flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 font-normal"
            >
              <Checkbox checked={picked.includes(o)} onCheckedChange={() => toggle(o)} />
              {o}
            </Label>
          ))}
        </div>
      )}

      {own.length > 0 && (
        <ul className="flex flex-col gap-1">
          {own.map((o) => (
            <li
              key={o}
              className="bg-muted flex min-h-11 items-center gap-2 rounded-md px-3 text-sm"
            >
              <Check className="text-primary size-4 shrink-0" />
              <span className="flex-1">{o}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove "${o}"`}
                onClick={() => setOwn(own.filter((x) => x !== o))}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              add()
            }
          }}
          placeholder={placeholder}
          aria-label="Add your own"
        />
        <Button type="button" variant="outline" onClick={add} aria-label="Add">
          <Plus />
        </Button>
      </div>
    </div>
  )
}

/**
 * Close a project in three steps. Suggested lessons follow from what went
 * wrong, and each is accepted on its own; nothing is written in for you.
 */
export function CloseProject({
  projectId,
  projectName,
  noticed,
}: {
  projectId: string
  projectName: string
  noticed: { wentWell: string[]; wentWrong: Noticed[]; openTasks: number }
}) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [well, setWell] = useState<string[]>([])
  const [wellOwn, setWellOwn] = useState<string[]>([])
  const [wrong, setWrong] = useState<string[]>([])
  const [wrongOwn, setWrongOwn] = useState<string[]>([])
  const [lessons, setLessons] = useState<string[]>([])
  const [lessonsOwn, setLessonsOwn] = useState<string[]>([])
  const [finishOpen, setFinishOpen] = useState(false)
  const [pending, start] = useTransition()

  const toggle = (list: string[], set: (v: string[]) => void) => (t: string) =>
    set(list.includes(t) ? list.filter((x) => x !== t) : [...list, t])

  // Lessons are only suggested for the problems you ticked.
  const suggested = noticed.wentWrong
    .filter((w) => wrong.includes(w.text) && w.lesson)
    .map((w) => w.lesson!)

  function reset() {
    setStep(0)
    setWell([])
    setWellOwn([])
    setWrong([])
    setWrongOwn([])
    setLessons([])
    setLessonsOwn([])
    setFinishOpen(false)
  }

  function submit() {
    const formData = new FormData()
    for (const t of [...well, ...wellOwn]) formData.append("went_well", t)
    for (const t of [...wrong, ...wrongOwn]) formData.append("went_wrong", t)
    for (const t of [...lessons.filter((l) => suggested.includes(l)), ...lessonsOwn])
      formData.append("lessons", t)
    if (finishOpen) formData.set("finish_open", "1")
    start(async () => {
      const result = await closeProject(projectId, formData)
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
        if (o) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Archive /> Close project
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Close {projectName}</DialogTitle>
          <DialogDescription>
            Three short steps. What you write here is kept on the project and feeds the Mentor
            later.
          </DialogDescription>
        </DialogHeader>

        <ol className="flex gap-1.5 pt-2" aria-label="Steps">
          {STEPS.map((s, i) => (
            <li
              key={s}
              aria-current={i === step ? "step" : undefined}
              className={cn(
                "flex-1 rounded-md px-2 py-1.5 text-center text-xs font-medium",
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {i + 1}. {s}
            </li>
          ))}
        </ol>

        <div className="py-4">
          {step === 0 && (
            <PickList
              options={noticed.wentWell}
              picked={well}
              toggle={toggle(well, setWell)}
              own={wellOwn}
              setOwn={setWellOwn}
              placeholder="Achieng closed the price comparison two days early"
              empty="Nothing stood out in the tasks. Add what you saw."
            />
          )}
          {step === 1 && (
            <PickList
              options={noticed.wentWrong.map((w) => w.text)}
              picked={wrong}
              toggle={toggle(wrong, setWrong)}
              own={wrongOwn}
              setOwn={setWrongOwn}
              placeholder="The supplier list was out of date"
              empty="Nothing went wrong in the tasks and dates. Add anything else."
            />
          )}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              <PickList
                options={suggested}
                picked={lessons}
                toggle={toggle(lessons, setLessons)}
                own={lessonsOwn}
                setOwn={setLessonsOwn}
                placeholder="Check supplier details before quoting"
                hint="Suggested from what went wrong. Tick the ones you agree with."
                empty="No suggestions, because nothing was ticked under what went wrong. Write your own."
              />
              {noticed.openTasks > 0 && (
                <Label className="bg-warn-soft flex min-h-11 cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 font-normal">
                  <Checkbox
                    checked={finishOpen}
                    onCheckedChange={(c) => setFinishOpen(Boolean(c))}
                    className="mt-0.5"
                  />
                  <span className="text-sm">
                    Mark the {noticed.openTasks} open task{noticed.openTasks === 1 ? "" : "s"} as
                    done
                    <span className="text-muted-foreground block text-xs">
                      Leave it unticked to keep them on people&apos;s lists.
                    </span>
                  </span>
                </Label>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          {step > 0 ? (
            <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          )}
          {step < 2 ? (
            <Button type="button" onClick={() => setStep(step + 1)}>
              Next
            </Button>
          ) : (
            <Button type="button" onClick={submit} disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Close project
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ReopenProject({ projectId }: { projectId: string }) {
  const [pending, start] = useTransition()
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await reopenProject(projectId)
          if (result.ok) toast.success(result.message)
          else toast.error(result.message)
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <RotateCcw />} Reopen
    </Button>
  )
}
