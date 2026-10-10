"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  ClipboardList,
  FilePlus2,
  FolderKanban,
  Loader2,
  Lock,
  MoreHorizontal,
  NotebookPen,
  Pencil,
  PenTool,
  Pin,
  PinOff,
  Search,
  Share2,
  Trash2,
  Users,
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
  shareNote,
  updateNote,
  type ShareChoice,
} from "@/lib/data/actions"
import type { NoteRow } from "@/lib/data/queries"
import type { Note } from "@/lib/data/types"
import { BoardPicture, ShareSelect, WhiteboardEditor, type Choice } from "@/components/app/whiteboard"

type Options = Awaited<ReturnType<typeof loadChatRecordOptions>>

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

const firstLine = (text: string, max: number) => text.split("\n")[0].trim().slice(0, max)

const isBoard = (n: Note) => n.kind === "board"

/** Where the notebook and project pages share what they know about the workspace. */
type Place = { canEdit: boolean; workspaceName: string; projects: Choice[] }

/** Who can see it, in words, with an icon. Never colour alone. */
function Audience({ note, workspaceName }: { note: NoteRow; workspaceName: string }) {
  if (note.audience === "workspace")
    return (
      <span className="inline-flex items-center gap-1">
        <Users className="size-3" aria-hidden="true" /> Everyone in {workspaceName}
      </span>
    )
  if (note.audience === "project")
    return (
      <span className="inline-flex items-center gap-1">
        <FolderKanban className="size-3" aria-hidden="true" /> Project: {note.projectName}
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1">
      <Lock className="size-3" aria-hidden="true" /> Only you
    </span>
  )
}

/** The whole notebook: write a note or start a whiteboard, search, yours and shared with you. */
export function Notebook({ mine, shared, ...place }: { mine: NoteRow[]; shared: NoteRow[] } & Place) {
  const router = useRouter()
  const [text, setText] = useState("")
  const [title, setTitle] = useState("")
  const [find, setFind] = useState("")
  const [newBoard, setNewBoard] = useState(false)
  const [pending, start] = useTransition()

  const match = (rows: NoteRow[]) => {
    const q = find.trim().toLowerCase()
    return q ? rows.filter((n) => `${n.title ?? ""}\n${n.body}`.toLowerCase().includes(q)) : rows
  }
  const yours = useMemo(() => match(mine), [mine, find]) // eslint-disable-line react-hooks/exhaustive-deps
  const theirs = useMemo(() => match(shared), [shared, find]) // eslint-disable-line react-hooks/exhaustive-deps
  const total = mine.length + shared.length

  function save() {
    start(async () => {
      const r = await captureNote(text, title)
      if (r.ok) {
        setText("")
        setTitle("")
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
        <Label htmlFor="new-note-title" className="sr-only">
          Title
        </Label>
        <Input id="new-note-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" maxLength={120} autoComplete="off" />
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
          placeholder="Write a note. Only you will see it, unless you share it."
          maxLength={10000}
          rows={3}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-muted-foreground hidden text-xs sm:inline">Ctrl Enter to keep</span>
          <div className="flex flex-1 justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setNewBoard(true)}>
              <PenTool /> New whiteboard
            </Button>
            <Button type="submit" disabled={pending || text.trim().length === 0}>
              {pending ? <Loader2 className="animate-spin" /> : <FilePlus2 />} Keep note
            </Button>
          </div>
        </div>
      </form>

      {total > 0 && (
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Label htmlFor="find-note" className="sr-only">
            Search your notes and whiteboards
          </Label>
          <Input
            id="find-note"
            type="search"
            value={find}
            onChange={(e) => setFind(e.target.value)}
            placeholder="Search notes and whiteboards"
            autoComplete="off"
            className="pl-9"
          />
        </div>
      )}

      {total === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
          <NotebookPen className="text-ink-3 size-8" />
          <h3 className="font-semibold">Nothing kept yet</h3>
          <p className="text-muted-foreground max-w-sm text-sm">
            Jot down a thought, a number or a reminder, or open a whiteboard and sketch it. Press Alt N from anywhere in the app to
            capture a note in two seconds.
          </p>
        </div>
      ) : (
        <>
          <section aria-labelledby="yours-heading" className="flex flex-col gap-3">
            <h3 id="yours-heading" className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Yours
            </h3>
            {mine.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nothing of yours yet.</p>
            ) : (
              <NoteCards notes={yours} {...place} emptyMatch={find} />
            )}
          </section>
          {shared.length > 0 && (
            <section aria-labelledby="shared-heading" className="flex flex-col gap-3">
              <h3 id="shared-heading" className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Shared with you
              </h3>
              <NoteCards notes={theirs} {...place} emptyMatch={find} />
            </section>
          )}
        </>
      )}

      {newBoard && <WhiteboardEditor {...place} onClose={() => setNewBoard(false)} onSaved={() => router.refresh()} />}
    </div>
  )
}

/** A project's whiteboards and notes, on its page. New boards here are shared with the project. */
export function ProjectNotes({
  notes,
  projectId,
  projectName,
  ...place
}: { notes: NoteRow[]; projectId: string; projectName: string } & Place) {
  const router = useRouter()
  const [newBoard, setNewBoard] = useState(false)
  return (
    <div className="flex flex-col gap-3">
      {notes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center">
          <PenTool className="text-ink-3 size-8" />
          <h3 className="font-semibold">No whiteboards yet</h3>
          <p className="text-muted-foreground max-w-sm text-sm">
            Sketch a plan for {projectName} together. Everyone here can look; the project&rsquo;s team can draw. Notes from anyone&rsquo;s
            notebook can be shared here too.
          </p>
          {place.canEdit && (
            <Button variant="outline" onClick={() => setNewBoard(true)}>
              <PenTool /> New whiteboard
            </Button>
          )}
        </div>
      ) : (
        <>
          {place.canEdit && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setNewBoard(true)}>
                <PenTool /> New whiteboard
              </Button>
            </div>
          )}
          <NoteCards notes={notes} {...place} />
        </>
      )}
      {newBoard && (
        <WhiteboardEditor
          {...place}
          defaultShare={{ to: "project", projectId }}
          onClose={() => setNewBoard(false)}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  )
}

/** A list of notes and whiteboards, each with what this person may do to it. */
function NoteCards({ notes, emptyMatch, ...place }: { notes: NoteRow[]; emptyMatch?: string } & Place) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [editing, setEditing] = useState<NoteRow | null>(null)
  const [tasking, setTasking] = useState<NoteRow | null>(null)
  const [posting, setPosting] = useState<NoteRow | null>(null)
  const [sharing, setSharing] = useState<NoteRow | null>(null)
  const [deleting, setDeleting] = useState<NoteRow | null>(null)
  const [board, setBoard] = useState<NoteRow | null>(null)

  if (notes.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center text-sm" role="status">
        Nothing matches &ldquo;{emptyMatch?.trim()}&rdquo;.
      </p>
    )
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {notes.map((n) => (
          <li key={n.id} className="bg-card rounded-xl border p-4">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                {(n.title || isBoard(n)) && <h4 className="mb-1 font-semibold break-words">{n.title || "Whiteboard"}</h4>}
                {isBoard(n) && (
                  <button
                    type="button"
                    onClick={() => setBoard(n)}
                    className="focus-visible:ring-ring mb-2 block w-full max-w-md overflow-hidden rounded-lg border focus-visible:ring-2 focus-visible:outline-none"
                    aria-label={`${n.canDraw ? "Open" : "Look at"} the whiteboard${n.title ? ` ${n.title}` : ""}`}
                  >
                    <BoardPicture drawing={n.drawing ?? []} />
                  </button>
                )}
                {n.body && (
                  <p
                    className={
                      isBoard(n)
                        ? "text-muted-foreground text-sm break-words whitespace-pre-wrap"
                        : "text-sm leading-relaxed break-words whitespace-pre-wrap"
                    }
                  >
                    {n.body}
                  </p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="text-muted-foreground shrink-0" aria-label="Do something with this note">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isBoard(n) && (
                    <DropdownMenuItem onSelect={() => setBoard(n)}>
                      <PenTool /> {n.canDraw ? "Open whiteboard" : "Look at whiteboard"}
                    </DropdownMenuItem>
                  )}
                  {n.mine && !isBoard(n) && (
                    <DropdownMenuItem onSelect={() => setEditing(n)}>
                      <Pencil /> Edit
                    </DropdownMenuItem>
                  )}
                  {n.mine && (
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
                  )}
                  {n.mine && (
                    <DropdownMenuItem onSelect={() => setSharing(n)}>
                      <Share2 /> Who can see it
                    </DropdownMenuItem>
                  )}
                  {place.canEdit && (
                    <DropdownMenuItem onSelect={() => setTasking(n)}>
                      <ClipboardList /> Make a task
                    </DropdownMenuItem>
                  )}
                  {place.canEdit && n.mine && !isBoard(n) && (
                    <DropdownMenuItem onSelect={() => setPosting(n)}>
                      <FilePlus2 /> Post to a timeline
                    </DropdownMenuItem>
                  )}
                  {n.mine && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(n)}>
                        <Trash2 /> Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              {n.mine && n.pinned && <Pin className="size-3" aria-label="Pinned" />}
              {!n.mine && <span>By {n.authorName}</span>}
              <Audience note={n} workspaceName={place.workspaceName} />
              <span>
                {when(n.updated_at)}
                {n.updated_at !== n.created_at && " · edited"}
              </span>
            </p>
          </li>
        ))}
      </ul>

      {editing && <EditNote note={editing} onClose={() => setEditing(null)} />}
      {tasking && <NoteToTask note={tasking} onClose={() => setTasking(null)} />}
      {posting && <NoteToTimeline note={posting} onClose={() => setPosting(null)} />}
      {sharing && <ShareNote note={sharing} {...place} onClose={() => setSharing(null)} />}
      {board && (
        <WhiteboardEditor {...place} note={board} readOnly={!board.canDraw} onClose={() => setBoard(null)} onSaved={() => router.refresh()} />
      )}

      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {deleting && isBoard(deleting) ? "whiteboard" : "note"}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.audience !== "me"
                ? "It is gone for good, for everyone it was shared with."
                : "It is gone for good. If you posted it to a timeline, that copy stays there."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
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
    </>
  )
}

function ShareNote({ note, workspaceName, projects, onClose }: { note: NoteRow; onClose: () => void } & Place) {
  const router = useRouter()
  const [share, setShare] = useState<ShareChoice>(
    note.audience === "project" && note.project_id ? { to: "project", projectId: note.project_id } : { to: note.audience === "workspace" ? "workspace" : "me" }
  )
  const [pending, start] = useTransition()
  const board = isBoard(note)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Who can see it</DialogTitle>
          <DialogDescription>
            {board
              ? "Shared whiteboards can be drawn on together: by anyone who can edit, or for a project, by its team."
              : "A shared note can be read by others. Only you can change it."}
          </DialogDescription>
        </DialogHeader>
        <Label htmlFor="share-note">Shared with</Label>
        <ShareSelect id="share-note" value={share} onChange={setShare} workspaceName={workspaceName} projects={projects} />
        <p className="text-muted-foreground text-sm">
          {share.to === "me"
            ? "Only you. Owners and admins cannot see it."
            : share.to === "workspace"
              ? `Everyone in ${workspaceName} can open it.`
              : "It shows on the project page. Everyone here can open it; the project's team can draw on a whiteboard."}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await shareNote(note.id, share)
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

function EditNote({ note, onClose }: { note: Note; onClose: () => void }) {
  const router = useRouter()
  const [text, setText] = useState(note.body)
  const [title, setTitle] = useState(note.title ?? "")
  const [pending, start] = useTransition()
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit note</DialogTitle>
          <DialogDescription>Only you can change this note.</DialogDescription>
        </DialogHeader>
        <Label htmlFor="edit-note-title" className="sr-only">
          Title
        </Label>
        <Input id="edit-note-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" maxLength={120} />
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
                const r = await updateNote(note.id, text, title)
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
  const [title, setTitle] = useState((note.title || firstLine(note.body, 200) || (isBoard(note) ? "Follow up on the whiteboard" : "")).slice(0, 200))
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
