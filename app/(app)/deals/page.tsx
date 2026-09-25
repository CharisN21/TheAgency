import { HandCoins } from "lucide-react"

import { Band, BandStat } from "@/components/app/band"
import { PageHeader } from "@/components/app/page-header"
import { getPipeline, listOrganisations } from "@/lib/data/queries"
import { requireContext } from "@/lib/data/session"
import { can, money, moneyShort } from "@/lib/data/types"
import { NewDeal } from "./new-deal"
import { PipelineBoard, type BoardDeal } from "./pipeline-board"

const initials = (name?: string) =>
  (name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

export default async function DealsPage() {
  const { workspace, role } = await requireContext()
  const [pipeline, organisations] = await Promise.all([
    getPipeline(workspace.id),
    listOrganisations(workspace.id),
  ])

  const deals: BoardDeal[] = pipeline.columns.flatMap((c) =>
    c.deals.map((d) => ({
      id: d.id,
      title: d.title,
      value: d.value,
      stage: d.stage,
      organisationId: d.organisation_id,
      organisationName: d.organisation?.name,
      contactName: d.contact?.full_name,
      ownerInitials: initials(d.owner?.full_name),
      expected: d.expected_close,
      daysInStage: d.daysInStage,
    }))
  )

  const stats = [
    { label: "Open pipeline", value: money(pipeline.openValue), help: "Everything not yet won or lost" },
    { label: "Weighted forecast", value: money(Math.round(pipeline.forecast)), help: "Open value × the odds at each stage" },
    { label: "Won this month", value: money(pipeline.wonThisMonth), help: "Closed and agreed" },
    { label: "Closing soon", value: String(pipeline.closingSoon.length), help: "Due in the next two weeks" },
  ]

  return (
    <div className="flex min-h-svh flex-col">
      <PageHeader title="Deals" meta={`${deals.length} · ${moneyShort(pipeline.openValue)} open`}>
        {can.edit(role) && <NewDeal organisations={organisations} />}
      </PageHeader>

      <main className="flex-1">
        <Band tone="accent" index={0} wide label="Pipeline numbers">
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            {stats.map((s) => (
              <BandStat key={s.label} label={s.label} value={s.value} help={s.help} />
            ))}
          </div>
        </Band>

        <Band index={1} wide label="Pipeline board">
          {deals.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
              <HandCoins className="text-ink-3 size-9" />
              <h3 className="font-semibold">No deals yet</h3>
              <p className="text-muted-foreground max-w-sm text-sm">
                A deal is anything with a number on it that you are trying to win or buy. Open one
                and drag it across the board as it moves.
              </p>
              {can.edit(role) && <NewDeal organisations={organisations} variant="empty" />}
            </div>
          ) : (
            <PipelineBoard deals={deals} canEdit={can.edit(role)} />
          )}

          {!can.edit(role) && deals.length > 0 && (
            <p className="text-muted-foreground mt-2 text-sm">
              You are a viewer here, so deals cannot be moved.
            </p>
          )}
        </Band>
      </main>
    </div>
  )
}
