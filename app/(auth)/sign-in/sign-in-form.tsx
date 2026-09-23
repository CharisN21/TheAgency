"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

type State = "idle" | "working" | "done" | "failed"

export function SignInForm({ configured }: { configured: boolean }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [state, setState] = useState<State>("idle")
  const [googleState, setGoogleState] = useState<State>("idle")

  async function signInWithGoogle() {
    if (!configured) {
      toast("Add your Supabase keys to .env.local first")
      return
    }
    setGoogleState("working")
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${location.origin}/auth/callback?next=/today` },
      })
      if (error) throw error
    } catch (e) {
      setGoogleState("failed")
      toast.error("That didn't work", {
        description: e instanceof Error ? e.message : "Try again in a moment.",
      })
    }
  }

  async function sendMagicLink(formData: FormData) {
    const address = String(formData.get("email") ?? "").trim()
    if (!address.includes("@") || address.endsWith("@")) {
      toast.error("Enter a full email address")
      return
    }
    if (!configured) {
      toast("Add your Supabase keys to .env.local first")
      return
    }

    setState("working")
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({
        email: address,
        options: { emailRedirectTo: `${location.origin}/auth/callback?next=/today` },
      })
      if (error) throw error
      setState("done")
      router.push(`/check-email?to=${encodeURIComponent(address)}`)
    } catch (e) {
      setState("failed")
      toast.error("That link didn't send", {
        description: e instanceof Error ? e.message : "Check the address and try again.",
      })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Button
        size="lg"
        variant="outline"
        className="w-full"
        onClick={signInWithGoogle}
        disabled={googleState === "working"}
      >
        {googleState === "working" ? (
          <>
            <Loader2 className="animate-spin" /> Opening Google…
          </>
        ) : (
          <>
            <span className="text-base font-bold">G</span> Continue with Google
          </>
        )}
      </Button>

      <div className="flex items-center gap-3">
        <span className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-sm">or</span>
        <span className="bg-border h-px flex-1" />
      </div>

      <form action={sendMagicLink} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@company.co.ke"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11"
          />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={state === "working"}>
          {state === "working" && (
            <>
              <Loader2 className="animate-spin" /> Sending link…
            </>
          )}
          {state === "done" && (
            <>
              <Check /> Link sent
            </>
          )}
          {(state === "idle" || state === "failed") &&
            (state === "failed" ? "Try again" : "Email me a sign-in link")}
        </Button>
      </form>
    </div>
  )
}
