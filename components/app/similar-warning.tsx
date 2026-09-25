import Link from "next/link"
import { CopyCheck, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { Similar } from "@/lib/data/actions"

/** Shown inside an "add" dialog when the new record looks like one already here. */
export function SimilarWarning({
  similar,
  pending,
  onAddAnyway,
}: {
  similar: Similar
  pending: boolean
  onAddAnyway: () => void
}) {
  return (
    <div role="alert" className="bg-warn-soft mb-4 flex flex-col gap-3 rounded-lg p-3 text-sm">
      <p className="flex items-start gap-2">
        <CopyCheck className="text-warn mt-0.5 size-4 shrink-0" />
        <span>
          <span className="font-medium">Already here? </span>
          {similar.name}
          <span className="text-muted-foreground"> · {similar.detail}</span>
          <span className="text-warn block text-xs font-medium">{similar.reason}</span>
        </span>
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={similar.href}>Open {similar.name}</Link>
        </Button>
        <Button type="button" size="sm" onClick={onAddAnyway} disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          They are different, add anyway
        </Button>
      </div>
    </div>
  )
}
