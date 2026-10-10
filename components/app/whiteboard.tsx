"use client"

import { useRef, useState, useTransition } from "react"
import { Eraser, Loader2, Pen, Trash2, Undo2 } from "lucide-react"
import { toast } from "sonner"

import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { saveBoard, type ShareChoice } from "@/lib/data/actions"
import { BOARD_H, BOARD_W, INK_COLOUR, STROKE_WIDTH, strokePath, type Ink, type Stroke } from "@/lib/notes/drawing"
import type { Note } from "@/lib/data/types"

export type Choice = { value: string; label: string }

/** A board drawn as lines, so it stays sharp at any size and follows the theme. */
export function BoardPicture({ drawing, className }: { drawing: Stroke[]; className?: string }) {
  return (
    <svg viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} className={cn("bg-card block h-auto w-full", className)} aria-hidden="true">
      {drawing.map((s, i) => (
        <path key={i} d={strokePath(s.p)} fill="none" stroke={INK_COLOUR[s.c]} strokeWidth={STROKE_WIDTH[s.w]} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  )
}

/** "Only me", "Everyone in Kilima Labs" or a project, as one select value. */
export function ShareSelect({
  id,
  value,
  onChange,
  workspaceName,
  projects,
}: {
  id: string
  value: ShareChoice
  onChange: (v: ShareChoice) => void
  workspaceName: string
  projects: Choice[]
}) {
  const current = value.to === "project" ? `project:${value.projectId}` : value.to
  return (
    <Select
      value={current}
      onValueChange={(v) => onChange(v.startsWith("project:") ? { to: "project", projectId: v.slice(8) } : { to: v as "me" | "workspace" })}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="me">Only me</SelectItem>
        <SelectItem value="workspace">Everyone in {workspaceName}</SelectItem>
        {projects.map((p) => (
          <SelectItem key={p.value} value={`project:${p.value}`}>
            Project: {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

type Tool = { c: Ink; w: Stroke["w"] }

const clamp = (v: number) => Math.min(1, Math.max(0, v))
const round = (v: number) => Math.round(v * 1000) / 1000
const same = (a: Stroke[], b: Stroke[]) => JSON.stringify(a) === JSON.stringify(b)

/**
 * Draw with a mouse, a finger or a pen. Ink or maroon, thin or thick, an
 * eraser, undo and clear. A shared board can be drawn on by others: if someone
 * saved while you were drawing, your new lines are added on top of theirs.
 */
export function WhiteboardEditor({
  note,
  readOnly = false,
  workspaceName,
  projects,
  defaultShare = { to: "me" },
  onClose,
  onSaved,
}: {
  note?: Note
  readOnly?: boolean
  workspaceName: string
  projects: Choice[]
  defaultShare?: ShareChoice
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(note?.title ?? "")
  const [caption, setCaption] = useState(note?.body ?? "")
  const [strokes, setStrokes] = useState<Stroke[]>(note?.drawing ?? [])
  const [share, setShare] = useState<ShareChoice>(defaultShare)
  const [past, setPast] = useState<Stroke[][]>([])
  const [tool, setTool] = useState<Tool>({ c: "ink", w: 1 })
  const [live, setLive] = useState<Stroke | null>(null)
  const [dirty, setDirty] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [clash, setClash] = useState<{ drawing: Stroke[]; updatedAt: string } | null>(null)
  const [pending, start] = useTransition()

  const surface = useRef<SVGSVGElement>(null)
  const drawingNow = useRef<Stroke | null>(null)
  // The version this editor started from, so a save never overwrites someone else's lines.
  const base = useRef<Stroke[]>(note?.drawing ?? [])
  const baseAt = useRef<string | undefined>(note?.updated_at)

  const change = (next: Stroke[]) => {
    setPast((p) => [...p.slice(-49), strokes])
    setStrokes(next)
    setDirty(true)
  }

  const at = (e: React.PointerEvent) => {
    const r = surface.current!.getBoundingClientRect()
    return [round(clamp((e.clientX - r.left) / r.width)), round(clamp((e.clientY - r.top) / r.height))]
  }

  const down = (e: React.PointerEvent<SVGSVGElement>) => {
    if (readOnly || (e.button !== 0 && e.pointerType === "mouse")) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const s: Stroke = { c: tool.c, w: tool.c === "erase" ? 3 : tool.w, p: at(e) }
    drawingNow.current = s
    setLive({ ...s })
  }

  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    const s = drawingNow.current
    if (!s) return
    const [x, y] = at(e)
    const lx = s.p[s.p.length - 2]
    const ly = s.p[s.p.length - 1]
    // Skip points too close together: smoother lines, smaller boards.
    if (Math.hypot(x - lx, y - ly) < 0.003 || s.p.length >= 8000) return
    s.p.push(x, y)
    setLive({ ...s, p: [...s.p] })
  }

  const up = () => {
    const s = drawingNow.current
    drawingNow.current = null
    setLive(null)
    if (s) change([...strokes, s])
  }

  const undo = () => {
    if (past.length === 0) return
    setStrokes(past[past.length - 1])
    setPast((p) => p.slice(0, -1))
    setDirty(true)
  }

  const close = () => {
    if (dirty && !leaving && !readOnly) setLeaving(true)
    else onClose()
  }

  const finish = (message: string) => {
    toast.success(message)
    onSaved()
    onClose()
  }

  const save = () =>
    start(async () => {
      let drawing = strokes
      let r = await saveBoard({ id: note?.id, title, caption, drawing, share: note ? undefined : share, baseUpdatedAt: baseAt.current })
      // Someone else saved meanwhile. If all you did was add lines, put them on top of theirs.
      if (!r.ok && r.conflict && same(strokes.slice(0, base.current.length), base.current)) {
        drawing = [...r.conflict.drawing, ...strokes.slice(base.current.length)]
        base.current = r.conflict.drawing
        baseAt.current = r.conflict.updatedAt
        setStrokes(drawing)
        r = await saveBoard({ id: note?.id, title, caption, drawing, baseUpdatedAt: baseAt.current })
        if (r.ok) return finish("Saved. Your lines were added to the latest version.")
      }
      if (r.ok) return finish(r.message)
      if (r.conflict) setClash(r.conflict)
      else toast.error(r.message)
    })

  const loadTheirs = () => {
    if (!clash) return
    base.current = clash.drawing
    baseAt.current = clash.updatedAt
    setStrokes(clash.drawing)
    setPast([])
    setDirty(false)
    setClash(null)
  }

  const saveCopy = () =>
    start(async () => {
      const r = await saveBoard({ title: `${title || "Whiteboard"} (my copy)`.slice(0, 120), caption, drawing: strokes })
      if (r.ok) finish("Saved as your own copy, only you can see it")
      else toast.error(r.message)
    })

  const toolButton = (label: string, active: boolean, onClick: () => void, children: React.ReactNode) => (
    <Button type="button" variant={active ? "secondary" : "ghost"} size="icon" aria-label={label} aria-pressed={active} title={label} onClick={onClick}>
      {children}
    </Button>
  )

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[95svh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{readOnly ? note?.title || "Whiteboard" : note ? "Whiteboard" : "New whiteboard"}</DialogTitle>
          <DialogDescription>
            {readOnly
              ? "You can look at this whiteboard, but not draw on it."
              : note
                ? "Draw with a mouse, a finger or a pen."
                : "Draw with a mouse, a finger or a pen. Choose who can see it."}
          </DialogDescription>
        </DialogHeader>

        {!readOnly && (
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label htmlFor="board-title" className="sr-only">
                Title
              </Label>
              <Input
                id="board-title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  setDirty(true)
                }}
                placeholder="Title (optional)"
                maxLength={120}
              />
            </div>
            {!note && (
              <div>
                <Label htmlFor="board-share" className="sr-only">
                  Who can see it
                </Label>
                <ShareSelect id="board-share" value={share} onChange={setShare} workspaceName={workspaceName} projects={projects} />
              </div>
            )}
          </div>
        )}

        {!readOnly && (
          <div className="flex flex-wrap items-center gap-1" role="toolbar" aria-label="Drawing tools">
            {toolButton("Pen in ink", tool.c === "ink", () => setTool({ ...tool, c: "ink" }), <span className="bg-foreground size-4 rounded-full" />)}
            {toolButton("Pen in maroon", tool.c === "primary", () => setTool({ ...tool, c: "primary" }), <span className="bg-primary size-4 rounded-full" />)}
            {toolButton("Eraser", tool.c === "erase", () => setTool({ ...tool, c: "erase" }), <Eraser />)}
            <span className="bg-border mx-1 h-6 w-px" aria-hidden="true" />
            {toolButton("Thin line", tool.w === 1 && tool.c !== "erase", () => setTool({ c: tool.c === "erase" ? "ink" : tool.c, w: 1 }), <Pen className="size-3.5" />)}
            {toolButton("Thick line", tool.w === 2 && tool.c !== "erase", () => setTool({ c: tool.c === "erase" ? "ink" : tool.c, w: 2 }), <Pen className="size-5" />)}
            <span className="flex-1" />
            <Button type="button" variant="ghost" size="sm" onClick={undo} disabled={past.length === 0}>
              <Undo2 /> Undo
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => change([])} disabled={strokes.length === 0}>
              <Trash2 /> Clear
            </Button>
          </div>
        )}

        <div className="mx-auto w-full" style={{ maxWidth: "calc(58svh * 4 / 3)" }}>
          <svg
            ref={surface}
            viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
            className={cn("bg-card block h-auto w-full rounded-lg border select-none", !readOnly && "cursor-crosshair touch-none")}
            role="img"
            aria-label={
              readOnly
                ? `Whiteboard${note?.title ? `: ${note.title}` : ""}. ${note?.body || "No caption."}`
                : "Whiteboard. Draw here with a mouse, a finger or a pen. Add a caption below to describe it in words."
            }
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
          >
            {[...strokes, ...(live ? [live] : [])].map((s, i) => (
              <path key={i} d={strokePath(s.p)} fill="none" stroke={INK_COLOUR[s.c]} strokeWidth={STROKE_WIDTH[s.w]} strokeLinecap="round" strokeLinejoin="round" />
            ))}
          </svg>
        </div>

        {readOnly ? (
          note?.body && <p className="text-muted-foreground text-sm whitespace-pre-wrap">{note.body}</p>
        ) : (
          <>
            <Label htmlFor="board-caption" className="sr-only">
              Caption
            </Label>
            <Textarea
              id="board-caption"
              value={caption}
              onChange={(e) => {
                setCaption(e.target.value)
                setDirty(true)
              }}
              placeholder="A caption, if it helps (optional)"
              rows={2}
              maxLength={10000}
            />
          </>
        )}

        {clash ? (
          <div className="bg-muted flex flex-col gap-2 rounded-lg px-3 py-2" role="alert">
            <span className="text-sm">
              Someone else changed this whiteboard while you were drawing, and you also removed lines, so the two cannot be joined.
              Nothing was saved yet.
            </span>
            <span className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={loadTheirs}>
                Load their version
              </Button>
              <Button size="sm" onClick={saveCopy} disabled={pending}>
                Save mine as a copy
              </Button>
            </span>
          </div>
        ) : leaving ? (
          <div className="bg-muted flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2" role="alert">
            <span className="text-sm">Leave without saving? The drawing will be lost.</span>
            <span className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setLeaving(false)}>
                Keep drawing
              </Button>
              <Button variant="destructive" size="sm" onClick={onClose}>
                Leave
              </Button>
            </span>
          </div>
        ) : readOnly ? (
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        ) : (
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button onClick={save} disabled={pending || (!note && strokes.length === 0 && !title.trim() && !caption.trim())}>
              {pending && <Loader2 className="animate-spin" />} Save whiteboard
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
