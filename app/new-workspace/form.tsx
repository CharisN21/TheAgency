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
        <p className="text-muted-foreground text-sm">You can add more workspaces later, one per team.</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="title">
          Your title <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input id="title" name="title" placeholder="Founder" className="h-11" />
        <p className="text-muted-foreground text-sm">
          Shown to your team next to your name.
        </p>
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
          <span
            className="ml-auto grid size-11 place-items-center rounded-lg text-lg font-bold text-white"
            style={{ backgroundColor: accent }}
          >
            {initial}
          </span>
        </div>
        <p className="text-muted-foreground text-sm">
          The venture&rsquo;s mark, on every workspace in it and on banners.
        </p>
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
