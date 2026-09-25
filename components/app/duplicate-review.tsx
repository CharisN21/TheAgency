import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Band } from "@/components/app/band"
import { NoDuplicates, PairCard } from "@/components/app/duplicates"
import { MergeDialog, NotDuplicateButton } from "@/components/app/merge-dialog"
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

      <main className="flex-1">
        <Band tone="accent" index={0} narrow label="About this review">
          <Link
            href={`/${object}`}
            className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-1 text-sm"
          >
            <ArrowLeft className="size-4" /> All {label.toLowerCase()}
          </Link>
          <p className="text-muted-foreground text-sm">
            Pairs that share a phone number, an email or a name. Nothing is changed until you
            choose. Two different people can share a name — mark those as not a duplicate and they
            will not come back.
          </p>
        </Band>

        <Band index={1} narrow label="Pairs" className="pb-10">
          {pairs.length === 0 ? (
            <NoDuplicates what={workspaceName} />
          ) : (
            <div className="flex flex-col gap-4">
              {pairs.map((pair) => (
                <PairCard key={`${pair.a.id}|${pair.b.id}`} pair={pair}>
                  {can.merge(role) ? (
                    <div className="flex flex-wrap justify-end gap-2">
                      <NotDuplicateButton pair={pair} object={object} />
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
        </Band>
      </main>
    </div>
  )
}
