"use client"

import { useRouter } from "next/navigation"
import { useOptimistic, useState, useTransition } from "react"
import { CalendarClock, ChevronDown, FolderPlus, Loader2, Pencil } from "lucide-react"
import { toast } from "sonner"

import { cn } from "cn"
import { StatusPill, TaskList } from "@/components/app/tasks"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { createProject, setProjectHealth, setTaskStatus, updateProject } from "@/lib/data/actions"
import type { TaskRow } from "@/lib/data/queries"
import {
  HEALTH,
  TASK_STATUS,
  TASK_STATUSES,
  type Cadence,
  type ProjectHealth,
  type TaskStatus,
} from "@/lib/data/types"

type Option = { value: string; label: string }

/** On track, at risk or blocked, as a word; tapping it offers the others. */
export function HealthPill({
  projectId,
  health,
  canEdit,
}: {
  projectId: string
  health: ProjectHealth
  canEdit: boolean
}) {
  const [pending, start] = useTransition()
  const h = HEALTH[health]
  const pill = (
    <span className={cn("inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-medium", h.tone)}>
      {pending && <Loader2 className="size-3 animate-spin" />}
      {h.label}
      {canEdit && <ChevronDown className="size-3" />}
    </span>
  )
  if (!canEdit) return pill
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="focus-visible:ring-ring flex min-h-11 items-center rounded-full focus-visible:ring-2 focus-visible:outline-none"
        aria-label={`Project status: ${h.label}. Change`}
      >
        {pill}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {(Object.keys(HEALTH) as ProjectHealth[])
          .filter((x) => x !== health)
          .map((x) => (
            <DropdownMenuItem
              key={x}
              onSelect={() =>
                start(async () => {
                  const result = await setProjectHealth(projectId, x)
                  if (result.ok) toast.success(result.message)
                  else toast.error(result.message)
                })
              }
            >
              {HEALTH[x].label}
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

type ProjectValues = {
  id?: string
  name?: string
  scope?: string
  organisation_id?: string
  lead_id: string
  member_ids: string[]
  due_at?: string
  cadence: Cadence
}

/** Start a project, or edit one: what it is, who is on it, when it ends, how often to check in. */
export function ProjectForm({
  values,
  people,
  organisations,
}: {
  values: ProjectValues
  people: Option[]
  organisations: Option[]
}) {
  const router = useRouter()
  const editing = Boolean(values.id)
  const [open, setOpen] = useState(false)
  const [org, setOrg] = useState(values.organisation_id ?? "none")
  const [lead, setLead] = useState(values.lead_id)
  const [members, setMembers] = useState<string[]>(values.member_ids)
  const [cadence, setCadence] = useState<Cadence>(values.cadence)
  const [pending, start] = useTransition()

  function submit(formData: FormData) {
    formData.set("organisation_id", org === "none" ? "" : org)
    formData.set("lead_id", lead)
    formData.set("cadence", cadence)
    formData.delete("member_ids")
    for (const m of members) formData.append("member_ids", m)
    start(async () => {
      const result = editing ? await updateProject(values.id!, formData) : await createProject(formData)
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      setOpen(false)
      toast.success(result.message)
      if (!editing && "id" in result && result.id) router.push(`/projects/${result.id}`)
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) {
          setOrg(values.organisation_id ?? "none")
          setLead(values.lead_id)
          setMembers(values.member_ids)
          setCadence(values.cadence)
        }
      }}
    >
      <DialogTrigger asChild>
        {editing ? (
          <Button variant="outline" size="sm">
            <Pencil /> Edit
          </Button>
        ) : (
          <Button size="sm">
            <FolderPlus /> Project
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit(new FormData(e.currentTarget))
          }}
        >
          <DialogHeader>
            <DialogTitle>{editing ? "Edit project" : "Start a project"}</DialogTitle>
            <DialogDescription>
              A piece of work with an end: who is on it, what done looks like, and when you check in.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="p-name">Name</Label>
              <Input id="p-name" name="name" defaultValue={values.name} placeholder="PPE Campaign" autoFocus required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="p-scope">What done looks like</Label>
              <Textarea
                id="p-scope"
                name="scope"
                rows={3}
                defaultValue={values.scope}
                placeholder="Supply 2,000 PPE kits to Safaricom Partners by the end of October."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="p-org">For</Label>
                <Select value={org} onValueChange={setOrg}>
                  <SelectTrigger id="p-org">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Our own work</SelectItem>
                    {organisations.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="p-due">Ends</Label>
                <Input id="p-due" name="due_at" type="date" defaultValue={values.due_at?.slice(0, 10)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="p-lead">Lead</Label>
                <Select value={lead} onValueChange={setLead}>
                  <SelectTrigger id="p-lead">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {people.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="p-cadence">Check in</Label>
                <Select value={cadence} onValueChange={(v) => setCadence(v as Cadence)}>
                  <SelectTrigger id="p-cadence">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Every week</SelectItem>
                    <SelectItem value="fortnightly">Every two weeks</SelectItem>
                    <SelectItem value="monthly">Every month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <fieldset className="flex flex-col gap-1">
              <legend className="mb-1 text-sm font-medium">Who is on it</legend>
              {people.map((p) => {
                const isLead = p.value === lead
                return (
                  <Label
                    key={p.value}
                    className="hover:bg-muted/50 flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 font-normal"
                  >
                    <Checkbox
                      checked={isLead || members.includes(p.value)}
                      disabled={isLead}
                      onCheckedChange={(c) =>
                        setMembers((m) => (c ? [...m, p.value] : m.filter((x) => x !== p.value)))
                      }
                    />
                    {p.label}
                    {isLead && <span className="text-muted-foreground text-xs">Lead</span>}
                  </Label>
                )
              })}
              <p className="text-muted-foreground text-xs">
                You choose who is on it. Suggestions from Claude come later, and are only ever suggestions.
              </p>
            </fieldset>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {editing ? "Save" : "Start project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const initials = (name?: string) =>
  (name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

/** A project's tasks as a list or as a board with a column per status. */
export function ProjectTasks({
  tasks,
  canEdit,
  assignees,
  userId,
  isAdmin,
}: {
  tasks: TaskRow[]
  canEdit: boolean
  assignees: Option[]
  userId: string
  isAdmin: boolean
}) {
  const [, start] = useTransition()
  const [dragging, setDragging] = useState<string | null>(null)
  const [board, setBoard] = useOptimistic(tasks, (state, c: { id: string; status: TaskStatus }) =>
    state.map((t) => (t.id === c.id ? { ...t, status: c.status } : t))
  )

  function move(t: TaskRow, status: TaskStatus) {
    if (t.status === status) return
    start(async () => {
      setBoard({ id: t.id, status })
      const result = await setTaskStatus(t.id, status)
      if (!result.ok) toast.error(result.message)
    })
  }

  return (
    <Tabs defaultValue="list">
      <TabsList>
        <TabsTrigger value="list">List</TabsTrigger>
        <TabsTrigger value="board">Board</TabsTrigger>
      </TabsList>

      <TabsContent value="list" className="mt-4">
        <TaskList
          tasks={tasks}
          canEdit={canEdit}
          assignees={assignees}
          userId={userId}
          isAdmin={isAdmin}
          empty="No tasks yet. Break the work into the first few things someone will do."
        />
      </TabsContent>

      <TabsContent value="board" className="mt-4">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {TASK_STATUSES.map((status) => {
            const inColumn = board.filter((t) => t.status === status)
            return (
              <section
                key={status}
                aria-label={TASK_STATUS[status].label}
                onDragOver={(e) => canEdit && e.preventDefault()}
                onDrop={() => {
                  const t = board.find((x) => x.id === dragging)
                  setDragging(null)
                  if (t) move(t, status)
                }}
                className="bg-muted/60 flex w-64 shrink-0 flex-col gap-2 rounded-xl p-2"
              >
                <h3 className="flex items-center justify-between px-1 py-1 text-sm font-semibold">
                  {TASK_STATUS[status].label}
                  <span className="text-muted-foreground text-xs font-normal">{inColumn.length}</span>
                </h3>
                {inColumn.map((t) => (
                  <article
                    key={t.id}
                    draggable={canEdit}
                    onDragStart={() => setDragging(t.id)}
                    onDragEnd={() => setDragging(null)}
                    className={cn(
                      "bg-card rounded-lg border p-3 shadow-xs transition-transform duration-200",
                      canEdit && "cursor-grab active:cursor-grabbing",
                      dragging === t.id && "rotate-1 opacity-50"
                    )}
                  >
                    <p className="text-sm leading-snug font-medium">{t.title}</p>
                    <div className="text-muted-foreground mt-2 flex items-center gap-2 text-[11px]">
                      <span
                        title={t.assignee?.full_name}
                        className="bg-fill-strong text-foreground grid size-5 place-items-center rounded-full text-[9px] font-semibold"
                      >
                        {initials(t.assignee?.full_name)}
                      </span>
                      {t.priority === "high" && <span className="text-warn font-medium">High</span>}
                      {t.dueInDays !== null && t.status !== "done" && (
                        <span className={cn("flex items-center gap-1", t.dueInDays < 0 && "text-warn font-medium")}>
                          <CalendarClock className="size-3" />
                          {t.dueInDays < 0 ? `${Math.abs(t.dueInDays)}d late` : t.dueInDays === 0 ? "today" : `${t.dueInDays}d`}
                        </span>
                      )}
                      {canEdit && (
                        <span className="ml-auto">
                          <StatusPill status={t.status} onChange={(s) => move(t, s)} />
                        </span>
                      )}
                    </div>
                  </article>
                ))}
                {inColumn.length === 0 && (
                  <p className="text-muted-foreground px-2 py-4 text-center text-xs">
                    {canEdit ? "Drag a task here" : "Nothing here"}
                  </p>
                )}
              </section>
            )
          })}
        </div>
      </TabsContent>
    </Tabs>
  )
}
