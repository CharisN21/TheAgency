import { Suspense } from "react"
import Link from "next/link"
import { Contact } from "lucide-react"

import { Band, BandStat } from "@/components/app/band"
import { DuplicatesNotice } from "@/components/app/duplicates"
import { FilterBar } from "@/components/app/filter-bar"
import { PageHeader } from "@/components/app/page-header"
import { Button } from "@/components/ui/button"
import {
  listContacts,
  listDuplicatePeople,
  listMembers,
  listOrganisations,
  listPeopleTags,
  listViews,
} from "@/lib/data/queries"
import { requireTab } from "@/lib/data/session"
import { can } from "@/lib/data/types"
import { PeopleTable } from "./people-table"

const initials = (name?: string) =>
  (name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const { user, workspace, role } = await requireTab("people")
  const sp = await searchParams

  const [shown, everyone, duplicates, members, organisations, tags, views] = await Promise.all([
    listContacts(workspace.id, {
      q: sp.q,
      owner: sp.owner,
      organisation: sp.organisation,
      tag: sp.tag,
      touch: sp.touch,
    }),
    listContacts(workspace.id),
    listDuplicatePeople(workspace.id),
    listMembers(workspace.id),
    listOrganisations(workspace.id, { sort: "name" }),
    listPeopleTags(workspace.id),
    listViews(workspace.id, user.id, "people"),
  ])

  // The lead numbers are for everyone, whatever the filter.
  const due = everyone.filter((p) => (p.touchDueInDays ?? 99) <= 0).length
  const thisWeek = everyone.filter(
    (p) => (p.touchDueInDays ?? -1) >= 1 && (p.touchDueInDays ?? 99) <= 7,
  ).length
  const undated = everyone.filter((p) => p.touchDueInDays === null).length
  const filtered = Object.keys(sp).some((k) => sp[k])

  return (
    <div className="flex min-h-svh flex-col">
      <PageHeader
        title="People"
        meta={due > 0 ? `${everyone.length} · ${due} to speak to` : `${everyone.length}`}
      />

      <main className="flex-1">
        {everyone.length > 0 && (
          <Band tone="maroon" index={0} label="Who to speak to">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <BandStat
                lead label="Speak to today"
                value={String(due)}
                help={due === 0 ? "Nobody is waiting on you" : "Due today or overdue"}
                tone={due > 0 ? "warn" : undefined}
              />
              <BandStat
                label="Later this week"
                value={String(thisWeek)}
                help="Due in the next 7 days"
              />
              <BandStat
                label="No date set"
                value={String(undated)}
                help="Set one so nobody goes quiet"
              />
            </div>
            {duplicates.length > 0 && (
              <div className="mt-4">
                <DuplicatesNotice count={duplicates.length} href="/people/duplicates" />
              </div>
            )}
          </Band>
        )}

        <Band index={1} wide label="Everyone" className="pb-10">
          {everyone.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
              <Contact className="text-ink-3 size-9" />
              <h2 className="font-semibold">Nobody here yet</h2>
              <p className="text-muted-foreground max-w-sm text-sm">
                People are added from the organisation they work for, so their history stays in one
                place. Open an organisation and add someone.
              </p>
              <Button asChild variant="outline">
                <Link href="/organisations">Go to organisations</Link>
              </Button>
            </div>
          ) : (
            <>
              <Suspense fallback={<div className="h-20" />}>
                <FilterBar
                  object="people"
                  searchPlaceholder="Search people"
                  fields={[
                    {
                      key: "touch",
                      label: "Speak next",
                      options: [
                        { value: "due", label: "due now" },
                        { value: "week", label: "within a week" },
                        { value: "none", label: "no date set" },
                      ],
                      phrase: "Speak next: {}",
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
                      phrase: "At {}",
                    },
                    {
                      key: "tag",
                      label: "Tag",
                      options: tags.map((t) => ({ value: t, label: t })),
                      phrase: "Tagged {}",
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

              {shown.length === 0 ? (
                <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center">
                  <h2 className="font-semibold">Nobody matches that</h2>
                  <p className="text-muted-foreground text-sm">
                    {filtered
                      ? "Clear a filter, or try another saved view."
                      : "Try another search."}
                  </p>
                </div>
              ) : (
                <PeopleTable
                  rows={shown.map((p) => ({
                    id: p.id,
                    name: p.full_name,
                    title: p.title,
                    organisation: p.organisation
                      ? { id: p.organisation.id, name: p.organisation.name }
                      : undefined,
                    touchDueInDays: p.touchDueInDays,
                    tags: p.tags,
                    phone: p.phone,
                    email: p.email,
                    ownerInitials: initials(p.owner?.full_name),
                    ownerName: p.owner?.full_name ?? "Unassigned",
                  }))}
                  owners={members
                    .filter((m) => can.work(m.role))
                    .map((m) => ({ value: m.id, label: m.full_name }))}
                  canEdit={can.edit(role)}
                  canDelete={can.editWorkspace(role)}
                />
              )}
            </>
          )}
        </Band>
      </main>
    </div>
  )
}
