import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Building2, Clock, Contact, HandCoins } from "lucide-react"

import { Band, BandStat, BandTitle, toneAfterLead } from "@/components/app/band"
import { PageHeader } from "@/components/app/page-header"
import { NewObjective, Objectives } from "@/components/app/objectives"
import { NewTask, TaskList } from "@/components/app/tasks"
import { Timeline } from "@/components/app/timeline"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { getMemberOverview, listAssignees, listObjectives, listTasks } from "@/lib/data/queries"
import { requireContext } from "@/lib/data/session"
import { ORG_CATEGORY_LABEL, ROLE_LABEL, can, money, moneyShort, stageOf } from "@/lib/data/types"

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

function touch(days: number | null) {
  if (days === null) return { text: "No date set", tone: "text-muted-foreground" }
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, tone: "text-warn font-medium" }
  if (days === 0) return { text: "today", tone: "text-warn font-medium" }
  return { text: `in ${days}d`, tone: "text-muted-foreground" }
}

function quiet(days: number | null) {
  if (days === null) return { text: "Never contacted", tone: "text-warn" }
  if (days >= 30) return { text: `${days} days quiet`, tone: "text-warn" }
  return { text: days === 0 ? "Spoken to today" : `${days}d ago`, tone: "text-muted-foreground" }
}

function Empty({ icon: Icon, children }: { icon: typeof Contact; children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground flex items-center gap-2 rounded-xl border border-dashed px-4 py-6 text-sm">
      <Icon className="text-ink-3 size-4 shrink-0" />
      {children}
    </p>
  )
}

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, workspace, role } = await requireContext()
  // Someone who may not see this page learns nothing about it, not even that it exists.
  if (!can.viewMember(role, user.id, id)) notFound()

  const [found, tasks, assignees] = await Promise.all([
    getMemberOverview(workspace.id, id),
    listTasks(workspace.id, { assignee: id, withDone: true }),
    listAssignees(workspace.id),
  ])
  if (!found) notFound()
  const canEdit = can.edit(role)
  const objectives = await listObjectives(workspace.id, id)
  // You set your own objectives; owners and admins set anyone's.
  const canSetObjectives =
    canEdit && (id === user.id || can.editWorkspace(role)) && found.member.role !== "viewer"

  const { member, organisations, contacts, openDeals, closedDeals } = found
  const self = member.id === user.id
  const first = self ? "you" : member.full_name.split(" ")[0]
  const whose = self ? "Your" : `${first}'s`

  return (
    <div className="flex min-h-svh flex-col">
      <PageHeader title={self ? "Your page" : member.full_name} meta={ROLE_LABEL[member.role]} />

      <main className="flex-1">
        <Band tone="accent" index={0} label={`${member.full_name} at a glance`}>
          <Link
            href="/team"
            className="text-muted-foreground hover:text-foreground mb-3 inline-flex min-h-11 items-center gap-1 text-sm"
          >
            <ArrowLeft className="size-4" /> Team
          </Link>

          <div className="flex items-center gap-4">
            <span className="bg-card text-accent-foreground border-primary/15 grid size-14 shrink-0 place-items-center rounded-full border text-lg font-bold">
              {initials(member.full_name)}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold tracking-tight md:text-3xl">
                {member.full_name}
              </h1>
              <p className="text-muted-foreground truncate text-sm">
                {member.title ? `${member.title} · ` : ""}
                {ROLE_LABEL[member.role]} in {workspace.name}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            <BandStat
              label="Open deals"
              value={moneyShort(found.openValue)}
              help={`${openDeals.length} deal${openDeals.length === 1 ? "" : "s"} on the table`}
            />
            <BandStat
              label="Won this month"
              value={moneyShort(found.wonThisMonth)}
              help="Closed and agreed"
            />
            <BandStat
              label="Speak to today"
              value={String(found.touchesDue)}
              help={`Of ${contacts.length} ${contacts.length === 1 ? "person" : "people"} ${first} keep${self ? "" : "s"} in touch with`}
              tone={found.touchesDue > 0 ? "warn" : undefined}
            />
            <BandStat
              label="Logged, 30 days"
              value={String(found.loggedLast30Days)}
              help="Calls, visits, messages, notes"
            />
          </div>
        </Band>

        <Band tone={toneAfterLead(0)} index={1} label="Objectives">
          <BandTitle
            action={
              canSetObjectives && (
                <NewObjective ownerId={member.id} forName={self ? undefined : first} />
              )
            }
          >
            {whose} objectives
          </BandTitle>
          <Objectives
            objectives={objectives}
            canEdit={canSetObjectives}
            empty={canSetObjectives ? "Nothing set. Add one worth reaching." : "Nothing set."}
          />
        </Band>

        <Band tone={toneAfterLead(1)} index={2} label="Tasks">
          <BandTitle
            action={
              canEdit && (
                <NewTask
                  assignees={assignees}
                  defaultAssignee={member.id}
                  context={
                    self
                      ? "For you, unless you choose someone else."
                      : `For ${first}, unless you choose someone else.`
                  }
                />
              )
            }
          >
            {whose} tasks
          </BandTitle>
          <TaskList
            tasks={tasks}
            canEdit={canEdit}
            assignees={assignees}
            userId={user.id}
            isAdmin={can.editWorkspace(role)}
            showAssignee={false}
            empty={
              self
                ? "Nothing on your list. Add a task, or finish one elsewhere."
                : `Nothing on ${first}'s list.`
            }
          />
        </Band>

        {/* Then people: they are what needs doing today. */}
        <Band tone={toneAfterLead(2)} index={3} label="People">
          <BandTitle>
            People {first} {self ? "are" : "is"} contacting
          </BandTitle>
          {contacts.length === 0 ? (
            <Empty icon={Contact}>
              Nobody yet. People {self ? "you add" : `${first} adds`} to an organisation show up
              here.
            </Empty>
          ) : (
            <Card className="py-0">
              <CardContent className="divide-border divide-y p-0">
                {contacts.map((c) => {
                  const t = touch(c.touchDueInDays)
                  return (
                    <Link
                      key={c.id}
                      href={c.organisation ? `/organisations/${c.organisation.id}` : "/people"}
                      className="hover:bg-muted/50 flex min-h-14 items-center gap-3 px-4 py-2.5 transition-colors"
                    >
                      <span className="bg-fill-strong grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold">
                        {initials(c.full_name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{c.full_name}</span>
                        <span className="text-muted-foreground block truncate text-xs">
                          {c.title ? `${c.title} · ` : ""}
                          {c.organisation?.name ?? "No organisation"}
                        </span>
                      </span>
                      <span className={`flex items-center gap-1 text-xs ${t.tone}`}>
                        <Clock className="size-3" /> {t.text}
                      </span>
                    </Link>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </Band>

        <Band tone={toneAfterLead(3)} index={4} label="Deals">
          <BandTitle>{whose} deals</BandTitle>
          {openDeals.length === 0 && closedDeals.length === 0 ? (
            <Empty icon={HandCoins}>No deals yet.</Empty>
          ) : (
            <Card className="py-0">
              <CardContent className="divide-border divide-y p-0">
                {[...openDeals, ...closedDeals].map((d) => {
                  const stage = stageOf(d.stage)
                  return (
                    <Link
                      key={d.id}
                      href={`/deals/${d.id}`}
                      className="hover:bg-muted/50 flex min-h-14 items-center gap-3 px-4 py-2.5 transition-colors"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{d.title}</span>
                        <span className="text-muted-foreground block truncate text-xs">
                          {d.organisation?.name ?? "No organisation"}
                          {d.stage === "lost" && d.lost_reason ? ` · ${d.lost_reason}` : ""}
                        </span>
                      </span>
                      <Badge variant={d.stage === "won" ? "default" : "secondary"}>
                        {stage.label}
                      </Badge>
                      <span className="text-sm font-semibold tabular-nums">{money(d.value)}</span>
                    </Link>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </Band>

        <Band tone={toneAfterLead(4)} index={5} label="Organisations">
          <BandTitle>
            Organisations {first} look{self ? "" : "s"} after
          </BandTitle>
          {organisations.length === 0 ? (
            <Empty icon={Building2}>
              None yet. An organisation belongs to whoever added it, until someone reassigns it.
            </Empty>
          ) : (
            <Card className="py-0">
              <CardContent className="divide-border divide-y p-0">
                {organisations.map((o) => {
                  const q = quiet(o.daysSinceContact)
                  return (
                    <Link
                      key={o.id}
                      href={`/organisations/${o.id}`}
                      className="hover:bg-muted/50 flex min-h-14 items-center gap-3 px-4 py-2.5 transition-colors"
                    >
                      <span className="bg-accent text-accent-foreground grid size-9 shrink-0 place-items-center rounded-lg text-sm font-bold">
                        {o.name.trim()[0]?.toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{o.name}</span>
                        <span className="text-muted-foreground block truncate text-xs">
                          {ORG_CATEGORY_LABEL[o.category]}
                          {o.openValue > 0 ? ` · ${money(o.openValue)} open` : ""}
                        </span>
                      </span>
                      <span className={`text-xs ${q.tone}`}>{q.text}</span>
                    </Link>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </Band>

        <Band tone={toneAfterLead(5)} index={6} label="Recent activity" className="pb-10">
          <BandTitle>What {first} logged lately</BandTitle>
          <Timeline
            activities={found.activities}
            people={found.people}
            empty={`Nothing logged yet. Calls, visits and messages ${first} record${self ? "" : "s"} show up here.`}
          />
        </Band>
      </main>
    </div>
  )
}
