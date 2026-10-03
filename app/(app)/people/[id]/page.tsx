import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Building2, CalendarClock, Mail, MessageCircle, Phone } from "lucide-react"

import { LogActivity } from "@/app/(app)/organisations/[id]/record-actions"
import { Band, BandTitle } from "@/components/app/band"
import { CustomValues } from "@/components/app/custom-fields"
import { PageHeader } from "@/components/app/page-header"
import { NewTask, TaskList } from "@/components/app/tasks"
import { Timeline } from "@/components/app/timeline"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  getCustomValues,
  getPerson,
  listAssignees,
  listOrganisations,
  listTasks,
} from "@/lib/data/queries"
import { requireContext } from "@/lib/data/session"
import { can, money, stageOf } from "@/lib/data/types"
import { EditPerson } from "./edit-person"

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

const longDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "—"

function touch(days: number | null) {
  if (days === null) return { text: "No date set to speak again", tone: "text-muted-foreground" }
  if (days < 0)
    return { text: `${Math.abs(days)} days overdue to speak to`, tone: "text-warn font-medium" }
  if (days === 0) return { text: "Speak to them today", tone: "text-warn font-medium" }
  return {
    text: `Speak again in ${days} day${days === 1 ? "" : "s"}`,
    tone: "text-muted-foreground",
  }
}

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, workspace, role } = await requireContext()
  const [found, tasks, assignees, organisations, customFields] = await Promise.all([
    getPerson(workspace.id, id),
    listTasks(workspace.id, { contact: id, withDone: true }),
    listAssignees(workspace.id),
    listOrganisations(workspace.id, { sort: "name" }),
    getCustomValues(workspace.id, "people", id),
  ])
  if (!found) notFound()

  const { person: p, organisation, owner, deals, colleagues, activities } = found
  const editable = can.edit(role)
  const t = touch(found.touchDueInDays)
  const first = p.full_name.split(" ")[0]

  return (
    <div className="flex min-h-svh flex-col">
      <PageHeader title={p.full_name} meta={p.title}>
        {editable && (
          <EditPerson
            person={p}
            organisations={organisations.map((o) => ({ value: o.id, label: o.name }))}
            owners={assignees}
          />
        )}
      </PageHeader>

      <main className="flex-1">
        <Band tone="maroon" index={0} label={`${p.full_name} at a glance`}>
          <Link
            href="/people"
            className="text-muted-foreground hover:text-foreground mb-3 inline-flex min-h-11 items-center gap-1 text-sm"
          >
            <ArrowLeft className="size-4" /> All people
          </Link>

          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
            <div className="flex min-w-0 items-center gap-4">
              <span className="bg-card text-accent-foreground border-primary/15 grid size-14 shrink-0 place-items-center rounded-full border text-lg font-bold">
                {initials(p.full_name)}
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold tracking-tight md:text-3xl">
                  {p.full_name}
                </h1>
                <p className="text-muted-foreground truncate text-sm">
                  {p.title ? `${p.title} · ` : ""}
                  {organisation ? (
                    <Link
                      href={`/organisations/${organisation.id}`}
                      className="text-accent-foreground font-medium hover:underline"
                    >
                      {organisation.name}
                    </Link>
                  ) : (
                    "No organisation"
                  )}
                </p>
                {p.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="bg-card/60">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {p.phone && (
                <>
                  <Button asChild variant="outline" size="sm" className="bg-card/70">
                    <a href={`tel:${p.phone.replace(/\s/g, "")}`}>
                      <Phone /> Call
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="bg-card/70">
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Hi ${first},`)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle /> WhatsApp
                    </a>
                  </Button>
                </>
              )}
              {p.email && (
                <Button asChild variant="outline" size="sm" className="bg-card/70">
                  <a href={`mailto:${p.email}`}>
                    <Mail /> Email
                  </a>
                </Button>
              )}
            </div>
          </div>

          <p className={`mt-4 flex items-center gap-1.5 text-sm ${t.tone}`}>
            <CalendarClock className="size-4" /> {t.text}
          </p>
        </Band>

        <Band index={1} label="Details">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-3">
              <BandTitle>Details</BandTitle>
              <Card className="py-0">
                <CardContent className="divide-border grid grid-cols-2 divide-y p-0">
                  {[
                    ["Phone", p.phone ?? "—"],
                    ["Email", p.email ?? "—"],
                    ["Owner", owner?.full_name ?? "—"],
                    ["Speak again on", longDate(p.next_touch_at)],
                  ].map(([label, value], i) => (
                    <div
                      key={label}
                      className={
                        i % 2 === 0
                          ? "border-border min-w-0 border-r px-4 py-2.5"
                          : "min-w-0 px-4 py-2.5"
                      }
                    >
                      <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                        {label}
                      </p>
                      <p className="truncate text-sm">{value}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <CustomValues
                object="people"
                recordId={p.id}
                fields={customFields}
                canEdit={editable}
                canManage={can.editWorkspace(role)}
              />
            </div>

            <div className="flex flex-col gap-6">
              <div>
                <BandTitle>Deals with {first}</BandTitle>
                {deals.length === 0 ? (
                  <p className="text-muted-foreground text-sm">None yet.</p>
                ) : (
                  <Card className="py-0">
                    <CardContent className="divide-border divide-y p-0">
                      {deals.map((d) => (
                        <Link
                          key={d.id}
                          href={`/deals/${d.id}`}
                          className="hover:bg-muted/50 flex min-h-12 items-center gap-3 px-4 py-2.5 transition-colors"
                        >
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">
                            {d.title}
                          </span>
                          <Badge variant={d.stage === "won" ? "default" : "secondary"}>
                            {stageOf(d.stage).label}
                          </Badge>
                          <span className="text-sm tabular-nums">{money(d.value)}</span>
                        </Link>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
              {organisation && colleagues.length > 0 && (
                <div>
                  <BandTitle>Also at {organisation.name}</BandTitle>
                  <Card className="py-0">
                    <CardContent className="divide-border divide-y p-0">
                      {colleagues.map((c) => (
                        <Link
                          key={c.id}
                          href={`/people/${c.id}`}
                          className="hover:bg-muted/50 flex min-h-12 items-center gap-3 px-4 py-2 transition-colors"
                        >
                          <span className="bg-fill-strong grid size-8 shrink-0 place-items-center rounded-full text-[10px] font-semibold">
                            {initials(c.full_name)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                              {c.full_name}
                            </span>
                            <span className="text-muted-foreground block truncate text-xs">
                              {c.title ?? "—"}
                            </span>
                          </span>
                          <Building2 className="text-ink-3 size-4" />
                        </Link>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </Band>

        <Band tone="soft" index={2} label="Tasks">
          <BandTitle
            action={
              editable && (
                <NewTask
                  assignees={assignees}
                  defaultAssignee={p.owner_id}
                  links={{ contact_id: p.id, organisation_id: p.organisation_id }}
                  context={`About ${p.full_name}. It shows here and on their page.`}
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
            empty={`Nothing to do about ${first} yet.`}
          />
        </Band>

        <Band index={3} label="History" className="pb-10">
          <BandTitle>Everything that happened</BandTitle>
          {editable && (
            <Card className="mb-5 py-0">
              <CardContent className="p-3">
                <LogActivity organisationId={p.organisation_id} contactId={p.id} />
              </CardContent>
            </Card>
          )}
          <Timeline
            activities={activities}
            people={found.people}
            empty={`Nothing logged with ${first} yet. Calls, messages and visits show up here.`}
          />
        </Band>
      </main>
    </div>
  )
}
