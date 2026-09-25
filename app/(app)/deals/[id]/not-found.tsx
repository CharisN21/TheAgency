import Link from "next/link"
import { Handshake } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function DealNotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 px-6 text-center">
      <Handshake className="text-ink-3 size-9" />
      <h1 className="font-semibold">That deal is not here</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        It may have been removed, or it belongs to another workspace.
      </p>
      <Button asChild variant="outline">
        <Link href="/deals">Back to deals</Link>
      </Button>
    </div>
  )
}
