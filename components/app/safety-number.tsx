"use client"

import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { clearChecked, markChecked, type CheckStatus } from "@/lib/crypto/verified"

export type Safety = { number: string; status: CheckStatus; otherId: string; otherName: string }

const LABEL: Record<CheckStatus, string> = {
  unchecked: "Not checked",
  verified: "Checked",
  changed: "Changed",
}

/** The button in a direct message's header: whether you have checked this person's number. */
export function SafetyButton({ safety, onOpen }: { safety: Safety; onOpen: () => void }) {
  const Icon = safety.status === "verified" ? ShieldCheck : safety.status === "changed" ? ShieldAlert : ShieldQuestion
  return (
    <Button
      variant="ghost"
      size="sm"
      className={safety.status === "changed" ? "text-warn mr-6" : "mr-6"}
      onClick={onOpen}
      aria-label={`Safety number with ${safety.otherName}: ${LABEL[safety.status].toLowerCase()}`}
    >
      <Icon /> {LABEL[safety.status]}
    </Button>
  )
}

/** Shown above the messages when a number you checked has changed since. */
export function SafetyChangedNotice({ name, onOpen }: { name: string; onOpen: () => void }) {
  return (
    <div className="bg-warn-soft text-warn border-warn/30 flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2 text-xs" role="status">
      <span>
        Warning: the safety number with {name} has changed since you checked it. A new device or key was added for one of
        you. Check it again before sharing anything private.
      </span>
      <Button variant="ghost" size="sm" className="text-warn h-8 font-semibold" onClick={onOpen}>
        Check it
      </Button>
    </div>
  )
}

export function SafetyDialog({
  open,
  onOpenChange,
  safety,
  me,
  onChanged,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  safety: Safety
  me: string
  /** Called after a check is saved or removed, so the button updates. */
  onChanged: (status: CheckStatus) => void
}) {
  const first = safety.otherName.split(" ")[0]
  const groups = safety.number.split(" ")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Safety number with {first}</DialogTitle>
          <DialogDescription>
            Read this number to {first} on a call, or compare screens in person. If it is exactly the same on both
            phones, nobody has slipped a key in between you.
          </DialogDescription>
        </DialogHeader>

        <div
          className="bg-muted grid grid-cols-3 gap-x-4 gap-y-2 rounded-xl px-5 py-4 text-center font-mono text-lg tracking-wider tabular-nums"
          aria-label={`Safety number: ${groups.join(", ")}`}
        >
          {groups.map((g, i) => (
            <span key={i}>{g}</span>
          ))}
        </div>

        <p className="text-muted-foreground text-xs">
          {safety.status === "verified" && `You checked this number. It stays checked until a device or key is added for you or ${first}.`}
          {safety.status === "unchecked" && "You have not checked this number yet."}
          {safety.status === "changed" &&
            `This number is different from the one you checked. A device or key was added for you or ${first}. If you did not expect that, ask them before sharing anything private.`}{" "}
          Your check is kept on this device only; nobody else is told.
        </p>

        <DialogFooter>
          {safety.status === "verified" ? (
            <Button
              variant="outline"
              onClick={() => {
                clearChecked(me, safety.otherId)
                onChanged("unchecked")
              }}
            >
              Remove my check
            </Button>
          ) : (
            <Button
              onClick={() => {
                if (markChecked(me, safety.otherId, safety.number)) {
                  onChanged("verified")
                  toast.success(`Checked with ${first}`)
                } else toast.error("This browser could not keep your check. Try again.")
              }}
            >
              {safety.status === "changed" ? "It matches: check again" : "It matches: mark as checked"}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
