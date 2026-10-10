"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Check, Copy, Loader2, Share2, UserPlus } from "lucide-react"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { createInvite } from "@/lib/data/actions"
import { ROLE_HELP, ROLE_LABEL, type Role } from "@/lib/data/types"

const CHOICES: Role[] = ["admin", "member", "viewer"]

export function InviteDialog({ workspaceName }: { workspaceName: string }) {
  const params = useSearchParams()
  const router = useRouter()
  // The sidebar and Today both link here with ?invite=1: start open, then tidy the address.
  const [open, setOpen] = useState(() => Boolean(params.get("invite")))
  const [role, setRole] = useState<Role>("member")
  const [pending, start] = useTransition()

  useEffect(() => {
    if (params.get("invite")) router.replace("/team")
  }, [params, router])

  function submit(formData: FormData) {
    formData.set("role", role)
    start(async () => {
      const result = await createInvite(formData)
      if (result.ok) {
        setOpen(false)
        setRole("member")
        toast.success(result.message, {
          description: "Copy the link from the Invites tab and send it however you like.",
        })
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus /> Invite
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form action={submit}>
          <DialogHeader>
            <DialogTitle>Invite to {workspaceName}</DialogTitle>
            <DialogDescription>
              They get a link that only works for this workspace. Nothing else you run is
              visible to them.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5 py-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                name="email"
                type="email"
                placeholder="name@example.com"
                autoComplete="off"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="invite-title">
                What they do here <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input id="invite-title" name="title" placeholder="Sales admin, Marketing, Director" maxLength={60} autoComplete="off" />
              <p className="text-muted-foreground text-xs">Shown next to their name. What they can do is set by the role below.</p>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Joins as</Label>
              <RadioGroup
                value={role}
                onValueChange={(v) => setRole(v as Role)}
                className="gap-0 overflow-hidden rounded-lg border"
              >
                {CHOICES.map((r) => (
                  <Label
                    key={r}
                    htmlFor={`role-${r}`}
                    className="has-[[data-state=checked]]:bg-accent flex cursor-pointer items-start gap-3 border-b p-3 last:border-b-0"
                  >
                    <RadioGroupItem value={r} id={`role-${r}`} className="mt-0.5" />
                    <span className="grid gap-0.5">
                      <span className="text-sm font-medium">{ROLE_LABEL[r]}</span>
                      <span className="text-muted-foreground text-xs">{ROLE_HELP[r]}</span>
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <p className="text-muted-foreground text-sm">
              The link expires in 7 days and can be cancelled at any time.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="animate-spin" /> Creating…
                </>
              ) : (
                "Create invite"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Copy button for an invite link, with the copied state people expect. */
export function CopyLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    const url = `${location.origin}/join/${token}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success("Invite link copied")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Could not copy", { description: url })
    }
  }

  async function share() {
    const url = `${location.origin}/join/${token}`
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join me on The Agency", url })
      } catch {
        /* the person closed the share sheet */
      }
    } else {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(`Join me on The Agency: ${url}`)}`,
        "_blank"
      )
    }
  }

  return (
    <div className="flex gap-1">
      <Button variant="outline" size="sm" onClick={copy}>
        {copied ? <Check /> : <Copy />}
        {copied ? "Copied" : "Copy link"}
      </Button>
      <Button variant="ghost" size="icon-sm" onClick={share} aria-label="Share invite">
        <Share2 />
      </Button>
    </div>
  )
}
