"use client"

import { useOptimistic, useState, useTransition } from "react"
import Link from "next/link"
import { Building2, CalendarClock, Loader2, MoreHorizontal } from "lucide-react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { moveDeal } from "@/lib/data/actions"
import { STAGES, money, moneyShort, type StageId } from "@/lib/data/types"

export type BoardDeal = {
  id: string
  title: string
  value: number
  stage: StageId
  organisationId?: string
  organisationName?: string
  contactName?: string
  ownerInitials: string
  expected?: string
  daysInStage: number
}

const dueLabel = (iso?: string) => {
  if (!iso) return null
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5)
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, tone: "text-destructive" }
  if (days === 0) return { text: "Closes today", tone: "text-warn" }
  if (days <= 7) return { text: `in ${days}d`, tone: "text-warn" }
  return {
    text: new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    tone: "text-muted-foreground",
  }
}

export function PipelineBoard({
  deals,
  canEdit,
}: {
  deals: BoardDeal[]
  canEdit: boolean
}) {
  const [pending, start] = useTransition()
  const [optimistic, setOptimistic] = useOptimistic(
    deals,
    (state: BoardDeal[], change: { id: string; stage: StageId }) =>
      state.map((d) => (d.id === change.id ? { ...d, stage: change.stage } : d))
  )
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<StageId | null>(null)
  const [losing, setLosing] = useState<BoardDeal | null>(null)

  function move(deal: BoardDeal, stage: StageId, reason?: string) {
    if (!canEdit || deal.stage === stage) return
    start(async () => {
      setOptimistic({ id: deal.id, stage })
      const result = await moveDeal(deal.id, stage, reason)
      if (!result.ok) toast.error(result.message)
      else if (result.message) {
        stage === "won"
          ? toast.success(result.message, { description: money(deal.value) + " won." })
          : toast.success(result.message)
      }
    })
  }

  function drop(stage: StageId) {
    const deal = optimistic.find((d) => d.id === dragging)
    setDragging(null)
    setOver(null)
    if (!deal) return
    if (stage === "lost") setLosing(deal)
    else move(deal, stage)
  }

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const inStage = optimistic.filter((d) => d.stage === stage.id)
          const total = inStage.reduce((s, d) => s + d.value, 0)
          return (
            <section
              key={stage.id}
              onDragOver={(e) => {
                if (!dragging) return
                e.preventDefault()
                setOver(stage.id)
              }}
              onDragLeave={() => setOver((s) => (s === stage.id ? null : s))}
              onDrop={(e) => {
                e.preventDefault()
                drop(stage.id)
              }}
              className={cn(
                "bg-muted/60 flex w-60 shrink-0 flex-col gap-2 rounded-xl p-2 transition-colors",
                over === stage.id && "bg-accent ring-primary/40 ring-2"
              )}
            >
              <header className="flex items-baseline gap-2 px-2 pt-1">
                <span className="text-sm font-semibold">{stage.label}</span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {inStage.length}
                </span>
                <span className="text-muted-foreground ml-auto text-xs font-medium tabular-nums">
                  {total > 0 ? moneyShort(total) : ""}
                </span>
              </header>
              <p className="text-muted-foreground px-2 text-[11px]">{stage.meaning}</p>

              {inStage.map((deal) => {
                const due = dueLabel(deal.expected)
                return (
                  <article
                    key={deal.id}
                    draggable={canEdit}
                    onDragStart={() => setDragging(deal.id)}
                    onDragEnd={() => {
                      setDragging(null)
                      setOver(null)
                    }}
                    className={cn(
                      "bg-card group rounded-lg border p-3 shadow-xs",
                      canEdit && "cursor-grab active:cursor-grabbing",
                      dragging === deal.id && "opacity-40"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <Link
                        href={`/deals/${deal.id}`}
                        draggable={false}
                        className="focus-visible:ring-ring flex-1 rounded-sm text-sm leading-snug font-medium hover:underline focus-visible:ring-2 focus-visible:outline-none"
                      >
                        {deal.title}
                      </Link>
                      {canEdit && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              aria-label={`Move ${deal.title}`}
                              className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                            >
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel className="text-muted-foreground text-xs">
                              Move to
                            </DropdownMenuLabel>
                            {STAGES.filter((s) => s.id !== deal.stage).map((s) => (
                              <DropdownMenuItem
                                key={s.id}
                                onSelect={() =>
                                  s.id === "lost" ? setLosing(deal) : move(deal, s.id)
                                }
                              >
                                {s.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {deal.organisationName && (
                      <Link
                        href={`/organisations/${deal.organisationId}`}
                        className="text-muted-foreground mt-1 flex items-center gap-1 text-xs hover:underline"
                      >
                        <Building2 className="size-3" />
                        {deal.organisationName}
                      </Link>
                    )}

                    <p className="mt-2 text-sm font-semibold tabular-nums">
                      {money(deal.value)}
                    </p>

                    <div className="text-muted-foreground mt-2 flex items-center gap-2 text-[11px]">
                      <span className="bg-fill-strong text-foreground grid size-5 place-items-center rounded-full text-[9px] font-semibold">
                        {deal.ownerInitials}
                      </span>
                      {due && (
                        <span className={cn("flex items-center gap-1", due.tone)}>
                          <CalendarClock className="size-3" />
                          {due.text}
                        </span>
                      )}
                      {deal.daysInStage > 14 &&
                        !["won", "lost"].includes(deal.stage) && (
                          <span className="text-warn ml-auto">
                            {deal.daysInStage}d here
                          </span>
                        )}
                    </div>
                  </article>
                )
              })}

              {inStage.length === 0 && (
                <p className="text-muted-foreground px-2 py-6 text-center text-xs">
                  {canEdit ? "Drag a deal here" : "Nothing here"}
                </p>
              )}
            </section>
          )
        })}
      </div>

      {/* Losing a deal is worth one question: why? That is the only way the pattern shows up later. */}
      <Dialog open={Boolean(losing)} onOpenChange={(o) => !o && setLosing(null)}>
        <DialogContent className="sm:max-w-md">
          <form
            action={(formData: FormData) => {
              const deal = losing
              setLosing(null)
              if (deal) move(deal, "lost", String(formData.get("reason") ?? ""))
            }}
          >
            <DialogHeader>
              <DialogTitle>Why was {losing?.title} lost?</DialogTitle>
              <DialogDescription>
                One line is enough. It is what makes the win-rate numbers worth reading later.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 py-6">
              <Label htmlFor="lost-reason">Reason</Label>
              <Input
                id="lost-reason"
                name="reason"
                placeholder="Price — went with a cheaper supplier"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLosing(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={pending}>
                {pending && <Loader2 className="animate-spin" />}
                Mark lost
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
