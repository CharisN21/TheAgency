"use client"

import { useState, useTransition } from "react"
import { ArrowRight, Loader2, Plus, UserMinus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { appointFounder, createWorkspace, enterWorkspace, removeFounder } from "@/lib/data/actions"

/** The venture's mark: its colour and first letter. A logo can replace it once uploads exist. */
export function VentureMark({ name, color, size = 44 }: { name: string; color: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-[22%] font-bold text-white"
      style={{ backgroundColor: color, width: size, height: size, fontSize: size * 0.45 }}
    >
      {Array.from(name.trim())[0]?.toUpperCase()}
    </span>
  )
}

export function EnterButton({ workspaceId, name }: { workspaceId: string; name: string }) {
  const [pending, start] = useTransition()
  return (
    <Button
      onClick={() =>
        start(async () => {
          const r = await enterWorkspace(workspaceId)
          if (r && !r.ok) toast.error(r.message)
        })
      }
      disabled={pending}
      aria-label={`Enter ${name}`}
    >
      {pending ? <Loader2 className="animate-spin" /> : <ArrowRight />} Enter
    </Button>
  )
}

export function NewWorkspaceForm({ ventureId, ventureName }: { ventureId: string; ventureName: string }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Plus /> Add a workspace to {ventureName}
      </Button>
    )
  }
  return (
    <form
      className="bg-card flex flex-col gap-4 rounded-xl border p-5 text-left"
      action={(fd) => {
        fd.set("venture_id", ventureId)
        start(async () => {
          const r = await createWorkspace(fd)
          if (r && !r.ok) toast.error(r.message)
        })
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="ws-name">Workspace name</Label>
        <Input id="ws-name" name="name" placeholder="Marketing and sales" maxLength={80} required autoFocus />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="ws-title">
          Your title there <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input id="ws-title" name="title" placeholder="Founder" maxLength={60} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />} Create workspace
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

export function AppointFounderForm() {
  const [email, setEmail] = useState("")
  const [pending, start] = useTransition()
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      action={(fd) =>
        start(async () => {
          const r = await appointFounder(fd)
          if (r.ok) {
            toast.success(r.message)
            setEmail("")
          } else toast.error(r.message)
        })
      }
    >
      <Label htmlFor="founder-email" className="sr-only">
        Email address
      </Label>
      <Input
        id="founder-email"
        name="email"
        type="email"
        inputMode="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="founder@theirventure.co.ke"
        required
      />
      <Button type="submit" disabled={pending || !email.includes("@")}>
        {pending && <Loader2 className="animate-spin" />} Make a founder
      </Button>
    </form>
  )
}

export function RemoveFounderButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition()
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-label={`Stop ${name} being a founder`}
      onClick={() =>
        start(async () => {
          const r = await removeFounder(id)
          if (r.ok) toast.success(r.message)
          else toast.error(r.message)
        })
      }
    >
      <UserMinus /> Remove
    </Button>
  )
}
