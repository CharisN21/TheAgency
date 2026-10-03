"use client"

import { useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"
import { Flag, Loader2, Lock, MessageSquareText, RotateCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { cn } from "cn"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { deleteFlag, logFlagConversation, raiseFlag, reopenFlag } from "@/lib/data/actions"
import { SEVERITY, type FlagSeverity } from "@/lib/data/types"

type Option = { value: string; label: string }

export function SeverityPill({ severity }: { severity: FlagSeverity }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2 text-xs font-medium",
        SEVERITY[severity].tone,
      )}
    >
      {SEVERITY[severity].label}
    </span>
  )
}

/**
 * Raise a private flag. Only the person raising it and owners and admins
 * (never the person it is about) will see it.
 */
export function RaiseFlag({
  people,
  projects,
  aboutUserId,
  projectId,
  variant = "outline",
  open: openProp,
  onOpenChange,
  situation,
  quote,
}: {
  people: Option[]
  projects: Option[]
  aboutUserId?: string
  projectId?: string
  variant?: "outline" | "default" | "ghost"
  /** Opened from elsewhere (a chat message): no button of its own, and it stays put after raising. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** A starting line for the situation, e.g. "In the PPE logistics chat, 3 Oct". */
  situation?: string
  /** Words that can be quoted into "What happened" — only if the person chooses to. */
  quote?: string
}) {
  const router = useRouter()
  const controlled = openProp !== undefined
  const [ownOpen, setOwnOpen] = useState(false)
  const open = controlled ? openProp : ownOpen
  const setOpen = (o: boolean) => (controlled ? onOpenChange?.(o) : setOwnOpen(o))
  const behaviourRef = useRef<HTMLTextAreaElement>(null)
  const [about, setAbout] = useState(aboutUserId ?? "none")
  const [project, setProject] = useState(projectId ?? "none")
  const [severity, setSeverity] = useState<FlagSeverity>("warning")
  const [pending, start] = useTransition()

  function submit(formData: FormData) {
    formData.set("about_user_id", about === "none" ? "" : about)
    formData.set("project_id", project === "none" ? "" : project)
    formData.set("severity", severity)
    start(async () => {
      const result = await raiseFlag(formData)
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      setOpen(false)
      toast.success(result.message)
      if (result.id && !controlled) router.push(`/flags/${result.id}`)
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) {
          setAbout(aboutUserId ?? "none")
          setProject(projectId ?? "none")
          setSeverity("warning")
        }
      }}
    >
      {!controlled && (
        <DialogTrigger asChild>
          <Button variant={variant} size="sm">
            <Flag /> Raise a flag
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit(new FormData(e.currentTarget))
          }}
        >
          <DialogHeader>
            <DialogTitle>Raise a private flag</DialogTitle>
            <DialogDescription className="flex items-start gap-1.5">
              <Lock className="mt-0.5 size-3.5 shrink-0" />
              Only you and owners and admins will see it. Never the person it is about, and never on
              a timeline.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="f-about">About</Label>
                <Select value={about} onValueChange={setAbout}>
                  <SelectTrigger id="f-about">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nobody in particular</SelectItem>
                    {people.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="f-project">Project</Label>
                <Select value={project} onValueChange={setProject}>
                  <SelectTrigger id="f-project">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium">How serious</legend>
              <RadioGroup
                value={severity}
                onValueChange={(v) => setSeverity(v as FlagSeverity)}
                className="grid-cols-1 sm:grid-cols-3"
              >
                {(Object.keys(SEVERITY) as FlagSeverity[]).map((s) => (
                  <Label
                    key={s}
                    htmlFor={`sev-${s}`}
                    className="border-border has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent flex min-h-11 cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 font-normal"
                  >
                    <RadioGroupItem id={`sev-${s}`} value={s} className="mt-0.5" />
                    <span>
                      <span className="block text-sm font-medium">{SEVERITY[s].label}</span>
                      <span className="text-muted-foreground block text-xs">
                        {SEVERITY[s].help}
                      </span>
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            </fieldset>

            <div className="flex flex-col gap-2">
              <Label htmlFor="f-situation">The situation</Label>
              <Textarea
                id="f-situation"
                name="situation"
                rows={2}
                required
                defaultValue={situation}
                placeholder="The Safaricom quote last week"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="f-behaviour">What happened</Label>
              <Textarea
                id="f-behaviour"
                ref={behaviourRef}
                name="behaviour"
                rows={2}
                required
                placeholder="The quote went out two days late and nobody said it was held up"
              />
              <p className="text-muted-foreground text-xs">
                What you saw or heard, not what you think of them.
              </p>
              {quote && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="self-start"
                  onClick={() => {
                    if (behaviourRef.current) behaviourRef.current.value = `"${quote}"`
                  }}
                >
                  Quote the message
                </Button>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="f-impact">The effect</Label>
              <Textarea
                id="f-impact"
                name="impact"
                rows={2}
                required
                placeholder="Safaricom asked if we still want the order"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Raise flag
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** After the conversation: what was said, and the one change agreed. Closes the flag. */
export function LogConversation({ flagId, name }: { flagId: string; name?: string }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <MessageSquareText /> Log the conversation
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            start(async () => {
              const result = await logFlagConversation(flagId, formData)
              if (result.ok) {
                setOpen(false)
                toast.success(result.message)
              } else {
                toast.error(result.message)
              }
            })
          }}
        >
          <DialogHeader>
            <DialogTitle>How did it go{name ? ` with ${name.split(" ")[0]}` : ""}?</DialogTitle>
            <DialogDescription>Logging it closes the flag. It stays private.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="c-conversation">What was said</Label>
              <Textarea
                id="c-conversation"
                name="conversation"
                rows={3}
                placeholder="The supplier went quiet and he did not want to raise it"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="c-change">The one change you agreed</Label>
              <Textarea
                id="c-change"
                name="agreed_change"
                rows={2}
                required
                placeholder="Anything blocked for more than a day goes to Wanjiru the same day"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Log and close
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function FlagActions({
  flagId,
  open,
  canDelete,
}: {
  flagId: string
  open: boolean
  canDelete: boolean
}) {
  const [pending, start] = useTransition()
  const run = (action: () => Promise<{ ok: boolean; message: string } | void>) =>
    start(async () => {
      const result = await action()
      if (result && !result.ok) toast.error(result.message)
      else if (result) toast.success(result.message)
    })

  return (
    <div className="flex flex-wrap gap-2">
      {!open && (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(() => reopenFlag(flagId))}
        >
          <RotateCcw /> Reopen
        </Button>
      )}
      {canDelete && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={pending}>
              <Trash2 /> Remove
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove this flag?</AlertDialogTitle>
              <AlertDialogDescription>
                It is deleted for good, with the conversation logged on it. Closing it keeps the
                record; removing does not.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep it</AlertDialogCancel>
              <AlertDialogAction onClick={() => run(() => deleteFlag(flagId))}>
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
