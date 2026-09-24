"use client"

import { useState, useTransition } from "react"
import { HandCoins, Loader2, Plus } from "lucide-react"
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
import { createDeal } from "@/lib/data/actions"
import { STAGES, money, type StageId } from "@/lib/data/types"

export function NewDeal({
  organisations,
  fixedOrganisationId,
  variant = "default",
}: {
  organisations: { id: string; name: string }[]
  fixedOrganisationId?: string
  variant?: "default" | "empty" | "inline"
}) {
  const [open, setOpen] = useState(false)
  const [org, setOrg] = useState(fixedOrganisationId ?? "")
  const [stage, setStage] = useState<StageId>("new")
  const [value, setValue] = useState("")
  const [pending, start] = useTransition()

  function submit(formData: FormData) {
    formData.set("organisation_id", org)
    formData.set("stage", stage)
    start(async () => {
      const result = await createDeal(formData)
      if (result.ok) {
        setOpen(false)
        setValue("")
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    })
  }

  const preview = Number(value.replace(/[^0-9.]/g, ""))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "empty" ? (
          <Button size="lg">
            <HandCoins /> Open your first deal
          </Button>
        ) : variant === "inline" ? (
          <Button variant="outline" size="sm">
            <Plus /> Deal
          </Button>
        ) : (
          <Button size="sm">
            <Plus /> Deal
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form action={submit}>
          <DialogHeader>
            <DialogTitle>Open a deal</DialogTitle>
            <DialogDescription>
              Something you are trying to win or buy, with a number on it. It moves across
              the board as it progresses.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="deal-title">What is it</Label>
              <Input
                id="deal-title"
                name="title"
                placeholder="Masks — 500 units"
                autoFocus
                required
              />
            </div>

            {!fixedOrganisationId && (
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="deal-org">Organisation</Label>
                <Select value={org} onValueChange={setOrg}>
                  <SelectTrigger id="deal-org">
                    <SelectValue placeholder="Who is it with?" />
                  </SelectTrigger>
                  <SelectContent>
                    {organisations.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="deal-value">Worth</Label>
              <Input
                id="deal-value"
                name="value"
                inputMode="numeric"
                placeholder="240000"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
              />
              <p className="text-muted-foreground text-sm">
                {preview > 0 ? money(preview) : "In shillings"}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="deal-stage">Stage</Label>
              <Select value={stage} onValueChange={(v) => setStage(v as StageId)}>
                <SelectTrigger id="deal-stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="deal-close">Expected close</Label>
              <Input id="deal-close" name="expected_close" type="date" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="animate-spin" /> Opening…
                </>
              ) : (
                "Open deal"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
