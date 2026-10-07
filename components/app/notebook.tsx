"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ClipboardList, FilePlus2, Loader2, MoreHorizontal, NotebookPen, Pencil, Pin, PinOff, Search, Trash2 } from "lucide-react"
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
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  captureNote,
  createTask,
  deleteNote,
  loadChatRecordOptions,
  logActivity,
  setNotePinned,
  updateNote,
} from "@/lib/data/actions"
import type { Note } from "@/lib/data/types"

type Options = Awaited<ReturnType<typeof loadChatRecordOptions>>

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

const firstLine = (text: string, max: number) => text.split("\n")[0].trim().slice(0, max)

/** The whole notebook: write a note, search, and work with each one. */
export function Notebook({ notes, canEdit }: { notes: Note[]; canEdit: boolean }) {
  const router = useRouter()
  const [text, setText] = useState("")
  const [find, setFind] = useState("")
  const [pending, start] = useTransition()
  const [editing, setEditing] = useState<Note | null>(null)
  const [tasking, setTasking] = useState<Note | null>(null)
  const [posting, setPosting] = useState<Note | null>(null)
  const [deleting, setDeleting] = useState<Note | null>(null)

  const shown = useMemo(() => {
    const q = find.trim().toLowerCase()
    return q ? notes.filter((n) => n.body.toLowerCase().includes(q)) : notes
  }, [notes, find])

  function save() {
    start(async () => {
      const r = await captureNote(text)
      if (r.ok) {
        setText("")
        toast.success(r.message)
        router.refresh()
      } else toast.error(r.message)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <Label htmlFor="new-note" className="sr-only">
          Write a note
        </Label>
        <Textarea
          id="new-note"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault()
              save()
            }
          }}
          placeholder="Write a note. Only you will see it."
          maxLength={10000}
          rows={3}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground text-xs">Ctrl Enter to keep</span>
          <Button type="submit" disabled={pending || text.trim().length === 0}>
            {pending ? <Loader2 className="animate-spin" /> : <FilePlus2 />} Keep note
          </Button>
        </div>
      </form>

      {notes.length > 0 && (
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Label htmlFor="find-note" className="sr-only">
            Search your notes
          </Label>
          <Input
            id="find-note"
            type="search"
            value={find}
            onChange={(e) => setFind(e.target.value)}
            placeholder="Search your notes"
            autoComplete="off"
            className="pl-9"
          />
        </div>
      )}

      {notes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
          <NotebookPen className="text-ink-3 size-8" />
          <h3 className="font-semibold">Nothing kept yet</h3>
          <p className="text-muted-foreground max-w-sm text-sm">
            Jot down a thought, a number or a reminder. Press Alt N from anywhere in the app to capture one in two seconds.
          </p>
        </div>
      ) : shown.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm" role="status">
          No notes match &ldquo;{find.trim()}&rdquo;.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((n) => (
            <li key={n.id} className="bg-card rounded-xl border p-4">
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 text-sm leading-relaxed break-words whitespace-pre-wrap">{n.body}</p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" className="text-muted-foreground shrink-0" aria-label="Do something with this note">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() =>
                        start(async () => {
                          const r = await setNotePinned(n.id, !n.pinned)
                          if (r.ok) router.refresh()
                          else toast.error(r.message)
                        })
                      }
                    >
                      {n.pinned ? <PinOff /> : <Pin />} {n.pinned ? "Unpin" : "Pin to the top"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setEditing(n)}>
                      <Pencil /> Edit
                    </DropdownMenuItem>
                    {canEdit && (
                      <>
                        <DropdownMenuItem onSelect={() => setTasking(n)}>
                          <ClipboardList /> Make a task
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setPosting(n)}>
                          <FilePlus2 /> Post to a timeline
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(n)}>
                      <Trash2 /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
                {n.pinned && <Pin className="size-3" aria-label="Pinned" />}
                {when(n.updated_at)}
                {n.updated_at !== n.created_at && " · edited"}
              </p>
            </li>
          ))}
        </ul>
      )}

      {editing && <EditNote note={editing} onClose={() => setEditing(null)} />}
      {tasking && <NoteToTask note={tasking} onClose={() => setTasking(null)} />}
      {posting && <NoteToTimeline note={posting} onClose={() => setPosting(null)} />}

      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>
              It is gone for good. If you posted it to a timeline, that copy stays there.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                start(async () => {
                  const r = await deleteNote(deleting!.id)
                  setDeleting(null)
                  if (r.ok) {
                    toast.success(r.message)
                    router.refresh()
                  } else toast.error(r.message)
                })
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function EditNote({ note, onClose }: { note: Note; onClose: () => void }) {
  const router = useRouter()
  const [text, setText] = useState(note.body)
  const [pending, start] = useTransition()
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit note</DialogTitle>
          <DialogDescription>Only you can see this note.</DialogDescription>
        </DialogHeader>
        <Label htmlFor="edit-note" className="sr-only">
          Note
        </Label>
        <Textarea id="edit-note" value={text} onChange={(e) => setText(e.target.value)} rows={8} maxLength={10000} autoFocus />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={pending || text.trim().length === 0}
            onClick={() =>
              start(async () => {
                const r = await updateNote(note.id, text)
                if (r.ok) {
                  toast.success(r.message)
                  onClose()
                  router.refresh()
                } else toast.error(r.message)
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function NoteToTask({ note, onClose }: { note: Note; onClose: () => void }) {
  const [title, setTitle] = useState(firstLine(note.body, 200))
  const [pending, start] = useTransition()
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Make a task</DialogTitle>
          <DialogDescription>A task for you, from this note. The note stays in your notebook.</DialogDescription>
        </DialogHeader>
        <Label htmlFor="note-task">What needs doing</Label>
        <Input id="note-task" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} autoFocus />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={pending || title.trim().length < 2}
            onClick={() =>
              start(async () => {
                const fd = new FormData()
                fd.set("title", title.trim())
                const r = await createTask(fd)
                if (r.ok) {
                  toast.success(r.message)
                  onClose()
                } else toast.error(r.message)
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />} Make task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function NoteToTimeline({ note, onClose }: { note: Note; onClose: () => void }) {
  const [options, setOptions] = useState<Options | null>(null)
  const [target, setTarget] = useState("")
  const [pending, start] = useTransition()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    loadChatRecordOptions()
      .then(setOptions)
      .catch(() => setFailed(true))
  }, [])

  const summary = note.body.replace(/\s+/g, " ").trim().slice(0, 500)

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Post to a timeline</DialogTitle>
          <DialogDescription>
            Copies these words onto the record&rsquo;s timeline, where everyone in the workspace can read them. Your note stays private.
          </DialogDescription>
        </DialogHeader>
        <p className="bg-muted text-muted-foreground max-h-28 overflow-y-auto rounded-lg px-3 py-2 text-sm">{summary}</p>
        {failed ? (
          <p className="text-destructive text-sm" role="alert">
            Error: your records could not be loaded. Close this and try again.
          </p>
        ) : (
          <>
            <Label htmlFor="note-record">Post it on</Label>
            <Select value={target} onValueChange={setTarget} disabled={!options}>
              <SelectTrigger id="note-record" className="w-full">
                <SelectValue placeholder={options ? "Choose an organisation, person or deal" : "Loading…"} />
              </SelectTrigger>
              <SelectContent>
                {options && options.organisations.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Organisations</SelectLabel>
                    {options.organisations.map((o) => (
                      <SelectItem key={o.value} value={`organisation_id:${o.value}`}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {options && options.contacts.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>People</SelectLabel>
                    {options.contacts.map((c) => (
                      <SelectItem key={c.value} value={`contact_id:${c.value}`}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {options && options.deals.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Deals</SelectLabel>
                    {options.deals.map((d) => (
                      <SelectItem key={d.value} value={`deal_id:${d.value}`}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          </>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={pending || !target}
            onClick={() =>
              start(async () => {
                const [field, id] = target.split(":")
                const fd = new FormData()
                fd.set("summary", summary)
                fd.set(field, id)
                const r = await logActivity(fd)
                if (r.ok) {
                  toast.success("Posted to the timeline")
                  onClose()
                } else toast.error(r.message)
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />} Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
