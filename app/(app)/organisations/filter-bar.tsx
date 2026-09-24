"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Bookmark, Filter, Loader2, Search, Trash2, X } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { deleteView, saveView } from "@/lib/data/actions"
import { ORG_CATEGORIES, ORG_CATEGORY_LABEL } from "@/lib/data/types"

type Option = { value: string; label: string }

type FieldDef = {
  key: string
  label: string
  options: Option[]
  /** How the chip reads once chosen, e.g. "Type is Supplier". */
  phrase: (label: string) => string
}

export type SavedViewChip = {
  id: string
  name: string
  query: string
  shared: boolean
  mine: boolean
}

export function FilterBar({
  people,
  tags,
  views,
  canShare,
}: {
  people: Option[]
  tags: string[]
  views: SavedViewChip[]
  canShare: boolean
}) {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [pending, start] = useTransition()
  const [adding, setAdding] = useState(false)
  const [field, setField] = useState<string>("category")
  const [value, setValue] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [shared, setShared] = useState(false)

  const FIELDS: FieldDef[] = [
    {
      key: "category",
      label: "Type",
      options: ORG_CATEGORIES.map((c) => ({ value: c, label: ORG_CATEGORY_LABEL[c] })),
      phrase: (l) => `Type is ${l}`,
    },
    { key: "owner", label: "Owner", options: people, phrase: (l) => `Owned by ${l}` },
    {
      key: "tag",
      label: "Tag",
      options: tags.map((t) => ({ value: t, label: t })),
      phrase: (l) => `Tagged ${l}`,
    },
    {
      key: "stale",
      label: "Last contact",
      options: [
        { value: "14", label: "over 14 days ago" },
        { value: "30", label: "over 30 days ago" },
        { value: "60", label: "over 60 days ago" },
      ],
      phrase: (l) => `Last contact ${l}`,
    },
    {
      key: "hasDeals",
      label: "Open deals",
      options: [
        { value: "open", label: "has open deals" },
        { value: "none", label: "has none" },
      ],
      phrase: (l) => `Deals: ${l}`,
    },
  ]

  const current = new URLSearchParams(params.toString())
  const active = FIELDS.flatMap((f) => {
    const v = current.get(f.key)
    if (!v) return []
    const label = f.options.find((o) => o.value === v)?.label ?? v
    return [{ key: f.key, text: f.phrase(label) }]
  })

  function go(next: URLSearchParams) {
    const q = next.toString()
    router.push(q ? `${pathname}?${q}` : pathname)
  }

  function addFilter() {
    if (!value) return
    const next = new URLSearchParams(params.toString())
    next.set(field, value)
    setAdding(false)
    setValue("")
    go(next)
  }

  function removeFilter(key: string) {
    const next = new URLSearchParams(params.toString())
    next.delete(key)
    go(next)
  }

  function save(formData: FormData) {
    const name = String(formData.get("name") ?? "")
    const query = params.toString()
    start(async () => {
      const result = await saveView("organisations", name, query, shared)
      if (result.ok) {
        setSaving(false)
        setShared(false)
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    })
  }

  const fieldDef = FIELDS.find((f) => f.key === field)!
  const hasFilters = active.length > 0 || Boolean(current.get("q"))

  return (
    <div className="flex flex-col gap-3">
      {/* Saved views */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/organisations"
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold",
            !hasFilters
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          All
        </Link>
        {views.map((v) => {
          const on = params.toString() === v.query
          return (
            <span key={v.id} className="group relative inline-flex">
              <Link
                href={`/organisations?${v.query}`}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  on
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {v.name}
                {v.shared && <span className="ml-1 opacity-60">·shared</span>}
              </Link>
              {v.mine && (
                <button
                  aria-label={`Remove the ${v.name} view`}
                  className="bg-background text-muted-foreground hover:text-destructive absolute -top-1.5 -right-1.5 hidden rounded-full border p-0.5 group-hover:block"
                  onClick={() =>
                    start(async () => {
                      const r = await deleteView(v.id)
                      r.ok ? toast.success(r.message) : toast.error(r.message)
                    })
                  }
                >
                  <X className="size-3" />
                </button>
              )}
            </span>
          )
        })}
      </div>

      {/* Filters and search */}
      <div className="flex flex-wrap items-center gap-2">
        {active.map((a) => (
          <span
            key={a.key}
            className="bg-muted flex items-center gap-1.5 rounded-md py-1 pr-1 pl-2.5 text-xs font-medium"
          >
            {a.text}
            <button
              onClick={() => removeFilter(a.key)}
              aria-label={`Remove filter: ${a.text}`}
              className="hover:bg-background rounded p-0.5"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}

        <Popover open={adding} onOpenChange={setAdding}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter /> Add filter
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Where</Label>
                <Select
                  value={field}
                  onValueChange={(f) => {
                    setField(f)
                    setValue("")
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELDS.map((f) => (
                      <SelectItem key={f.key} value={f.key}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Is</Label>
                <Select value={value} onValueChange={setValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose" />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldDef.options.length === 0 ? (
                      <div className="text-muted-foreground px-2 py-1.5 text-sm">
                        Nothing to pick yet
                      </div>
                    ) : (
                      fieldDef.options.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Button size="sm" onClick={addFilter} disabled={!value}>
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {hasFilters && (
          <>
            <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
              Clear
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSaving(true)}>
              <Bookmark /> Save view
            </Button>
          </>
        )}

        <form action="/organisations" className="ml-auto">
          {/* Keep the filters when searching. */}
          {active.map((a) => (
            <input key={a.key} type="hidden" name={a.key} value={current.get(a.key) ?? ""} />
          ))}
          <div className="relative">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
            <Input
              name="q"
              defaultValue={current.get("q") ?? ""}
              placeholder="Search organisations"
              className="w-56 pl-8"
            />
          </div>
        </form>
      </div>

      <Dialog open={saving} onOpenChange={setSaving}>
        <DialogContent className="sm:max-w-md">
          <form action={save}>
            <DialogHeader>
              <DialogTitle>Save this view</DialogTitle>
              <DialogDescription>
                It keeps the filters and the search, and sits in the row above.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-6">
              <div className="flex flex-col gap-2">
                <Label htmlFor="view-name">Name</Label>
                <Input
                  id="view-name"
                  name="name"
                  placeholder="PPE suppliers gone quiet"
                  autoFocus
                  required
                />
              </div>
              {canShare && (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm">
                    Share with the workspace
                    <span className="text-muted-foreground block text-xs">
                      Everyone sees it, only you can remove it.
                    </span>
                  </span>
                  <Switch checked={shared} onCheckedChange={setShared} />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSaving(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="animate-spin" />}
                Save view
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {pending && (
        <p className="text-muted-foreground flex items-center gap-2 text-xs">
          <Loader2 className="size-3 animate-spin" /> Working…
        </p>
      )}
    </div>
  )
}
