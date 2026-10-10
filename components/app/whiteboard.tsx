"use client"

import { useRef, useState, useTransition } from "react"
import { Eraser, Loader2, Pen, Trash2, Undo2 } from "lucide-react"
import { toast } from "sonner"

import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { saveBoard } from "@/lib/data/actions"
import { BOARD_H, BOARD_W, INK_COLOUR, STROKE_WIDTH, strokePath, type Ink, type Stroke } from "@/lib/notes/drawing"
import type { Note } from "@/lib/data/types"

/** A board drawn as lines, so it stays sharp at any size and follows the theme. */
export function BoardPicture({ drawing, className }: { drawing: Stroke[]; className?: string }) {
  return (
    <svg viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} className={cn("bg-card block h-auto w-full", className)} aria-hidden="true">
      {drawing.map((s, i) => (
        <path
          key={i}
          d={strokePath(s.p)}
          fill="none"
          stroke={INK_COLOUR[s.c]}
          strokeWidth={STROKE_WIDTH[s.w]}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}

type Tool = { c: Ink; w: Stroke["w"] }

const clamp = (v: number) => Math.min(1, Math.max(0, v))
const round = (v: number) => Math.round(v * 1000) / 1000

/**
 * Draw with a mouse, a finger or a pen. Ink or maroon, thin or thick, an
 * eraser, undo and clear. Saved privately to your notebook.
 */
export function WhiteboardEditor({ note, onClose, onSaved }: { note?: Note; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(note?.title ?? "")
  const [caption, setCaption] = useState(note?.body ?? "")
  const [strokes, setStrokes] = useState<Stroke[]>(note?.drawing ?? [])
  const [past, setPast] = useState<Stroke[][]>([])
  const [tool, setTool] = useState<Tool>({ c: "ink", w: 1 })
  const [live, setLive] = useState<Stroke | null>(null)
  const [dirty, setDirty] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [pending, start] = useTransition()

  const surface = useRef<SVGSVGElement>(null)
  const drawingNow = useRef<Stroke | null>(null)

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
    if (e.button !== 0 && e.pointerType === "mouse") return
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
    if (dirty && !leaving) setLeaving(true)
    else onClose()
  }

  const save = () =>
    start(async () => {
      const r = await saveBoard({ id: note?.id, title, caption, drawing: strokes })
      if (r.ok) {
        toast.success(r.message)
        onSaved()
        onClose()
      } else toast.error(r.message)
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
          <DialogTitle>{note ? "Whiteboard" : "New whiteboard"}</DialogTitle>
          <DialogDescription>Draw with a mouse, a finger or a pen. Only you can see it.</DialogDescription>
        </DialogHeader>

        <Label htmlFor="board-title" className="sr-only">
          Title
        </Label>
        <Input id="board-title" value={title} onChange={(e) => {
            setTitle(e.target.value)
            setDirty(true)
          }} placeholder="Title (optional)" maxLength={120} />

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

        <div className="mx-auto w-full" style={{ maxWidth: "calc(58svh * 4 / 3)" }}>
          <svg
            ref={surface}
            viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
            className="bg-card block h-auto w-full cursor-crosshair touch-none rounded-lg border select-none"
            role="img"
            aria-label="Whiteboard. Draw here with a mouse, a finger or a pen. Add a caption below to describe it in words."
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
          >
            {[...strokes, ...(live ? [live] : [])].map((s, i) => (
              <path
                key={i}
                d={strokePath(s.p)}
                fill="none"
                stroke={INK_COLOUR[s.c]}
                strokeWidth={STROKE_WIDTH[s.w]}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </svg>
        </div>

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

        {leaving ? (
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
