import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Phone, Plus, Users } from "lucide-react"

import { Band, BandTitle } from "@/components/app/band"
import { PageHeader } from "@/components/app/page-header"
import { NewTask, TaskList } from "@/components/app/tasks"
import { Timeline } from "@/components/app/timeline"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { NewDeal } from "@/app/(app)/deals/new-deal"
import { getOrganisation, listAssignees, listOrganisations, listTasks } from "@/lib/data/queries"
import { requireContext } from "@/lib/data/session"
import { ORG_CATEGORY_LABEL, can, money, stageOf } from "@/lib/data/types"
import { AddContact, LogActivity } from "./record-actions"

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

export default async function OrganisationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { workspace, role, user } = await requireContext()
  const found = await getOrganisation(workspace.id, id)
  if (!found) notFound()

  const { organisation: o, owner, contacts, deals, activities, openValue, wonValue } = found
  const [organisations, tasks, assignees] = await Promise.all([
    listOrganisations(workspace.id),
    listTasks(workspace.id, { organisation: id, withDone: true }),
    listAssignees(workspace.id),
  ])
  const editable = can.edit(role)

  return (
    <div className="flex min-h-svh flex-col">
      <PageHeader title={o.name} meta={ORG_CATEGORY_LABEL[o.category]}>
        {editable && (
          <NewDeal organisations={organisations} fixedOrganisationId={o.id} variant="inline" />
        )}
      </PageHeader>

      <main className="flex-1">
        {/* The lead band: who they are and what they are worth to you. */}
        <Band tone="accent" index={0} label="About them">
          <Link
            href="/organisations"
            className="text-muted-foreground hover:text-foreground mb-3 inline-flex min-h-11 items-center gap-1 text-sm"
          >
            <ArrowLeft className="size-4" /> All organisations
          </Link>

          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
            <div className="flex min-w-0 items-center gap-4">
              <span className="bg-card text-accent-foreground border-primary/15 grid size-14 shrink-0 place-items-center rounded-xl border text-xl font-bold">
                {o.name.trim()[0]?.toUpperCase()}
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold tracking-tight md:text-3xl">{o.name}</h1>
                <p className="text-muted-foreground truncate text-sm">{o.what_they_do ?? "—"}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant="secondary">{ORG_CATEGORY_LABEL[o.category]}</Badge>
                  {o.tags.map((t) => (
                    <Badge key={t} variant="outline" className="bg-card/60">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-6 md:gap-10">
              {[
                ["Open deals", openValue > 0 ? money(openValue) : "None"],
                ["Won so far", wonValue > 0 ? money(wonValue) : "—"],
                ["People", String(contacts.length)],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    {label}
                  </p>
                  <p className="text-xl font-bold tabular-nums md:text-2xl">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </Band>

        <Band index={1} label="Record">
          <div className="grid gap-6 md:grid-cols-[220px_1fr] xl:grid-cols-[240px_1fr_280px]">
            {/* Properties */}
            <aside className="flex flex-col gap-4">
              <Card className="py-0">
                <CardContent className="divide-border divide-y p-0">
                  {[
                    ["Where", o.location ?? "—"],
                    ["Phone", o.phone ?? "—"],
                    ["Email", o.email ?? "—"],
                    ["Owner", owner?.full_name ?? "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="px-4 py-2.5">
                      <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                        {label}
                      </p>
                      <p className="text-sm">{value}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </aside>

            {/* Timeline */}
            <section className="flex flex-col gap-4">
              {editable && (
                <Card className="py-0">
                  <CardContent className="p-3">
                    <LogActivity organisationId={o.id} />
                  </CardContent>
                </Card>
              )}

              <div>
                <h3 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
                  Everything that happened
                </h3>
                <Timeline
                  activities={activities}
                  people={found.people}
                  empty="Nothing logged yet. Every call, message and change shows up here."
                />
              </div>
            </section>

            {/* Related */}
            <aside className="flex flex-col gap-6 md:col-span-2 xl:col-span-1">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    People
                  </h3>
                  {editable && <AddContact organisationId={o.id} organisationName={o.name} />}
                </div>
                {contacts.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nobody added yet.</p>
                ) : (
                  <Card className="py-0">
                    <CardContent className="divide-border divide-y p-0">
                      {contacts.map((c) => (
                        <div key={c.id} className="flex items-center gap-3 px-3 py-2.5">
                          <span className="bg-fill-strong grid size-8 shrink-0 place-items-center rounded-full text-[10px] font-semibold">
                            {initials(c.full_name)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                              {c.full_name}
                            </span>
                            <span className="text-muted-foreground block truncate text-xs">
                              {c.title ?? c.email ?? "—"}
                            </span>
                          </span>
                          {c.phone && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              asChild
                              aria-label={`Call ${c.full_name}`}
                            >
                              <a href={`tel:${c.phone.replace(/\s/g, "")}`}>
                                <Phone />
                              </a>
                            </Button>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    Deals
                  </h3>
                  {editable && deals.length > 0 && (
                    <Button variant="ghost" size="icon-sm" asChild aria-label="All deals">
                      <Link href="/deals">
                        <Plus />
                      </Link>
                    </Button>
                  )}
                </div>
                {deals.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No deals with them yet.</p>
                ) : (
                  <Card className="py-0">
                    <CardContent className="divide-border divide-y p-0">
                      {deals.map((d) => {
                        const stage = stageOf(d.stage)
                        return (
                          <Link
                            key={d.id}
                            href={`/deals/${d.id}`}
                            className="hover:bg-muted/50 block px-3 py-2.5"
                          >
                            <p className="truncate text-sm font-medium">{d.title}</p>
                            <p className="mt-0.5 flex items-center gap-2 text-xs">
                              <span className="tabular-nums">{money(d.value)}</span>
                              <Badge
                                variant={d.stage === "won" ? "default" : "secondary"}
                                className="h-5"
                              >
                                {stage.label}
                              </Badge>
                            </p>
                          </Link>
                        )
                      })}
                    </CardContent>
                  </Card>
                )}
              </div>

              <div>
                <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                  Who can see this
                </h3>
                <p className="text-muted-foreground flex items-start gap-2 text-sm">
                  <Users className="mt-0.5 size-4 shrink-0" />
                  Everyone in {workspace.name}. Your other workspaces never see it.
                </p>
                {!editable && (
                  <p className="bg-warn-soft mt-3 rounded-lg px-3 py-2 text-sm">
                    You are a viewer, {user.full_name.split(" ")[0]} — you can read this record but
                    not change it.
                  </p>
                )}
              </div>
            </aside>
          </div>
        </Band>

        <Band tone="soft" index={2} label="Tasks" className="pb-10">
          <BandTitle
            action={
              editable && (
                <NewTask
                  assignees={assignees}
                  defaultAssignee={o.owner_id}
                  links={{ organisation_id: o.id }}
                  context={`For ${o.name}. It shows here and on their page.`}
                />
              )
            }
          >
            Tasks
          </BandTitle>
          <TaskList
            tasks={tasks}
            canEdit={editable}
            assignees={assignees}
            userId={user.id}
            isAdmin={can.editWorkspace(role)}
            empty={`No tasks for ${o.name}.`}
          />
        </Band>
      </main>
    </div>
  )
}
