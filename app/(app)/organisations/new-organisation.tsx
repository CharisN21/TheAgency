"use client"

import { useRef, useState, useTransition } from "react"
import { Building2, Loader2, Plus } from "lucide-react"
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
import { SimilarWarning } from "@/components/app/similar-warning"
import { createOrganisation, type Similar } from "@/lib/data/actions"
import { ORG_CATEGORIES, ORG_CATEGORY_LABEL, type OrgCategory } from "@/lib/data/types"

export function NewOrganisation({ variant = "default" }: { variant?: "default" | "empty" }) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<OrgCategory>("supplier")
  const [pending, start] = useTransition()
  const [similar, setSimilar] = useState<Similar | null>(null)
  const last = useRef<FormData | null>(null)

  function submit(formData: FormData) {
    formData.set("category", category)
    last.current = formData
    start(async () => {
      const result = await createOrganisation(formData)
      if (result.ok) {
        setOpen(false)
        toast.success(result.message, { description: "Add the people you deal with there next." })
      } else if (result.similar) {
        setSimilar(result.similar)
      } else {
        toast.error(result.message)
      }
    })
  }

  function addAnyway() {
    if (!last.current || !similar) return
    last.current.set("confirm", "1")
    last.current.set("not_duplicate_of", similar.id)
    setSimilar(null)
    submit(last.current)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        setSimilar(null)
      }}
    >
      <DialogTrigger asChild>
        {variant === "empty" ? (
          <Button size="lg">
            <Building2 /> Add your first organisation
          </Button>
        ) : (
          <Button size="sm">
            <Plus /> Organisation
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form
          // onSubmit, not action: an action empties the form, and after a warning
          // the person should still see what they typed.
          onSubmit={(e) => {
            e.preventDefault()
            submit(new FormData(e.currentTarget))
          }}
          onChange={() => setSimilar(null)}
        >
          <DialogHeader>
            <DialogTitle>Add an organisation</DialogTitle>
            <DialogDescription>
              A business you buy from, sell to or work with. People and deals hang off it.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="org-name">Name</Label>
              <Input id="org-name" name="name" placeholder="Vision Safety" autoFocus required />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="org-category">They are a</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as OrgCategory)}>
                <SelectTrigger id="org-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORG_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {ORG_CATEGORY_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="org-location">Where</Label>
              <Input id="org-location" name="location" placeholder="Industrial Area, Nairobi" />
            </div>

            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="org-what">What they do</Label>
              <Input id="org-what" name="what_they_do" placeholder="PPE, masks and safety wear" />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="org-phone">Phone</Label>
              <Input id="org-phone" name="phone" placeholder="+254 7…" />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="org-email">Email</Label>
              <Input id="org-email" name="email" type="email" placeholder="hello@example.co.ke" />
            </div>

            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="org-tags">Tags</Label>
              <Input id="org-tags" name="tags" placeholder="PPE, KEBS certified" />
              <p className="text-muted-foreground text-sm">Separate with commas.</p>
            </div>
          </div>

          {similar && (
            <SimilarWarning similar={similar} pending={pending} onAddAnyway={addAnyway} />
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || similar !== null}>
              {pending ? (
                <>
                  <Loader2 className="animate-spin" /> Adding…
                </>
              ) : (
                "Add organisation"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
