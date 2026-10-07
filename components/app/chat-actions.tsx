"use client"

import { useState } from "react"
import { ClipboardList, Flag, Loader2, Lock, MoreHorizontal, NotebookPen } from "lucide-react"
import { toast } from "sonner"

import { RaiseFlag } from "@/components/app/flags"
import { Button } from "@/components/ui/button"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { TaskCard } from "@/lib/crypto/e2ee"
import { createTask, loadChatRecordOptions, logActivity } from "@/lib/data/actions"

type Choice = { value: string; label: string }
type Options = Awaited<ReturnType<typeof loadChatRecordOptions>>

export type ChatMessageRef = {
  text: string
  senderId: string
  senderName: string
  mine: boolean
  at: string
}

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" })

/**
 * The "…" on a message: turn it into a task, save it to a record, or raise a
 * private flag. Each one leaves the encryption only because a person chose it,
 * and each form says so before anything is saved. Nobody is assigned or
 * flagged by the chat on its own.
 */
export function MessageActions({
  message,
  chatName,
  me,
  people,
  onTaskMade,
}: {
  message: ChatMessageRef
  chatName: string
  me: { id: string; name: string }
  /** Everyone else in the workspace. */
  people: { id: string; name: string }[]
  /** Posts the task card back into this chat. */
  onTaskMade: (card: TaskCard) => Promise<void>
}) {
  const [open, setOpen] = useState<null | "task" | "record" | "flag">(null)
  const [options, setOptions] = useState<Options | null>(null)

  const load = async () => {
    if (options) return
    try {
      setOptions(await loadChatRecordOptions())
    } catch {
      toast.error("Your projects and records could not be loaded. Try again.")
    }
  }

  const start = (what: "task" | "record" | "flag") => {
    void load()
    setOpen(what)
  }

  const everyone: Choice[] = [{ value: me.id, label: `${me.name} (you)` }, ...people.map((p) => ({ value: p.id, label: p.name }))]

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="text-muted-foreground shrink-0" aria-label="Do something with this message">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => start("task")}>
            <ClipboardList /> Make a task
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => start("record")}>
            <NotebookPen /> Save to a record
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => start("flag")}>
            <Flag /> Raise a private flag
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TaskFromMessage
        open={open === "task"}
        onOpenChange={(o) => setOpen(o ? "task" : null)}
        message={message}
        everyone={everyone}
        projects={options?.projects}
        defaultAssignee={message.mine ? undefined : message.senderId}
        onTaskMade={onTaskMade}
      />
      <SaveToRecord
        open={open === "record"}
        onOpenChange={(o) => setOpen(o ? "record" : null)}
        message={message}
        chatName={chatName}
        options={options}
      />
      {open === "flag" && (
        <RaiseFlag
          open
          onOpenChange={(o) => setOpen(o ? "flag" : null)}
          people={people.map((p) => ({ value: p.id, label: p.name }))}
          projects={options?.projects ?? []}
          aboutUserId={message.mine ? undefined : message.senderId}
          situation={`In the ${chatName} chat, ${day(message.at)}`}
          quote={message.text.slice(0, 900)}
        />
      )}
    </>
  )
}

function Leaves({ children }: { children: React.ReactNode }) {
  return (
    <p className="bg-accent text-accent-foreground flex items-start gap-2 rounded-lg px-3 py-2 text-xs">
      <Lock className="mt-0.5 size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

function TaskFromMessage({
  open,
  onOpenChange,
  message,
  everyone,
  projects,
  defaultAssignee,
  onTaskMade,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  message: ChatMessageRef
  everyone: Choice[]
  projects?: Choice[]
  defaultAssignee?: string
  onTaskMade: (card: TaskCard) => Promise<void>
}) {
  const [assignee, setAssignee] = useState<string>("")
  const [project, setProject] = useState("none")
  const [pending, setPending] = useState(false)
  const chosen = assignee || defaultAssignee || everyone[0].value

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (o) {
          setAssignee("")
          setProject("none")
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            fd.set("assignee_id", chosen)
            fd.set("project_id", project === "none" ? "" : project)
            setPending(true)
            try {
              const r = await createTask(fd)
              if (!r.ok || !r.id) {
                toast.error(r.message)
                return
              }
              const name = everyone.find((p) => p.value === chosen)?.label.replace(" (you)", "") ?? "someone"
              const href = project !== "none" ? `/projects/${project}` : `/team/${chosen}`
              try {
                await onTaskMade({ kind: "task", taskId: r.id, title: String(fd.get("title")), assignee: name, href })
                toast.success(r.message)
              } catch {
                toast.error("The task was made, but its card could not be posted in the chat.")
              }
              onOpenChange(false)
            } catch {
              toast.error("The task could not be made. Try again.")
            } finally {
              setPending(false)
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Make a task from this message</DialogTitle>
            <DialogDescription>
              You choose who it is for. The chat never assigns anyone on its own.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cm-task-title">What needs doing</Label>
              <Textarea id="cm-task-title" name="title" rows={2} required maxLength={200} defaultValue={message.text.slice(0, 200)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cm-task-for">For</Label>
                <Select value={chosen} onValueChange={setAssignee}>
                  <SelectTrigger id="cm-task-for">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {everyone.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cm-task-due">Due</Label>
                <Input id="cm-task-due" name="due_at" type="date" className="h-10" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cm-task-project">Project</Label>
              <Select value={project} onValueChange={setProject}>
                <SelectTrigger id="cm-task-project">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {(projects ?? []).map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Leaves>
              The task is saved with your workspace&rsquo;s tasks, outside the encryption, where the people who can see tasks
              can read it. Only the words in this form leave the chat. A small card linking to it is posted here.
            </Leaves>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Make task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const KINDS = [
  { value: "organisation_id", label: "An organisation", list: "organisations" },
  { value: "contact_id", label: "A person", list: "contacts" },
  { value: "deal_id", label: "A deal", list: "deals" },
] as const

function SaveToRecord({
  open,
  onOpenChange,
  message,
  chatName,
  options,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  message: ChatMessageRef
  chatName: string
  options: Options | null
}) {
  const [kind, setKind] = useState<(typeof KINDS)[number]["value"]>("organisation_id")
  const [record, setRecord] = useState("")
  const [pending, setPending] = useState(false)
  const list = options ? options[KINDS.find((k) => k.value === kind)!.list] : []

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (o) setRecord("")
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (!record) {
              toast.error("Choose the record to save it on")
              return
            }
            const fd = new FormData(e.currentTarget)
            fd.set(kind, record)
            fd.set("type", "note")
            setPending(true)
            try {
              const r = await logActivity(fd)
              if (r.ok) {
                toast.success("Saved on the record's timeline")
                onOpenChange(false)
              } else toast.error(r.message)
            } catch {
              toast.error("That could not be saved. Try again.")
            } finally {
              setPending(false)
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Save this message to a record</DialogTitle>
            <DialogDescription>Pin it to an organisation, a person or a deal, so it is part of their history.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cm-rec-kind">Save on</Label>
                <Select
                  value={kind}
                  onValueChange={(v) => {
                    setKind(v as typeof kind)
                    setRecord("")
                  }}
                >
                  <SelectTrigger id="cm-rec-kind">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KINDS.map((k) => (
                      <SelectItem key={k.value} value={k.value}>
                        {k.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cm-rec-which">Which one</Label>
                <Select value={record} onValueChange={setRecord}>
                  <SelectTrigger id="cm-rec-which">
                    <SelectValue placeholder={options ? "Choose" : "Loading…"} />
                  </SelectTrigger>
                  <SelectContent>
                    {list.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cm-rec-text">The note</Label>
              <Textarea
                id="cm-rec-text"
                name="summary"
                rows={3}
                required
                maxLength={600}
                defaultValue={`From the ${chatName} chat: ${message.text}`.slice(0, 600)}
              />
            </div>
            <Leaves>
              The note goes on the record&rsquo;s timeline, outside the encryption, where everyone in the workspace can read it.
              Edit out anything that should stay in the chat.
            </Leaves>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Save note
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
