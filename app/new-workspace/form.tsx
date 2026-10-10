"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { createVenture } from "@/lib/data/actions"

const COLOURS = [
  { value: "#7c1f35", name: "Maroon" },
  { value: "#186b33", name: "Green" },
  { value: "#0b62c4", name: "Blue" },
  { value: "#9c7a45", name: "Brass" },
  { value: "#1b1719", name: "Ink" },
]

export function NewCompanyForm() {
  const [pending, start] = useTransition()
  const [name, setName] = useState("")
  const [accent, setAccent] = useState(COLOURS[0].value)
  const [preview, setPreview] = useState<string | null>(null)

  function submit(formData: FormData) {
    formData.set("accent", accent)
    start(async () => {
      const result = await createVenture(formData)
      if (result && !result.ok) toast.error(result.message)
    })
  }

  const initial = name.trim()[0]?.toUpperCase() ?? "?"

  return (
    <form action={submit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Venture name</Label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Telecast"
          className="h-11"
          maxLength={80}
          autoFocus
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="workspace">First workspace</Label>
        <Input id="workspace" name="workspace" placeholder="Marketing and sales" defaultValue="Main team" maxLength={80} className="h-11" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="title">
          Your title <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input id="title" name="title" placeholder="Founder" className="h-11" />
      </div>

      <div className="flex flex-col gap-3">
        <Label>Colour</Label>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            {COLOURS.map((c) => (
              <button
                key={c.value}
                type="button"
                aria-label={c.name}
                aria-pressed={accent === c.value}
                onClick={() => setAccent(c.value)}
                style={{ backgroundColor: c.value }}
                className={cn(
                  "size-8 rounded-full transition",
                  accent === c.value &&
                    "ring-ring ring-offset-background ring-2 ring-offset-2"
                )}
              />
            ))}
          </div>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- a preview of the file just chosen
            <img src={preview} alt="" className="ml-auto size-11 rounded-lg object-cover" />
          ) : (
            <span
              className="ml-auto grid size-11 place-items-center rounded-lg text-lg font-bold text-white"
              style={{ backgroundColor: accent }}
            >
              {initial}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="logo">
          Logo <span className="text-muted-foreground">(optional, JPG, PNG or WebP, up to 2 MB)</span>
        </Label>
        <Input
          id="logo"
          name="logo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="h-11 py-2"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (preview) URL.revokeObjectURL(preview)
            setPreview(file ? URL.createObjectURL(file) : null)
          }}
        />
      </div>

      <Button type="submit" size="lg" disabled={pending} className="mt-2 self-start">
        {pending ? (
          <>
            <Loader2 className="animate-spin" /> Creating…
          </>
        ) : (
          "Start venture"
        )}
      </Button>
    </form>
  )
}
