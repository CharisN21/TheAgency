"use client"

import { useState, useTransition } from "react"
import { Check, Loader2, Pencil, X } from "lucide-react"
import { toast } from "sonner"

import { cn } from "cn"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { moveDeal, updateDeal } from "@/lib/data/actions"
import { STAGES, type StageId } from "@/lib/data/types"

const PATH = STAGES.filter((s) => s.id !== "lost")

/**
 * New → Quoted → Negotiating → Won, as steps you can tap. Lost sits apart,
 * because it is not the next step of anything, and it always asks why.
 */
export function StageSteps({
  dealId,
  title,
  stage,
  canEdit,
}: {
  dealId: string
  title: string
  stage: StageId
  canEdit: boolean
}) {
  const [pending, start] = useTransition()
  const [target, setTarget] = useState<StageId | null>(null)
  const [losing, setLosing] = useState(false)
  const reached = PATH.findIndex((s) => s.id === stage)

  function move(to: StageId, reason?: string) {
    setTarget(to)
    start(async () => {
      const result = await moveDeal(dealId, to, reason)
      if (result.ok) {
        if (result.message) toast.success(result.message)
      } else {
        toast.error(result.message)
      }
      setTarget(null)
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <ol className="grid grid-cols-4 gap-1.5" aria-label="Stage">
        {PATH.map((s, i) => {
          const current = s.id === stage
          const done = stage !== "lost" && i < reached
          return (
            <li key={s.id}>
              <button
                type="button"
                disabled={!canEdit || current || pending}
                onClick={() => move(s.id)}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "focus-visible:ring-ring flex min-h-11 w-full flex-col items-start justify-center gap-0.5 rounded-lg border px-2.5 py-1.5 text-left transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none disabled:cursor-default sm:px-3",
                  current && "bg-primary text-primary-foreground border-primary",
                  done && "bg-card border-primary/30 text-foreground",
                  !current && !done && "bg-card/60 border-border text-muted-foreground",
                  canEdit && !current && "hover:border-primary/60"
                )}
              >
                <span className="flex items-center gap-1 text-xs font-semibold sm:text-sm">
                  {pending && target === s.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : done ? (
                    <Check className="text-primary size-3.5" />
                  ) : null}
                  {s.label}
                </span>
                <span
                  className={cn(
                    "hidden text-[11px] leading-tight sm:block",
                    current ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}
                >
                  {s.meaning}
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      {canEdit && stage !== "lost" && stage !== "won" && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setLosing(true)}
            disabled={pending}
          >
            <X /> Mark as lost
          </Button>
        </div>
      )}

      <Dialog open={losing} onOpenChange={setLosing}>
        <DialogContent className="sm:max-w-md">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const reason = String(new FormData(e.currentTarget).get("reason") ?? "").trim()
              setLosing(false)
              move("lost", reason)
            }}
          >
            <DialogHeader>
              <DialogTitle>Why was {title} lost?</DialogTitle>
              <DialogDescription>
                One line is enough. It is what makes the win-rate numbers worth reading later.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 py-6">
              <Label htmlFor="lost-reason">Reason</Label>
              <Input id="lost-reason" name="reason" placeholder="Went with a cheaper supplier" autoFocus required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLosing(false)}>
                Cancel
              </Button>
              <Button type="submit">Mark as lost</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

type Option = { value: string; label: string }

export function EditDeal({
  dealId,
  title,
  value,
  expectedClose,
  contactId,
  ownerId,
  contacts,
  owners,
}: {
  dealId: string
  title: string
  value: number
  expectedClose?: string
  contactId?: string
  ownerId: string
  contacts: Option[]
  owners: Option[]
}) {
  const [open, setOpen] = useState(false)
  const [contact, setContact] = useState(contactId ?? "none")
  const [owner, setOwner] = useState(ownerId)
  const [pending, start] = useTransition()

  function submit(formData: FormData) {
    formData.set("contact_id", contact === "none" ? "" : contact)
    formData.set("owner_id", owner)
    start(async () => {
      const result = await updateDeal(dealId, formData)
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
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil /> Edit
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
            <DialogTitle>Edit deal</DialogTitle>
            <DialogDescription>Every change is noted in the deal&apos;s history.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="d-title">Name</Label>
              <Input id="d-title" name="title" defaultValue={title} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="d-value">Worth (KSh)</Label>
                <Input
                  id="d-value"
                  name="value"
                  inputMode="numeric"
                  defaultValue={value.toLocaleString("en-KE")}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="d-close">Expected to close</Label>
                <Input
                  id="d-close"
                  name="expected_close"
                  type="date"
                  defaultValue={expectedClose?.slice(0, 10)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="d-contact">Who you deal with</Label>
              <Select value={contact} onValueChange={setContact}>
                <SelectTrigger id="d-contact">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nobody yet</SelectItem>
                  {contacts.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="d-owner">Owner</Label>
              <Select value={owner} onValueChange={setOwner}>
                <SelectTrigger id="d-owner">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {owners.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
