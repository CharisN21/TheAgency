"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

/** Confirms what just happened, then cleans the URL so a refresh stays quiet. */
export function WelcomeToast() {
  const params = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const created = params.get("created")
    const joined = params.get("joined")
    if (!created && !joined) return

    toast.success(created ? "Workspace created" : "You're in", {
      description: created
        ? "Invite your team next — they only ever see this workspace."
        : "This workspace is now in your switcher, top left.",
    })
    router.replace("/today")
  }, [params, router])

  return null
}
