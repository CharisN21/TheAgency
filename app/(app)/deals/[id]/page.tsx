import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Building2, CalendarClock, Mail, MessageCircle, Phone } from "lucide-react"

import { LogActivity } from "@/app/(app)/organisations/[id]/record-actions"
import { Band, BandTitle } from "@/components/app/band"
import { PageHeader } from "@/components/app/page-header"
import { NewTask, TaskList } from "@/components/app/tasks"
import { CustomValues } from "@/components/app/custom-fields"
import { Timeline } from "@/components/app/timeline"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getCustomValues, getDeal, listAssignees, listMembers, listTasks } from "@/lib/data/queries"
import { requireTab } from "@/lib/data/session"
import { can, money, moneyShort, stageOf } from "@/lib/data/types"
import { EditDeal, StageSteps } from "./deal-actions"

const longDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "—"

/** "in 6 days", "today", "3 days late" — and whether it is late. */
function closing(iso?: string) {
  if (!iso) return null
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5)
  if (days < 0) return { text: `${Math.abs(days)} day${days === -1 ? "" : "s"} late`, late: true }
  if (days === 0) return { text: "today", late: false }
  return { text: `in ${days} day${days === 1 ? "" : "s"}`, late: false }
}

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, workspace, role } = await requireTab("deals")
  const [found, members, tasks, assignees, customFields] = await Promise.all([
    getDeal(workspace.id, id),
    listMembers(workspace.id),
    listTasks(workspace.id, { deal: id, withDone: true }),
    listAssignees(workspace.id),
    getCustomValues(workspace.id, "deals", id),
  ])
  if (!found) notFound()

  const { deal, organisation, contact, owner, daysInStage, orgContacts, otherDeals, activities } =
    found
  const stage = stageOf(deal.stage)
  const open = deal.stage !== "won" && deal.stage !== "lost"
  const due = open ? closing(deal.expected_close) : null
  const editable = can.edit(role)

  return (
    <div className="flex min-h-svh flex-col">
      <PageHeader title={deal.title} meta={stage.label}>
        {editable && (
          <EditDeal
            dealId={deal.id}
            title={deal.title}
            value={deal.value}
            expectedClose={deal.expected_close}
            contactId={deal.contact_id}
            ownerId={deal.owner_id}
            contacts={orgContacts.map((c) => ({
              value: c.id,
              label: c.title ? `${c.full_name} · ${c.title}` : c.full_name,
            }))}
            owners={members
              .filter((m) => can.work(m.role))
              .map((m) => ({ value: m.id, label: m.full_name }))}
          />
        )}
      </PageHeader>

      <main className="flex-1">
        {/* The lead band: what it is worth and where it stands. */}
        <Band tone="maroon" index={0} label="Where this deal stands">
          <Link
            href="/deals"
            className="text-muted-foreground hover:text-foreground mb-3 inline-flex min-h-11 items-center gap-1 text-sm"
          >
            <ArrowLeft className="size-4" /> All deals
          </Link>

          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
            <div className="min-w-0">
              {organisation && (
                <Link
                  href={`/organisations/${organisation.id}`}
                  className="text-accent-foreground inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                >
                  <Building2 className="size-4" /> {organisation.name}
                </Link>
              )}
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-balance md:text-3xl">
                {deal.title}
              </h1>
            </div>

            <div className="flex gap-6 md:gap-10">
              <div>
                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  Worth
                </p>
                <p className="text-2xl font-bold tabular-nums md:text-3xl">{money(deal.value)}</p>
              </div>
              {open && (
                <div>
                  <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    Expected
                  </p>
                  <p className="text-2xl font-bold tabular-nums md:text-3xl">
                    {moneyShort(Math.round(deal.value * stage.probability))}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {Math.round(stage.probability * 100)}% at {stage.label.toLowerCase()}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <StageSteps dealId={deal.id} title={deal.title} stage={deal.stage} canEdit={editable} />
          </div>

          <p className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {deal.stage === "won" && (
              <Badge className="bg-ok text-white">Won {longDate(deal.closed_at)}</Badge>
            )}
            {deal.stage === "lost" && (
              <span className="flex flex-wrap items-center gap-2">
                <Badge variant="destructive">Lost {longDate(deal.closed_at)}</Badge>
                {deal.lost_reason && <span>{deal.lost_reason}</span>}
                {editable && <span>Tap a stage above to reopen it.</span>}
              </span>
            )}
            {open && (
              <span>
                {daysInStage === 0
                  ? "Moved here today"
                  : `${daysInStage} day${daysInStage === 1 ? "" : "s"} in ${stage.label.toLowerCase()}`}
                {daysInStage > 14 && <span className="text-warn font-medium"> · going slow</span>}
              </span>
            )}
            {due && (
              <span
                className={
                  due.late
                    ? "text-warn flex items-center gap-1 font-medium"
                    : "flex items-center gap-1"
                }
              >
                <CalendarClock className="size-4" /> Closes {due.text}
              </span>
            )}
          </p>
        </Band>

        {/* Who and what. */}
        <Band index={1} label="Details">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <BandTitle>Who you deal with</BandTitle>
              <Card className="py-0">
                <CardContent className="p-4">
                  {contact ? (
                    <div className="flex items-center gap-3">
                      <span className="bg-fill-strong grid size-10 shrink-0 place-items-center rounded-full text-xs font-semibold">
                        {contact.full_name
                          .split(" ")
                          .map((p) => p[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <Link href={`/people/${contact.id}`} className="block truncate font-medium hover:underline">
                          {contact.full_name}
                        </Link>
                        <span className="text-muted-foreground block truncate text-sm">
                          {contact.title ?? contact.email ?? "—"}
                        </span>
                      </span>
                      <span className="flex gap-1">
                        {contact.phone && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              aria-label={`Call ${contact.full_name}`}
                            >
                              <a href={`tel:${contact.phone.replace(/\s/g, "")}`}>
                                <Phone />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              aria-label={`WhatsApp ${contact.full_name}`}
                            >
                              <a
                                href={`https://wa.me/?text=${encodeURIComponent(`Hi ${contact.full_name.split(" ")[0]}, about ${deal.title}:`)}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <MessageCircle />
                              </a>
                            </Button>
                          </>
                        )}
                        {contact.email && (
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            aria-label={`Email ${contact.full_name}`}
                          >
                            <a
                              href={`mailto:${contact.email}?subject=${encodeURIComponent(deal.title)}`}
                            >
                              <Mail />
                            </a>
                          </Button>
                        )}
                      </span>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Nobody named yet.
                      {editable ? " Use Edit to choose someone at the organisation." : ""}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div>
              <BandTitle>The deal</BandTitle>
              <Card className="py-0">
                <CardContent className="divide-border grid grid-cols-2 divide-y p-0">
                  {[
                    ["Owner", owner?.full_name ?? "—"],
                    ["Expected to close", longDate(deal.expected_close)],
                    ["Opened", longDate(deal.created_at)],
                    ["Last moved", longDate(deal.stage_changed_at)],
                  ].map(([label, value], i) => (
                    <div
                      key={label}
                      className={i % 2 === 0 ? "border-border border-r px-4 py-2.5" : "px-4 py-2.5"}
                    >
                      <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                        {label}
                      </p>
                      <p className="text-sm">{value}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <div className="mt-3">
                <CustomValues
                  object="deals"
                  recordId={deal.id}
                  fields={customFields}
                  canEdit={editable}
                  canManage={can.editWorkspace(role)}
                />
              </div>
            </div>
          </div>

          {otherDeals.length > 0 && organisation && (
            <div className="mt-6">
              <BandTitle>Also with {organisation.name}</BandTitle>
              <Card className="py-0">
                <CardContent className="divide-border divide-y p-0">
                  {otherDeals.map((d) => (
                    <Link
                      key={d.id}
                      href={`/deals/${d.id}`}
                      className="hover:bg-muted/50 flex min-h-12 items-center gap-3 px-4 py-2.5 transition-colors"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{d.title}</span>
                      <Badge variant={d.stage === "won" ? "default" : "secondary"}>
                        {stageOf(d.stage).label}
                      </Badge>
                      <span className="text-sm tabular-nums">{money(d.value)}</span>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </Band>

        {/* What has to happen next. */}
        <Band tone="soft" index={2} label="Tasks">
          <BandTitle
            action={
              editable && (
                <NewTask
                  assignees={assignees}
                  defaultAssignee={deal.owner_id}
                  links={{
                    deal_id: deal.id,
                    organisation_id: deal.organisation_id,
                    contact_id: deal.contact_id,
                  }}
                  context={`On ${deal.title}. It shows on the deal and on their page.`}
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
            empty="No tasks on this deal. Add the next thing someone has to do to move it."
          />
        </Band>

        {/* What happened. */}
        <Band index={3} label="History" className="pb-10">
          <BandTitle>Everything that happened</BandTitle>
          {editable && (
            <Card className="mb-5 py-0">
              <CardContent className="p-3">
                <LogActivity
                  organisationId={deal.organisation_id}
                  dealId={deal.id}
                  contactId={deal.contact_id}
                />
              </CardContent>
            </Card>
          )}
          <Timeline
            activities={activities}
            people={found.people}
            empty="Nothing logged on this deal yet. Calls, messages and every move between stages show up here."
          />
        </Band>
      </main>
    </div>
  )
}
