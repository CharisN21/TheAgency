"use client"

import { createContext, useContext, useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ClipboardList, Loader2, NotebookPen, PenLine } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { captureNote, createTask } from "@/lib/data/actions"

const CaptureContext = createContext<{ open: () => void } | null>(null)

/** The pencil in the top bar. Opens Quick Capture; Alt N does the same from anywhere. */
export function CaptureButton() {
  const capture = useContext(CaptureContext)
  if (!capture) return null
  return (
    <Button variant="ghost" size="icon" aria-label="Quick capture" title="Quick capture (Alt N)" onClick={capture.open}>
      <PenLine />
    </Button>
  )
}

/**
 * Get a thought down in two seconds: type, press Ctrl Enter. It goes to your
 * private notebook, or becomes a task for you. Nothing else to fill in.
 */
export function QuickCaptureProvider({ canEdit, children }: { canEdit: boolean; children: React.ReactNode }) {
  const router = useRouter()
  const [isOpen, setOpen] = useState(false)
  const [text, setText] = useState("")
  const [pending, start] = useTransition()

  // Alt N opens it from anywhere, unless someone is mid-sentence in another box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === "n") {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  function keep() {
    start(async () => {
      const r = await captureNote(text)
      if (r.ok) {
        setText("")
        setOpen(false)
        toast.success(r.message, {
          action: {
            label: "Open notebook",
            onClick: () => router.push("/notebook"),
          },
        })
        router.refresh()
      } else toast.error(r.message)
    })
  }

  function makeTask() {
    start(async () => {
      const fd = new FormData()
      fd.set("title", text.split("\n")[0].trim().slice(0, 200))
      const r = await createTask(fd)
      if (r.ok) {
        setText("")
        setOpen(false)
        toast.success(r.message)
        router.refresh()
      } else toast.error(r.message)
    })
  }

  const empty = text.trim().length === 0

  return (
    <CaptureContext.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Quick capture</DialogTitle>
            <DialogDescription>
              Kept in your private notebook: only you can see it. Or make it a task for yourself.
            </DialogDescription>
          </DialogHeader>
          <Label htmlFor="quick-capture" className="sr-only">
            What is on your mind
          </Label>
          <Textarea
            id="quick-capture"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !empty) {
                e.preventDefault()
                keep()
              }
            }}
            placeholder="What is on your mind?"
            rows={5}
            maxLength={10000}
            autoFocus
          />
          <DialogFooter className="items-center sm:justify-between">
            <Link href="/notebook" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4">
              Open notebook
            </Link>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              {canEdit && (
                <Button variant="outline" disabled={pending || empty} onClick={makeTask}>
                  <ClipboardList /> Save as a task
                </Button>
              )}
              <Button disabled={pending || empty} onClick={keep}>
                {pending ? <Loader2 className="animate-spin" /> : <NotebookPen />} Keep note
              </Button>
            </div>
          </DialogFooter>
          <p className="text-muted-foreground text-xs">Ctrl Enter keeps it as a note.</p>
        </DialogContent>
      </Dialog>
    </CaptureContext.Provider>
  )
}
