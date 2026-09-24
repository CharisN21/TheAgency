"use client"

import { useTransition } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { acceptInvite } from "@/lib/data/actions"

export function AcceptButton({
  token,
  workspaceName,
}: {
  token: string
  workspaceName: string
}) {
  const [pending, start] = useTransition()

  return (
    <Button
      size="lg"
      className="mt-6 w-full"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await acceptInvite(token)
          // Joining redirects; anything returned here is a problem worth showing.
          if (result && !result.ok) toast.error(result.message)
        })
      }
    >
      {pending ? (
        <>
          <Loader2 className="animate-spin" /> Joining…
        </>
      ) : (
        `Join ${workspaceName}`
      )}
    </Button>
  )
}
