"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Bookmark, Filter, Loader2, Search, X } from "lucide-react"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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

type Option = { value: string; label: string }

/** One filter a list offers. Plain data, so a server page can build it. */
export type FilterFieldDef = {
  key: string
  label: string
  options: Option[]
  /** How the chip reads once chosen; "{}" is the chosen option, e.g. "Type is {}". */
  phrase: string
}

export type SavedViewChip = {
  id: string
  name: string
  query: string
  shared: boolean
  mine: boolean
}

/**
 * Saved views, filter chips, "Add filter" and search for a list page. The
 * filters live in the address, so a view is just a saved query string.
 */
export function FilterBar({
  object,
  fields,
  views,
  canShare,
  searchPlaceholder,
  sticky = [],
}: {
  object: "organisations" | "people" | "deals"
  fields: FilterFieldDef[]
  views: SavedViewChip[]
  canShare: boolean
  searchPlaceholder: string
  /** Address settings that are not filters (like the Deals list/board switch) and survive Clear. */
  sticky?: string[]
}) {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [pending, start] = useTransition()
  const [adding, setAdding] = useState(false)
  const [field, setField] = useState<string>(fields[0]?.key ?? "")
  const [value, setValue] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [shared, setShared] = useState(false)

  const FIELDS = fields
  const current = new URLSearchParams(params.toString())
  const active = FIELDS.flatMap((f) => {
    const v = current.get(f.key)
    if (!v) return []
    const label = f.options.find((o) => o.value === v)?.label ?? v
    return [{ key: f.key, text: f.phrase.replace("{}", label) }]
  })

  // What Clear and "All" keep: the page's own settings, never the filters.
  const kept = new URLSearchParams()
  for (const k of sticky) {
    const v = params.get(k)
    if (v) kept.set(k, v)
  }
  const base = kept.toString() ? `/${object}?${kept.toString()}` : `/${object}`

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
      const result = await saveView(object, name, query, shared)
      if (result.ok) {
        setSaving(false)
        setShared(false)
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    })
  }

  const fieldDef = FIELDS.find((f) => f.key === field) ?? FIELDS[0]
  const hasFilters = active.length > 0 || Boolean(current.get("q"))

  return (
    <div className="flex flex-col gap-3">
      {/* Saved views */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={base}
          aria-current={!hasFilters ? "page" : undefined}
          className={cn(
            "inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-semibold",
            !hasFilters
              ? "bg-accent text-accent-foreground border-primary/40"
              : "text-muted-foreground hover:bg-muted border-transparent",
          )}
        >
          All
        </Link>
        {views.map((v) => {
          const on = params.toString() === v.query
          return (
            <span key={v.id} className="group relative inline-flex">
              <Link
                href={`/${object}?${v.query}`}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-semibold",
                  on
                    ? "bg-accent text-accent-foreground border-primary/40"
                    : "text-muted-foreground hover:bg-muted border-transparent",
                )}
              >
                {v.name}
                {v.shared && <span className="ml-1 font-normal"> · Shared</span>}
              </Link>
              {v.mine && (
                <button
                  aria-label={`Remove the ${v.name} view`}
                  className="bg-background text-muted-foreground hover:text-destructive focus-visible:ring-ring absolute -top-1.5 -right-1.5 rounded-full border p-0.5 opacity-100 focus-visible:ring-2 focus-visible:outline-none md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                  onClick={() =>
                    start(async () => {
                      const r = await deleteView(v.id)
                      if (r.ok) toast.success(r.message)
                      else toast.error(r.message)
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
              className="hover:bg-background focus-visible:ring-ring rounded p-1 focus-visible:ring-2 focus-visible:outline-none"
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
                <Label htmlFor="filter-field" className="text-xs">Where</Label>
                <Select
                  value={field}
                  onValueChange={(f) => {
                    setField(f)
                    setValue("")
                  }}
                >
                  <SelectTrigger id="filter-field">
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
                <Label htmlFor="filter-value" className="text-xs">Is</Label>
                <Select value={value} onValueChange={setValue}>
                  <SelectTrigger id="filter-value">
                    <SelectValue placeholder="Choose" />
                  </SelectTrigger>
                  <SelectContent>
                    {!fieldDef || fieldDef.options.length === 0 ? (
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
            <Button variant="ghost" size="sm" onClick={() => router.push(base)}>
              Clear
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSaving(true)}>
              <Bookmark /> Save view
            </Button>
          </>
        )}

        <form action={`/${object}`} role="search" className="ml-auto">
          {/* Keep the filters, and the page's own settings, when searching. */}
          {[...current.entries()]
            .filter(([k]) => k !== "q")
            .map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
          <div className="relative">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
            <Input
              name="q"
              defaultValue={current.get("q") ?? ""}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
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
        <p role="status" className="text-muted-foreground flex items-center gap-2 text-xs">
          <Loader2 className="size-3 animate-spin" /> Working…
        </p>
      )}
    </div>
  )
}
