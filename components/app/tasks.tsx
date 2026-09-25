"use client"

import Link from "next/link"
import { useOptimistic, useState, useTransition } from "react"
import { CalendarClock, ChevronDown, FolderKanban, Link2, Loader2, Plus, Trash2 } from "lucide-react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { createTask, deleteTask, setTaskStatus, updateTask } from "@/lib/data/actions"
import type { TaskRow } from "@/lib/data/queries"
import {
  PRIORITY_LABEL,
  TASK_STATUS,
  TASK_STATUSES,
  type Priority,
  type TaskStatus,
} from "@/lib/data/types"

type Option = { value: string; label: string }

const initials = (name?: string) =>
  (name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

function due(days: number | null, done: boolean) {
  if (days === null) return null
  if (done) return { text: "", tone: "" }
  if (days < 0) return { text: `${Math.abs(days)}d late`, tone: "text-warn font-medium" }
  if (days === 0) return { text: "Due today", tone: "text-warn font-medium" }
  if (days === 1) return { text: "Due tomorrow", tone: "" }
  return { text: `Due in ${days}d`, tone: "" }
}

/** The status as a word with its colour; tapping it offers the others. */
export function StatusPill({
  status,
  onChange,
  disabled,
}: {
  status: TaskStatus
  onChange?: (s: TaskStatus) => void
  disabled?: boolean
}) {
  const s = TASK_STATUS[status]
  const pill = (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-medium whitespace-nowrap",
        s.tone
      )}
    >
      {s.label}
      {onChange && !disabled && <ChevronDown className="size-3" />}
    </span>
  )
  if (!onChange || disabled) return pill
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="focus-visible:ring-ring flex min-h-11 items-center rounded-full focus-visible:ring-2 focus-visible:outline-none"
        aria-label={`Status: ${s.label}. Change`}
      >
        {pill}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {TASK_STATUSES.filter((x) => x !== status).map((x) => (
          <DropdownMenuItem key={x} onSelect={() => onChange(x)}>
            {TASK_STATUS[x].label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Tasks as rows: tick to finish, tap the status to move it, tap the title to edit. */
export function TaskList({
  tasks,
  canEdit,
  assignees,
  userId,
  isAdmin,
  showAssignee = true,
  empty,
}: {
  tasks: TaskRow[]
  canEdit: boolean
  assignees: Option[]
  userId: string
  isAdmin: boolean
  showAssignee?: boolean
  empty: string
}) {
  const [, start] = useTransition()
  const [shown, setShown] = useOptimistic(
    tasks,
    (state, change: { id: string; status: TaskStatus }) =>
      state.map((t) => (t.id === change.id ? { ...t, status: change.status } : t))
  )

  function move(t: TaskRow, status: TaskStatus) {
    start(async () => {
      setShown({ id: t.id, status })
      const result = await setTaskStatus(t.id, status)
      if (!result.ok) toast.error(result.message)
      else if (status === "done") toast.success(`Done: ${t.title}`)
    })
  }

  if (shown.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-6 text-center text-sm">
        {empty}
      </p>
    )
  }

  return (
    <ul className="bg-card divide-border border-border divide-y rounded-xl border">
      {shown.map((t) => {
        const done = t.status === "done"
        const d = due(t.dueInDays, done)
        return (
          <li key={t.id} className="flex min-h-14 items-center gap-3 px-3 py-2 sm:px-4">
            <span className="grid size-11 shrink-0 place-items-center">
              <Checkbox
                checked={done}
                disabled={!canEdit}
                onCheckedChange={(c) => move(t, c ? "done" : "todo")}
                aria-label={done ? `Mark ${t.title} as not done` : `Mark ${t.title} as done`}
              />
            </span>

            <span className="min-w-0 flex-1">
              {canEdit ? (
                <EditTask task={t} assignees={assignees} canDelete={isAdmin || t.created_by === userId}>
                  <button
                    type="button"
                    className={cn(
                      "focus-visible:ring-ring block max-w-full truncate rounded-sm text-left text-sm font-medium hover:underline focus-visible:ring-2 focus-visible:outline-none",
                      done && "text-muted-foreground line-through"
                    )}
                  >
                    {t.title}
                  </button>
                </EditTask>
              ) : (
                <span className={cn("block truncate text-sm font-medium", done && "text-muted-foreground line-through")}>
                  {t.title}
                </span>
              )}
              <span className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                {d && d.text && (
                  <span className={cn("flex items-center gap-1", d.tone)}>
                    <CalendarClock className="size-3" /> {d.text}
                  </span>
                )}
                {t.priority === "high" && !done && <span className="text-warn font-medium">High priority</span>}
                {t.project && (
                  <Link href={`/projects/${t.project.id}`} className="flex items-center gap-1 hover:underline">
                    <FolderKanban className="size-3" /> {t.project.name}
                  </Link>
                )}
                {t.link && (
                  <Link href={t.link.href} className="flex min-w-0 items-center gap-1 hover:underline">
                    <Link2 className="size-3 shrink-0" /> <span className="truncate">{t.link.label}</span>
                  </Link>
                )}
              </span>
            </span>

            <StatusPill status={t.status} onChange={(s) => move(t, s)} disabled={!canEdit} />

            {showAssignee && (
              <span
                title={t.assignee?.full_name}
                aria-label={`For ${t.assignee?.full_name ?? "someone"}`}
                className="bg-fill-strong hidden size-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold sm:grid"
              >
                {initials(t.assignee?.full_name)}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function TaskFields({
  assignees,
  assignee,
  setAssignee,
  priority,
  setPriority,
  task,
}: {
  assignees: Option[]
  assignee: string
  setAssignee: (v: string) => void
  priority: Priority
  setPriority: (v: Priority) => void
  task?: TaskRow
}) {
  return (
    <div className="flex flex-col gap-4 py-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="t-title">What needs doing</Label>
        <Input
          id="t-title"
          name="title"
          defaultValue={task?.title}
          placeholder="Send the quote to Safaricom"
          autoFocus
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="t-assignee">For</Label>
          <Select value={assignee} onValueChange={setAssignee}>
            <SelectTrigger id="t-assignee">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {assignees.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="t-due">Due</Label>
          <Input id="t-due" name="due_at" type="date" defaultValue={task?.due_at?.slice(0, 10)} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="t-priority">Priority</Label>
        <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
          <SelectTrigger id="t-priority">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => (
              <SelectItem key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="t-notes">Notes</Label>
        <Textarea id="t-notes" name="notes" rows={2} defaultValue={task?.notes} placeholder="Anything they need to know" />
      </div>
    </div>
  )
}

/**
 * "Add task", already pointed at whatever the page is about: a person, a
 * project, a deal or an organisation.
 */
export function NewTask({
  assignees,
  defaultAssignee,
  links = {},
  context,
  size = "sm",
}: {
  assignees: Option[]
  defaultAssignee: string
  links?: { project_id?: string; organisation_id?: string; deal_id?: string; contact_id?: string }
  /** "for Vision Safety", shown under the title. */
  context?: string
  size?: "sm" | "default"
}) {
  const [open, setOpen] = useState(false)
  const [assignee, setAssignee] = useState(defaultAssignee)
  const [priority, setPriority] = useState<Priority>("medium")
  const [pending, start] = useTransition()

  function submit(formData: FormData) {
    formData.set("assignee_id", assignee)
    formData.set("priority", priority)
    for (const [k, v] of Object.entries(links)) if (v) formData.set(k, v)
    start(async () => {
      const result = await createTask(formData)
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
        if (o) {
          setAssignee(defaultAssignee)
          setPriority("medium")
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size={size} aria-label="Add a task">
          <Plus /> Task
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
            <DialogTitle>Add a task</DialogTitle>
            <DialogDescription>{context ?? "One clear thing someone will do."}</DialogDescription>
          </DialogHeader>
          <TaskFields
            assignees={assignees}
            assignee={assignee}
            setAssignee={setAssignee}
            priority={priority}
            setPriority={setPriority}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Add task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditTask({
  task,
  assignees,
  canDelete,
  children,
}: {
  task: TaskRow
  assignees: Option[]
  canDelete: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [assignee, setAssignee] = useState(task.assignee_id)
  const [priority, setPriority] = useState<Priority>(task.priority)
  const [pending, start] = useTransition()

  function run(action: () => Promise<{ ok: boolean; message: string }>) {
    start(async () => {
      const result = await action()
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
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            formData.set("assignee_id", assignee)
            formData.set("priority", priority)
            run(() => updateTask(task.id, formData))
          }}
        >
          <DialogHeader>
            <DialogTitle>Edit task</DialogTitle>
            <DialogDescription>
              {TASK_STATUS[task.status].label}
              {task.project ? ` · ${task.project.name}` : ""}
              {task.link ? ` · ${task.link.label}` : ""}
            </DialogDescription>
          </DialogHeader>
          <TaskFields
            assignees={assignees}
            assignee={assignee}
            setAssignee={setAssignee}
            priority={priority}
            setPriority={setPriority}
            task={task}
          />
          <DialogFooter className="sm:justify-between">
            {canDelete ? (
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={() => run(() => deleteTask(task.id))}
              >
                <Trash2 /> Remove
              </Button>
            ) : (
              <span />
            )}
            <span className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="animate-spin" />}
                Save
              </Button>
            </span>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
