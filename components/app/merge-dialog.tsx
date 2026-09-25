"use client"

import { useState, useTransition } from "react"
import { GitMerge, Loader2, X } from "lucide-react"
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
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  markNotDuplicate,
  mergeOrganisations,
  mergePeople,
  unmarkNotDuplicate,
} from "@/lib/data/actions"
import type { OrgField, PersonField } from "@/lib/data/match"
import type { DuplicatePair } from "@/lib/data/queries"

type Side = "a" | "b"
const other = (s: Side): Side => (s === "a" ? "b" : "a")

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** The record with more history stays by default; on a tie, the older one. */
function defaultKeep(pair: DuplicatePair): Side {
  const weight = (s: Side) => pair[s].deals * 10 + pair[s].activities
  if (weight("a") !== weight("b")) return weight("a") > weight("b") ? "a" : "b"
  return pair.a.created_at <= pair.b.created_at ? "a" : "b"
}

export function MergeDialog({
  pair,
  object,
}: {
  pair: DuplicatePair
  object: "people" | "organisations"
}) {
  const [open, setOpen] = useState(false)
  const [keep, setKeep] = useState<Side>(() => defaultKeep(pair))
  // Only fields where both sides differ need a choice. Unset means "the kept record's value".
  const [picks, setPicks] = useState<Record<string, Side>>({})
  const [pending, start] = useTransition()

  const clashes = pair.fields.filter((f) => f.clash)
  const pick = (key: string) => picks[key] ?? keep
  const drop = other(keep)
  const filledIn = pair.fields.filter((f) => !f[keep] && f[drop])
  const moving = [
    pair[drop].deals ? plural(pair[drop].deals, "deal") : null,
    pair[drop].activities ? plural(pair[drop].activities, "activity", "activities") : null,
    pair[drop].people ? plural(pair[drop].people!, "person", "people") : null,
  ].filter(Boolean)
  const movingCount = pair[drop].deals + pair[drop].activities + (pair[drop].people ?? 0)

  function merge() {
    const take = clashes.filter((f) => pick(f.key) === drop).map((f) => f.key)
    start(async () => {
      const result =
        object === "people"
          ? await mergePeople(pair[keep].id, pair[drop].id, take as PersonField[])
          : await mergeOrganisations(pair[keep].id, pair[drop].id, take as OrgField[])
      if (result.ok) {
        setOpen(false)
        toast.success(result.message, { description: "The timeline notes anything that was not kept." })
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) {
          setKeep(defaultKeep(pair))
          setPicks({})
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <GitMerge /> Merge
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Merge into one record</DialogTitle>
          <DialogDescription>
            Everything attached to both ends up on the one that stays. The other is removed.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Which one stays?</legend>
            <RadioGroup value={keep} onValueChange={(v) => setKeep(v as Side)}>
              {(["a", "b"] as Side[]).map((s) => (
                <Label
                  key={s}
                  htmlFor={`keep-${s}`}
                  className="border-border has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 font-normal"
                >
                  <RadioGroupItem id={`keep-${s}`} value={s} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{pair[s].name}</span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {pair[s].subtitle}
                    </span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
          </fieldset>

          {clashes.length > 0 && (
            <div className="flex flex-col gap-4">
              <p className="text-sm font-medium">Where they differ, keep which?</p>
              {clashes.map((f) => (
                <fieldset key={f.key} className="flex flex-col gap-1.5">
                  <legend className="text-muted-foreground mb-1.5 text-sm">{f.label}</legend>
                  <RadioGroup
                    value={pick(f.key)}
                    onValueChange={(v) => setPicks((p) => ({ ...p, [f.key]: v as Side }))}
                    className="grid-cols-1 sm:grid-cols-2"
                  >
                    {(["a", "b"] as Side[]).map((s) => (
                      <Label
                        key={s}
                        htmlFor={`${f.key}-${s}`}
                        className="border-border has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 font-normal break-all"
                      >
                        <RadioGroupItem id={`${f.key}-${s}`} value={s} />
                        {f[s]}
                      </Label>
                    ))}
                  </RadioGroup>
                </fieldset>
              ))}
            </div>
          )}

          <ul className="bg-muted text-muted-foreground flex list-disc flex-col gap-1 rounded-lg py-3 pr-3 pl-8 text-sm">
            {filledIn.length > 0 && (
              <li>
                Filled in from {pair[drop].name}:{" "}
                {filledIn.map((f) => f.label.toLowerCase()).join(", ")}.
              </li>
            )}
            {pair.tags.length > 0 && <li>Tags from both are kept.</li>}
            <li>
              {moving.length > 0
                ? `${moving.join(" and ")} ${movingCount === 1 ? "moves" : "move"} to ${pair[keep].name}.`
                : `${pair[drop].name} has no deals or history to move.`}
            </li>
            <li>
              {pair[drop].name} is removed. Values you did not keep are written in the timeline.
            </li>
          </ul>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={merge} disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="animate-spin" /> Merging…
              </>
            ) : (
              "Merge"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** They only look alike. Hide the pair for good, with a moment to undo. */
export function NotDuplicateButton({
  pair,
  object,
}: {
  pair: DuplicatePair
  object: "people" | "organisations"
}) {
  const [pending, start] = useTransition()

  function mark() {
    start(async () => {
      const result = await markNotDuplicate(object, pair.a.id, pair.b.id)
      if (!result.ok || !result.id) {
        toast.error(result.message)
        return
      }
      const id = result.id
      toast.success(result.message, {
        action: {
          label: "Undo",
          onClick: async () => {
            const undo = await unmarkNotDuplicate(id)
            if (undo.ok) toast.success(undo.message)
            else toast.error(undo.message)
          },
        },
      })
    })
  }

  return (
    <Button size="sm" variant="outline" onClick={mark} disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <X />} Not a duplicate
    </Button>
  )
}
