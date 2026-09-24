import Link from "next/link"
import { Building2, Search } from "lucide-react"

import { PageHeader } from "@/components/app/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { listOrganisations } from "@/lib/data/queries"
import { requireContext } from "@/lib/data/session"
import { ORG_CATEGORY_LABEL, can, money, type OrgCategory } from "@/lib/data/types"
import { NewOrganisation } from "./new-organisation"

const VIEWS = [
  { key: "", label: "All" },
  { key: "supplier", label: "Suppliers" },
  { key: "client", label: "Clients" },
  { key: "partner", label: "Partners" },
  { key: "prospect", label: "Prospects" },
]

function contactAge(days: number | null) {
  if (days === null) return { text: "Never", tone: "text-warn" }
  if (days === 0) return { text: "Today", tone: "text-muted-foreground" }
  if (days >= 30) return { text: `${days} days ago`, tone: "text-destructive font-medium" }
  return { text: `${days} ${days === 1 ? "day" : "days"} ago`, tone: "text-muted-foreground" }
}

export default async function OrganisationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; view?: string; stale?: string }>
}) {
  const { workspace, role } = await requireContext()
  const { q, view, stale } = await searchParams
  const rows = await listOrganisations(workspace.id, {
    q,
    category: view || undefined,
    stale: stale === "1",
  })
  const totalOpen = rows.reduce((s, r) => s + r.openValue, 0)

  return (
    <div className="flex min-h-svh flex-col">
      <PageHeader
        title="Organisations"
        meta={`${rows.length} · ${money(totalOpen)} open`}
      >
        {can.edit(role) && <NewOrganisation />}
      </PageHeader>

      <main className="flex-1 px-4 py-6 md:px-8">
        {/* Saved views. Each one is a link, so it is shareable and survives a refresh. */}
        <div className="flex flex-wrap items-center gap-2">
          {VIEWS.map((v) => {
            const on = (view ?? "") === v.key && stale !== "1"
            return (
              <Link
                key={v.key || "all"}
                href={v.key ? `/organisations?view=${v.key}` : "/organisations"}
                className={
                  on
                    ? "bg-accent text-accent-foreground rounded-full px-3 py-1 text-xs font-semibold"
                    : "text-muted-foreground hover:bg-muted rounded-full px-3 py-1 text-xs font-semibold"
                }
              >
                {v.label}
              </Link>
            )
          })}
          <Link
            href="/organisations?stale=1"
            className={
              stale === "1"
                ? "bg-accent text-accent-foreground rounded-full px-3 py-1 text-xs font-semibold"
                : "text-muted-foreground hover:bg-muted rounded-full px-3 py-1 text-xs font-semibold"
            }
          >
            Not touched in 30 days
          </Link>

          <form className="ml-auto flex items-center gap-2" action="/organisations">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
              <Input
                name="q"
                defaultValue={q ?? ""}
                placeholder="Search organisations"
                className="w-56 pl-8"
              />
            </div>
          </form>
        </div>

        {rows.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
            <Building2 className="text-ink-3 size-9" />
            <h3 className="font-semibold">
              {q || view || stale ? "Nothing matches that" : "No organisations yet"}
            </h3>
            <p className="text-muted-foreground max-w-sm text-sm">
              {q || view || stale
                ? "Try another view, or clear the search."
                : "Every supplier, client and partner you deal with lives here, with their people and their deals."}
            </p>
            {!q && !view && !stale && can.edit(role) && <NewOrganisation variant="empty" />}
          </div>
        ) : (
          <Card className="mt-4 py-0">
            <CardContent className="p-0">
              {/* Desktop: a real table. Phones get the same rows, stacked. */}
              <table className="w-full text-sm">
                <thead className="hidden md:table-header-group">
                  <tr className="text-muted-foreground border-border border-b text-left text-[11px] font-semibold tracking-wide uppercase">
                    <th className="px-4 py-2.5">Organisation</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5">People</th>
                    <th className="px-4 py-2.5">Open deals</th>
                    <th className="px-4 py-2.5">Last contact</th>
                    <th className="px-4 py-2.5">Owner</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {rows.map((o) => {
                    const age = contactAge(o.daysSinceContact)
                    return (
                      <tr key={o.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <Link href={`/organisations/${o.id}`} className="flex items-center gap-3">
                            <span className="bg-accent text-accent-foreground grid size-9 shrink-0 place-items-center rounded-md text-xs font-bold">
                              {o.name.trim()[0]?.toUpperCase()}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{o.name}</span>
                              <span className="text-muted-foreground block truncate text-xs">
                                {o.what_they_do ?? o.location ?? "—"}
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary">
                            {ORG_CATEGORY_LABEL[o.category as OrgCategory]}
                          </Badge>
                        </td>
                        <td className="text-muted-foreground px-4 py-3 tabular-nums">
                          {o.people}
                        </td>
                        <td className="px-4 py-3">
                          {o.openDeals > 0 ? (
                            <span className="tabular-nums">
                              <span className="font-medium">{money(o.openValue)}</span>
                              <span className="text-muted-foreground"> · {o.openDeals}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className={`px-4 py-3 ${age.tone}`}>{age.text}</td>
                        <td className="px-4 py-3">
                          <span className="bg-fill-strong grid size-7 place-items-center rounded-full text-[10px] font-semibold">
                            {o.owner?.full_name
                              .split(" ")
                              .map((p) => p[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
