"use client"

import { useState, useTransition } from "react"
import { Loader2, Pencil } from "lucide-react"
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
import { updateContact } from "@/lib/data/actions"

type Option = { value: string; label: string }

export function EditPerson({
  person,
  organisations,
  owners,
}: {
  person: {
    id: string
    full_name: string
    title?: string
    phone?: string
    email?: string
    tags: string[]
    next_touch_at?: string
    organisation_id?: string
    owner_id: string
  }
  organisations: Option[]
  owners: Option[]
}) {
  const [open, setOpen] = useState(false)
  const [org, setOrg] = useState(person.organisation_id ?? "none")
  const [owner, setOwner] = useState(person.owner_id)
  const [pending, start] = useTransition()

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) {
          setOrg(person.organisation_id ?? "none")
          setOwner(person.owner_id)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            formData.set("organisation_id", org === "none" ? "" : org)
            formData.set("owner_id", owner)
            start(async () => {
              const result = await updateContact(person.id, formData)
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
            <DialogTitle>Edit {person.full_name}</DialogTitle>
            <DialogDescription>Changes are noted in their history.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="p-name">Name</Label>
              <Input id="p-name" name="full_name" defaultValue={person.full_name} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="p-title">Their role</Label>
              <Input
                id="p-title"
                name="title"
                defaultValue={person.title}
                placeholder="Sales lead"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="p-phone">Phone</Label>
                <Input
                  id="p-phone"
                  name="phone"
                  defaultValue={person.phone}
                  placeholder="+254 7…"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="p-email">Email</Label>
                <Input id="p-email" name="email" type="email" defaultValue={person.email} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="p-org">Works at</Label>
              <Select value={org} onValueChange={setOrg}>
                <SelectTrigger id="p-org">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No organisation</SelectItem>
                  {organisations.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="p-owner">Owner</Label>
                <Select value={owner} onValueChange={setOwner}>
                  <SelectTrigger id="p-owner">
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
              <div className="flex flex-col gap-2">
                <Label htmlFor="p-touch">Speak again on</Label>
                <Input
                  id="p-touch"
                  name="next_touch_at"
                  type="date"
                  defaultValue={person.next_touch_at?.slice(0, 10)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="p-tags">Tags</Label>
              <Input
                id="p-tags"
                name="tags"
                defaultValue={person.tags.join(", ")}
                placeholder="Decision maker"
              />
              <p className="text-muted-foreground text-xs">Separate with commas.</p>
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
