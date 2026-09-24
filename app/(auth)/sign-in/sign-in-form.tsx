"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signIn } from "@/lib/data/actions"

export function SignInForm() {
  const [pending, start] = useTransition()
  const [busy, setBusy] = useState<"demo" | "email" | null>(null)

  function send(email: string, which: "demo" | "email") {
    setBusy(which)
    start(async () => {
      const data = new FormData()
      data.set("email", email)
      const result = await signIn(data)
      // A successful sign-in redirects, so anything returned here is a problem.
      if (result && !result.ok) {
        setBusy(null)
        toast.error(result.message)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Button
        size="lg"
        variant="outline"
        className="w-full"
        disabled={pending}
        onClick={() => send("charis@example.com", "demo")}
      >
        {busy === "demo" ? (
          <>
            <Loader2 className="animate-spin" /> Signing in…
          </>
        ) : (
          "Continue as Charis (demo)"
        )}
      </Button>

      <div className="flex items-center gap-3">
        <span className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-sm">or</span>
        <span className="bg-border h-px flex-1" />
      </div>

      <form
        className="flex flex-col gap-4"
        action={(formData: FormData) =>
          send(String(formData.get("email") ?? ""), "email")
        }
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@company.co.ke"
            className="h-11"
            required
          />
          <p className="text-muted-foreground text-sm">
            Any address works while we are on local data. Use a new one to see what a
            brand-new person sees.
          </p>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {busy === "email" ? (
            <>
              <Loader2 className="animate-spin" /> Signing in…
            </>
          ) : (
            "Continue with email"
          )}
        </Button>
      </form>
    </div>
  )
}
