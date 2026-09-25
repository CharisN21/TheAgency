import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { NoDuplicates, PairCard } from "@/components/app/duplicates"
import { MergeDialog } from "@/components/app/merge-dialog"
import { PageHeader } from "@/components/app/page-header"
import type { DuplicatePair } from "@/lib/data/queries"
import { can, type Role } from "@/lib/data/types"

/** The whole review screen, shared by People and Organisations. */
export function DuplicateReview({
  object,
  pairs,
  role,
  workspaceName,
}: {
  object: "people" | "organisations"
  pairs: DuplicatePair[]
  role: Role
  workspaceName: string
}) {
  const label = object === "people" ? "People" : "Organisations"

  return (
    <div className="flex min-h-svh flex-col">
      <PageHeader title="Possible duplicates" meta={`${label} · ${pairs.length}`} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-8">
        <Link
          href={`/${object}`}
          className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" /> All {label.toLowerCase()}
        </Link>
        <p className="text-muted-foreground mb-6 text-sm">
          Pairs that share a phone number, an email or a name. Nothing is changed until you
          choose.
        </p>

        {pairs.length === 0 ? (
          <NoDuplicates what={workspaceName} />
        ) : (
          <div className="flex flex-col gap-4">
            {pairs.map((pair) => (
              <PairCard key={`${pair.a.id}|${pair.b.id}`} pair={pair}>
                {can.merge(role) ? (
                  <div className="flex flex-wrap justify-end gap-2">
                    <MergeDialog pair={pair} object={object} />
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Only owners and admins can merge. Let one of them know.
                  </p>
                )}
              </PairCard>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
