"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Loader2, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react"
import { toast } from "sonner"

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
import { Card, CardContent } from "@/components/ui/card"
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
import { Textarea } from "@/components/ui/textarea"
import {
  createCustomField,
  deleteCustomField,
  saveCustomValues,
  suggestCustomFields,
  updateCustomField,
} from "@/lib/data/actions"
import type { FieldWithValue } from "@/lib/data/queries"
import {
  FIELD_OBJECT_LABEL,
  FIELD_TYPE_LABEL,
  type CustomField,
  type FieldObject,
  type FieldType,
} from "@/lib/data/types"

type Result = { ok: boolean; message: string }

function useRun() {
  const [pending, start] = useTransition()
  const run = (fn: () => Promise<Result>, after?: () => void) =>
    start(async () => {
      const result = await fn()
      if (result.ok) {
        toast.success(result.message)
        after?.()
      } else {
        toast.error(result.message)
      }
    })
  return { pending, run }
}

/* ------------------------------------------------------------- Settings */

/** Add a field, or edit one: its name and, for a choice, its options. The type is fixed once made. */
function FieldDialog({ field, object }: { field?: CustomField; object?: FieldObject }) {
  const [open, setOpen] = useState(false)
  const [obj, setObj] = useState<FieldObject>(field?.object ?? object ?? "organisations")
  const [type, setType] = useState<FieldType>(field?.type ?? "text")
  const { pending, run } = useRun()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {field ? (
          <Button variant="ghost" size="icon-sm" aria-label={`Edit ${field.label}`}>
            <Pencil />
          </Button>
        ) : (
          <Button size="sm">
            <Plus /> Field
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            formData.set("object", obj)
            formData.set("type", type)
            run(
              () => (field ? updateCustomField(field.id, formData) : createCustomField(formData)),
              () => setOpen(false),
            )
          }}
        >
          <DialogHeader>
            <DialogTitle>{field ? `Edit ${field.label}` : "Add a field"}</DialogTitle>
            <DialogDescription>
              {field
                ? "Rename it or change its choices. What is already filled in stays."
                : "Something you want to keep on every organisation or deal."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-6">
            {!field && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="cf-object">On</Label>
                  <Select value={obj} onValueChange={(v) => setObj(v as FieldObject)}>
                    <SelectTrigger id="cf-object">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(FIELD_OBJECT_LABEL) as FieldObject[]).map((o) => (
                        <SelectItem key={o} value={o}>
                          {FIELD_OBJECT_LABEL[o]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="cf-type">Kind</Label>
                  <Select value={type} onValueChange={(v) => setType(v as FieldType)}>
                    <SelectTrigger id="cf-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(FIELD_TYPE_LABEL) as FieldType[]).map((t) => (
                        <SelectItem key={t} value={t}>
                          {FIELD_TYPE_LABEL[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="cf-label">Name</Label>
              <Input
                id="cf-label"
                name="label"
                defaultValue={field?.label}
                placeholder="Credit terms"
                autoFocus
                required
              />
            </div>
            {type === "choice" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="cf-options">Choices</Label>
                <Textarea
                  id="cf-options"
                  name="options"
                  rows={3}
                  defaultValue={field?.options.join(", ")}
                  placeholder="Cash on delivery, 7 days, 30 days, 60 days"
                  required
                />
                <p className="text-muted-foreground text-xs">
                  Separate with commas. 2 to 20 choices.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {field ? "Save" : "Add field"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RemoveField({ field }: { field: CustomField }) {
  const { pending, run } = useRun()
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Remove ${field.label}`}
          disabled={pending}
        >
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {field.label}?</AlertDialogTitle>
          <AlertDialogDescription>
            The field goes from every {field.object === "deals" ? "deal" : "organisation"}, and so
            does whatever was filled in for it. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/90 text-white"
            onClick={() => run(() => deleteCustomField(field.id))}
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

type Suggestion = {
  object: FieldObject
  label: string
  type: FieldType
  options: string[]
  why: string
}

function ClaudeSuggestions() {
  const [asking, startAsking] = useTransition()
  const [items, setItems] = useState<Suggestion[]>([])
  const { pending, run } = useRun()

  function ask() {
    startAsking(async () => {
      const result = await suggestCustomFields()
      if (result.ok && result.fields) {
        setItems(result.fields)
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    })
  }

  function add(s: Suggestion) {
    const formData = new FormData()
    formData.set("object", s.object)
    formData.set("type", s.type)
    formData.set("label", s.label)
    formData.set("options", s.options.join(", "))
    run(
      () => createCustomField(formData),
      () => setItems((all) => all.filter((x) => x !== s)),
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Button variant="outline" size="sm" onClick={ask} disabled={asking}>
          {asking ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {asking ? "Claude is looking…" : "Suggest fields with Claude"}
        </Button>
      </div>
      {items.length > 0 && (
        <ul className="bg-card divide-border divide-y rounded-xl border">
          {items.map((s) => (
            <li
              key={`${s.object}-${s.label}`}
              className="flex flex-wrap items-center gap-3 px-4 py-3"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">
                  {s.label}{" "}
                  <span className="text-muted-foreground font-normal">
                    · {FIELD_OBJECT_LABEL[s.object]} · {FIELD_TYPE_LABEL[s.type]}
                  </span>
                </span>
                <span className="text-muted-foreground block text-xs">
                  {s.why}
                  {s.options.length ? ` Choices: ${s.options.join(", ")}.` : ""}
                </span>
              </span>
              <span className="flex gap-1">
                <Button size="sm" variant="outline" disabled={pending} onClick={() => add(s)}>
                  <Plus /> Add
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Dismiss ${s.label}`}
                  onClick={() => setItems((all) => all.filter((x) => x !== s))}
                >
                  <X />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Settings: every custom field, grouped by where it lives. */
export function FieldManager({ fields, aiEnabled }: { fields: CustomField[]; aiEnabled: boolean }) {
  return (
    <div className="flex flex-col gap-5">
      {(Object.keys(FIELD_OBJECT_LABEL) as FieldObject[]).map((object) => {
        const list = fields.filter((f) => f.object === object)
        return (
          <div key={object}>
            <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
              {FIELD_OBJECT_LABEL[object]}
            </p>
            {list.length === 0 ? (
              <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-3 text-sm">
                None yet.
              </p>
            ) : (
              <ul className="bg-card divide-border divide-y rounded-xl border">
                {list.map((f) => (
                  <li key={f.id} className="flex min-h-12 items-center gap-3 px-4 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{f.label}</span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {FIELD_TYPE_LABEL[f.type]}
                        {f.options.length ? ` · ${f.options.join(", ")}` : ""}
                      </span>
                    </span>
                    <FieldDialog field={f} />
                    <RemoveField field={f} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
      <div className="flex flex-wrap items-center gap-3">
        <FieldDialog />
      </div>
      {aiEnabled ? (
        <ClaudeSuggestions />
      ) : (
        <p className="text-muted-foreground flex items-start gap-2 text-xs">
          <Sparkles className="mt-0.5 size-3.5 shrink-0" />
          Claude can suggest fields once an API key is added to .env.local.
        </p>
      )}
    </div>
  )
}

/* --------------------------------------------------------- record pages */

/** Inputs for one field, by its kind. */
function FieldInput({ f }: { f: FieldWithValue }) {
  const [choice, setChoice] = useState(f.value || "none")
  const id = `cv-${f.id}`
  if (f.type === "choice") {
    return (
      <>
        <input type="hidden" name={f.id} value={choice === "none" ? "" : choice} />
        <Select value={choice} onValueChange={setChoice}>
          <SelectTrigger id={id}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Not set</SelectItem>
            {f.options.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </>
    )
  }
  return (
    <Input
      id={id}
      name={f.id}
      type={f.type === "date" ? "date" : "text"}
      inputMode={f.type === "number" || f.type === "money" ? "decimal" : undefined}
      defaultValue={
        f.type === "money" && f.value ? Number(f.value).toLocaleString("en-KE") : f.value
      }
      placeholder={f.type === "money" ? "KSh" : undefined}
    />
  )
}

/** The fields on one organisation or deal, with an Edit button for anyone who can edit. */
export function CustomValues({
  object,
  recordId,
  fields,
  canEdit,
  canManage,
}: {
  object: FieldObject
  recordId: string
  fields: FieldWithValue[]
  canEdit: boolean
  canManage: boolean
}) {
  const [open, setOpen] = useState(false)
  const { pending, run } = useRun()

  if (fields.length === 0) {
    return canManage ? (
      <p className="text-muted-foreground text-xs">
        Keep your own details here, like credit terms or a KRA PIN.{" "}
        <Link href="/settings#custom-fields" className="text-primary hover:underline">
          Add fields in Settings
        </Link>
      </p>
    ) : null
  }

  return (
    <Card className="py-0">
      <CardContent className="divide-border divide-y p-0">
        {fields.map((f) => (
          <div key={f.id} className="px-4 py-2.5">
            <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
              {f.label}
            </p>
            <p className="text-sm">
              {f.display || <span className="text-muted-foreground">—</span>}
            </p>
          </div>
        ))}
        {canEdit && (
          <div className="px-2 py-1.5">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Pencil /> Edit details
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const formData = new FormData(e.currentTarget)
                    run(
                      () => saveCustomValues(object, recordId, formData),
                      () => setOpen(false),
                    )
                  }}
                >
                  <DialogHeader>
                    <DialogTitle>Edit details</DialogTitle>
                    <DialogDescription>
                      Leave a box empty to clear it. Changes are noted in the history.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col gap-4 py-6">
                    {fields.map((f) => (
                      <div key={f.id} className="flex flex-col gap-2">
                        <Label htmlFor={`cv-${f.id}`}>{f.label}</Label>
                        <FieldInput f={f} />
                      </div>
                    ))}
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
          </div>
        )}
      </CardContent>
    </Card>
  )
}
