"use client"

import { useRef, useState, useTransition } from "react"
import { Loader2, Plus, Send } from "lucide-react"
import { toast } from "sonner"

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
import { SimilarWarning } from "@/components/app/similar-warning"
import { createContact, logActivity, type Similar } from "@/lib/data/actions"
import { ACTIVITY_LABEL, type ActivityType } from "@/lib/data/types"

const TYPES: ActivityType[] = ["call", "whatsapp", "meeting", "email", "visit", "note"]

/** One line, one tap: what just happened with this organisation, or this deal. */
export function LogActivity({
  organisationId,
  dealId,
  contactId,
}: {
  organisationId?: string
  dealId?: string
  contactId?: string
}) {
  const [type, setType] = useState<ActivityType>("call")
  const [summary, setSummary] = useState("")
  const [pending, start] = useTransition()

  function submit(formData: FormData) {
    if (organisationId) formData.set("organisation_id", organisationId)
    if (dealId) formData.set("deal_id", dealId)
    if (contactId) formData.set("contact_id", contactId)
    formData.set("type", type)
    start(async () => {
      const result = await logActivity(formData)
      if (result.ok) {
        setSummary("")
        toast.success("Logged")
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <form action={submit} className="flex flex-wrap items-center gap-2">
      <Select value={type} onValueChange={(v) => setType(v as ActivityType)}>
        <SelectTrigger className="w-32" aria-label="Type of contact">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {ACTIVITY_LABEL[t]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        name="summary"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder="What was said, in one line"
        className="min-w-48 flex-1"
        required
      />
      <Button type="submit" size="icon" disabled={pending} aria-label="Log it">
        {pending ? <Loader2 className="animate-spin" /> : <Send />}
      </Button>
    </form>
  )
}

export function AddContact({
  organisationId,
  organisationName,
}: {
  organisationId: string
  organisationName: string
}) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [similar, setSimilar] = useState<Similar | null>(null)
  const last = useRef<FormData | null>(null)

  function submit(formData: FormData) {
    formData.set("organisation_id", organisationId)
    last.current = formData
    start(async () => {
      const result = await createContact(formData)
      if (result.ok) {
        setOpen(false)
        toast.success(result.message)
      } else if (result.similar) {
        setSimilar(result.similar)
      } else {
        toast.error(result.message)
      }
    })
  }

  function addAnyway() {
    if (!last.current || !similar) return
    last.current.set("confirm", "1")
    last.current.set("not_duplicate_of", similar.id)
    setSimilar(null)
    submit(last.current)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        setSimilar(null)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus /> Person
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form
          // onSubmit, not action: an action empties the form, and after a warning
          // the person should still see what they typed.
          onSubmit={(e) => {
            e.preventDefault()
            submit(new FormData(e.currentTarget))
          }}
          onChange={() => setSimilar(null)}
        >
          <DialogHeader>
            <DialogTitle>Add someone at {organisationName}</DialogTitle>
            <DialogDescription>
              The person you actually deal with. You can set when to speak next.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="c-name">Name</Label>
              <Input id="c-name" name="full_name" placeholder="Mercy Wambui" autoFocus required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="c-title">Their role</Label>
              <Input id="c-title" name="title" placeholder="Sales lead" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="c-phone">Phone</Label>
                <Input id="c-phone" name="phone" placeholder="+254 7…" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="c-email">Email</Label>
                <Input id="c-email" name="email" type="email" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="c-touch">Speak again on</Label>
              <Input id="c-touch" name="next_touch_at" type="date" />
            </div>
          </div>
          {similar && (
            <SimilarWarning similar={similar} pending={pending} onAddAnyway={addAnyway} />
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || similar !== null}>
              {pending && <Loader2 className="animate-spin" />}
              Add person
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
