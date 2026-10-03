import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, MessageCircleQuestion } from "lucide-react"

import { Band, BandStat, BandTitle } from "@/components/app/band"
import { Spark, WeeklyBars } from "@/components/app/charts"
import { PageHeader } from "@/components/app/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "cn"
import { getAnalytics } from "@/lib/data/queries"
import { requireContext } from "@/lib/data/session"
import { HEALTH, can } from "@/lib/data/types"

const pct = (n: number | null) => (n === null ? "—" : `${n}%`)

export default async function AnalyticsPage() {
  const { workspace, role } = await requireContext()
  // Owners and admins only. Everyone else learns nothing, not even that it exists.
  if (!can.editWorkspace(role)) notFound()

  const { overall, people, projects, weekLabels } = await getAnalytics(workspace.id)

  return (
    <div className="flex min-h-svh flex-col">
      <PageHeader title="Analytics" meta="Owners and admins" />

      <main className="flex-1">
        <Band tone="ink" index={0} label="Across the workspace">
          <Link
            href="/projects"
            className="text-muted-foreground hover:text-foreground mb-3 inline-flex min-h-11 items-center gap-1 text-sm"
          >
            <ArrowLeft className="size-4" /> Projects
          </Link>
          <p className="text-muted-foreground mb-4 flex items-start gap-2 text-sm">
            <MessageCircleQuestion className="mt-0.5 size-4 shrink-0" />
            These numbers are here to start conversations, not to rank anyone. Only owners and
            admins see this page.
          </p>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <BandStat
              label="Completion"
              value={pct(overall.completion)}
              help={`${overall.done} of ${overall.total} tasks done`}
            />
            <BandStat
              label="On time"
              value={pct(overall.onTime)}
              help="Of finished tasks with a due date"
            />
            <BandStat
              label="Overdue now"
              value={String(overall.overdue)}
              help="Open and past their due day"
              tone={overall.overdue > 0 ? "warn" : undefined}
            />
          </div>
        </Band>

        <Band index={1} label="Trend">
          <BandTitle>Tasks finished each week</BandTitle>
          <Card className="py-0">
            <CardContent className="p-4">
              <WeeklyBars values={overall.trend} labels={weekLabels} />
            </CardContent>
          </Card>
        </Band>

        <Band tone="soft" index={2} label="By person">
          <BandTitle>By person · in alphabetical order</BandTitle>
          <Card className="overflow-x-auto py-0">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="text-muted-foreground border-border border-b text-left text-xs">
                  <th className="px-4 py-2.5 font-medium">Person</th>
                  <th className="px-2 py-2.5 text-right font-medium">Open</th>
                  <th className="px-2 py-2.5 text-right font-medium">Done, 30 days</th>
                  <th className="px-2 py-2.5 text-right font-medium">On time</th>
                  <th className="px-2 py-2.5 text-right font-medium">Overdue</th>
                  <th className="px-4 py-2.5 font-medium">Six weeks</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {people.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2.5">
                      <Link href={`/team/${p.id}`} className="font-medium hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{p.open}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{p.doneLast30}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{pct(p.onTime)}</td>
                    <td
                      className={cn(
                        "px-2 py-2.5 text-right tabular-nums",
                        p.overdue > 0 && "text-warn font-medium",
                      )}
                    >
                      {p.overdue}
                    </td>
                    <td className="px-4 py-2.5">
                      <Spark values={p.trend} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <p className="text-muted-foreground mt-2 text-xs">
            Someone with overdue tasks may simply have too many. Open their page before drawing a
            conclusion.
          </p>
        </Band>

        <Band index={3} label="By project" className="pb-10">
          <BandTitle>By project · ongoing</BandTitle>
          {projects.length === 0 ? (
            <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-6 text-center text-sm">
              No ongoing projects.
            </p>
          ) : (
            <Card className="py-0">
              <CardContent className="divide-border divide-y p-0">
                {projects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="hover:bg-muted/50 flex min-h-14 flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm transition-colors"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                    <span
                      className={cn(
                        "inline-flex h-6 items-center rounded-full px-2 text-xs font-medium",
                        HEALTH[p.health].tone,
                      )}
                    >
                      {HEALTH[p.health].label}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {pct(p.completion)} done
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {pct(p.onTime)} on time
                    </span>
                    <span
                      className={cn(
                        "tabular-nums",
                        p.overdue > 0 ? "text-warn font-medium" : "text-muted-foreground",
                      )}
                    >
                      {p.overdue} overdue
                    </span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </Band>
      </main>
    </div>
  )
}
