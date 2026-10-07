import { Suspense } from "react"
import Link from "next/link"
import { HandCoins, KanbanSquare, List } from "lucide-react"

import { Band, BandStat } from "@/components/app/band"
import { FilterBar } from "@/components/app/filter-bar"
import { PageHeader } from "@/components/app/page-header"
import { cn } from "cn"
import { getPipeline, listMembers, listOrganisations, listViews } from "@/lib/data/queries"
import { requireContext } from "@/lib/data/session"
import { can, money, moneyShort } from "@/lib/data/types"
import { DealTable } from "./deal-table"
import { NewDeal } from "./new-deal"
import { PipelineBoard, type BoardDeal } from "./pipeline-board"

const initials = (name?: string) =>
  (name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const { user, workspace, role } = await requireContext()
  const sp = await searchParams
  const asList = sp.view === "list"
  const filters = {
    q: sp.q,
    owner: sp.owner,
    organisation: sp.organisation,
    closing: sp.closing,
    min: sp.min,
  }
  const filtered = Object.values(filters).some(Boolean)

  const [everything, pipeline, organisations, members, views] = await Promise.all([
    getPipeline(workspace.id),
    getPipeline(workspace.id, filters),
    listOrganisations(workspace.id, { sort: "name" }),
    listMembers(workspace.id),
    listViews(workspace.id, user.id, "deals"),
  ])

  const deals = pipeline.columns.flatMap((c) => c.deals)
  const board: BoardDeal[] = deals.map((d) => ({
    id: d.id,
    title: d.title,
    value: d.value,
    stage: d.stage,
    organisationId: d.organisation_id,
    organisationName: d.organisation?.name,
    contactName: d.contact?.full_name,
    ownerInitials: initials(d.owner?.full_name),
    ownerName: d.owner?.full_name,
    expected: d.expected_close,
    daysInStage: d.daysInStage,
  }))

  // The lead numbers are for every deal, whatever the filter.
  const stats = [
    {
      label: "Open pipeline",
      value: money(everything.openValue),
      help: "Everything not yet won or lost",
    },
    {
      label: "Weighted forecast",
      value: money(Math.round(everything.forecast)),
      help: "Open value × the odds at each stage",
    },
    { label: "Won this month", value: money(everything.wonThisMonth), help: "Closed and agreed" },
    {
      label: "Closing soon",
      value: String(everything.closingSoon.length),
      help: "Due in the next two weeks",
    },
  ]
  const total = everything.columns.reduce((s, c) => s + c.deals.length, 0)

  // The Board / List switch keeps whatever filters are on.
  const withView = (view: "board" | "list") => {
    const next = new URLSearchParams(
      Object.entries(sp).filter((e): e is [string, string] => Boolean(e[1]) && e[0] !== "view"),
    )
    if (view === "list") next.set("view", "list")
    const q = next.toString()
    return q ? `/deals?${q}` : "/deals"
  }

  return (
    <div className="flex min-h-svh flex-col">
      <PageHeader title="Deals" meta={`${total} · ${moneyShort(everything.openValue)} open`}>
        {can.edit(role) && <NewDeal organisations={organisations} />}
      </PageHeader>

      <main className="flex-1">
        <Band tone="maroon" index={0} wide label="Pipeline numbers">
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            {stats.map((s) => (
              <BandStat key={s.label} lead={s === stats[0]} label={s.label} value={s.value} help={s.help} />
            ))}
          </div>
        </Band>

        <Band index={1} wide label="Deals" className="pb-10">
          {total === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
              <HandCoins className="text-ink-3 size-9" />
              <h2 className="font-semibold">No deals yet</h2>
              <p className="text-muted-foreground max-w-sm text-sm">
                A deal is anything with a number on it that you are trying to win or buy. Open one
                and drag it across the board as it moves, or use the Move button on its card.
              </p>
              {can.edit(role) && <NewDeal organisations={organisations} variant="empty" />}
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center gap-1" role="group" aria-label="Show deals as">
                {(
                  [
                    ["board", "Board", KanbanSquare],
                    ["list", "List", List],
                  ] as const
                ).map(([key, label, Icon]) => {
                  const on = (key === "list") === asList
                  return (
                    <Link
                      key={key}
                      href={withView(key)}
                      aria-current={on ? "page" : undefined}
                      className={cn(
                        "focus-visible:ring-ring inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
                        on ? "bg-card border shadow-xs" : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      <Icon className="size-4" /> {label}
                    </Link>
                  )
                })}
              </div>

              <Suspense fallback={<div className="h-20" />}>
                <FilterBar
                  object="deals"
                  searchPlaceholder="Search deals"
                  sticky={["view"]}
                  fields={[
                    {
                      key: "closing",
                      label: "Closes",
                      options: [
                        { value: "late", label: "late" },
                        { value: "week", label: "within a week" },
                        { value: "month", label: "within a month" },
                      ],
                      phrase: "Closes {}",
                    },
                    {
                      key: "owner",
                      label: "Owner",
                      options: members.map((m) => ({ value: m.id, label: m.full_name })),
                      phrase: "Owned by {}",
                    },
                    {
                      key: "organisation",
                      label: "Organisation",
                      options: organisations.map((o) => ({ value: o.id, label: o.name })),
                      phrase: "With {}",
                    },
                    {
                      key: "min",
                      label: "Worth",
                      options: [
                        { value: "100000", label: "KSh 100,000 or more" },
                        { value: "500000", label: "KSh 500,000 or more" },
                        { value: "1000000", label: "KSh 1,000,000 or more" },
                      ],
                      phrase: "Worth {}",
                    },
                  ]}
                  views={views.map((v) => ({
                    id: v.id,
                    name: v.name,
                    query: v.query,
                    shared: v.shared,
                    mine: v.user_id === user.id,
                  }))}
                  canShare={can.edit(role)}
                />
              </Suspense>

              {deals.length === 0 ? (
                <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center">
                  <h3 className="font-semibold">No deals match that</h3>
                  <p className="text-muted-foreground text-sm">
                    {filtered
                      ? "Clear a filter, or try another saved view."
                      : "Try another search."}
                  </p>
                </div>
              ) : asList ? (
                <DealTable
                  rows={deals.map((d) => ({
                    id: d.id,
                    title: d.title,
                    organisation: d.organisation
                      ? { id: d.organisation.id, name: d.organisation.name }
                      : undefined,
                    contactName: d.contact?.full_name,
                    value: d.value,
                    stage: d.stage,
                    closesInDays: d.closesInDays,
                    ownerInitials: initials(d.owner?.full_name),
                    ownerName: d.owner?.full_name ?? "Unassigned",
                  }))}
                  owners={members
                    .filter((m) => m.role !== "viewer")
                    .map((m) => ({ value: m.id, label: m.full_name }))}
                  canEdit={can.edit(role)}
                  canDelete={can.editWorkspace(role)}
                />
              ) : (
                <div className="mt-4">
                  <PipelineBoard deals={board} canEdit={can.edit(role)} />
                </div>
              )}

              {!can.edit(role) && (
                <p className="text-muted-foreground mt-2 text-sm">
                  You are a viewer here, so deals cannot be moved.
                </p>
              )}
            </>
          )}
        </Band>
      </main>
    </div>
  )
}
