import { Suspense } from "react"
import { Building2, Upload } from "lucide-react"

import Link from "next/link"

import { DuplicatesNotice } from "@/components/app/duplicates"
import { PageHeader } from "@/components/app/page-header"
import { Button } from "@/components/ui/button"
import {
  listDuplicateOrganisations,
  listMembers,
  listOrganisations,
  listTags,
  listViews,
} from "@/lib/data/queries"
import { requireContext } from "@/lib/data/session"
import { can, money } from "@/lib/data/types"
import { FilterBar } from "./filter-bar"
import { NewOrganisation } from "./new-organisation"
import { OrgTable } from "./org-table"

const initials = (name?: string) =>
  (name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

export default async function OrganisationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const { user, workspace, role } = await requireContext()
  const sp = await searchParams

  const [rows, members, tags, views, duplicates] = await Promise.all([
    listOrganisations(workspace.id, {
      q: sp.q,
      category: sp.category,
      owner: sp.owner,
      tag: sp.tag,
      stale: sp.stale ? Number(sp.stale) : undefined,
      hasDeals: sp.hasDeals,
      sort: sp.sort,
    }),
    listMembers(workspace.id),
    listTags(workspace.id),
    listViews(workspace.id, user.id, "organisations"),
    listDuplicateOrganisations(workspace.id),
  ])

  const totalOpen = rows.reduce((s, r) => s + r.openValue, 0)
  const filtered = Object.keys(sp).some((k) => sp[k])

  return (
    <div className="flex min-h-svh flex-col">
      <PageHeader title="Organisations" meta={`${rows.length} · ${money(totalOpen)} open`}>
        {can.edit(role) && (
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/organisations/import">
                <Upload /> Import
              </Link>
            </Button>
            <NewOrganisation />
          </>
        )}
      </PageHeader>

      <main className="flex-1 px-4 py-6 md:px-8">
        <DuplicatesNotice count={duplicates.length} href="/organisations/duplicates" />
        <Suspense fallback={<div className="h-20" />}>
          <FilterBar
            people={members.map((m) => ({ value: m.id, label: m.full_name }))}
            tags={tags}
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

        {rows.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
            <Building2 className="text-ink-3 size-9" />
            <h3 className="font-semibold">
              {filtered ? "Nothing matches that" : "No organisations yet"}
            </h3>
            <p className="text-muted-foreground max-w-sm text-sm">
              {filtered
                ? "Clear a filter, or try another saved view."
                : "Every supplier, client and partner you deal with lives here, with their people and their deals."}
            </p>
            {!filtered && can.edit(role) && (
              <div className="flex flex-wrap justify-center gap-2">
                <NewOrganisation variant="empty" />
                <Button asChild variant="outline" size="lg">
                  <Link href="/organisations/import">
                    <Upload /> Import a spreadsheet
                  </Link>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <OrgTable
            rows={rows.map((o) => ({
              id: o.id,
              name: o.name,
              subtitle: o.what_they_do ?? o.location ?? "—",
              category: o.category,
              people: o.people,
              openDeals: o.openDeals,
              openValue: o.openValue,
              daysSinceContact: o.daysSinceContact,
              ownerInitials: initials(o.owner?.full_name),
              ownerName: o.owner?.full_name ?? "Unassigned",
            }))}
            people={members.map((m) => ({ value: m.id, label: m.full_name }))}
            canEdit={can.edit(role)}
            canDelete={can.editWorkspace(role)}
          />
        )}
      </main>
    </div>
  )
}
