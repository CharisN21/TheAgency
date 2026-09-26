import Link from "next/link"
import { notFound } from "next/navigation"
import { AlertTriangle, ArrowLeft, Building2, CalendarClock, HandCoins } from "lucide-react"

import { Band, BandTitle } from "@/components/app/band"
import { PageHeader } from "@/components/app/page-header"
import { ProgressRing } from "@/components/app/progress-ring"
import { HealthPill, ProjectForm, ProjectTasks } from "@/components/app/projects"
import { NewTask } from "@/components/app/tasks"
import { CheckInList, WriteCheckIn } from "@/components/app/check-ins"
import { RaiseFlag } from "@/components/app/flags"
import { Timeline } from "@/components/app/timeline"
import { Card, CardContent } from "@/components/ui/card"
import {
  draftCheckIn,
  getProject,
  listAssignees,
  listOrganisations,
  listTasks,
} from "@/lib/data/queries"
import { requireContext } from "@/lib/data/session"
import { can } from "@/lib/data/types"

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

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, workspace, role } = await requireContext()
  const [found, tasks, people, organisations] = await Promise.all([
    getProject(workspace.id, id),
    listTasks(workspace.id, { project: id, withDone: true }),
    listAssignees(workspace.id),
    listOrganisations(workspace.id, { sort: "name" }),
  ])
  if (!found) notFound()

  const { project: p } = found
  const editable = can.edit(role) && p.status === "active"
  // The people on the project check in; owners and admins can too.
  const mayCheckIn = editable && (p.member_ids.includes(user.id) || can.editWorkspace(role))
  const draft = mayCheckIn ? await draftCheckIn(workspace.id, id) : null
  const names = Object.fromEntries(found.people.map((x) => [x.id, x.full_name]))
  const checkIn =
    p.checkInInDays <= 0
      ? "due today"
      : p.checkInInDays === 1
        ? "tomorrow"
        : `in ${p.checkInInDays} days`

  return (
    <div className="flex min-h-svh flex-col">
      <PageHeader title={p.name} meta={p.status === "closed" ? "Closed" : "Project"}>
        {editable && (
          <ProjectForm
            values={{
              id: p.id,
              name: p.name,
              scope: p.scope,
              organisation_id: p.organisation_id,
              lead_id: p.lead_id,
              member_ids: p.member_ids,
              due_at: p.due_at,
              cadence: p.cadence,
            }}
            people={people}
            organisations={organisations.map((o) => ({ value: o.id, label: o.name }))}
          />
        )}
      </PageHeader>

      <main className="flex-1">
        <Band tone="accent" index={0} label="Where the project stands">
          <Link
            href="/projects"
            className="text-muted-foreground hover:text-foreground mb-3 inline-flex min-h-11 items-center gap-1 text-sm"
          >
            <ArrowLeft className="size-4" /> All projects
          </Link>

          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
            <div className="flex min-w-0 items-center gap-4">
              <ProgressRing value={p.progress} health={p.health} size={72} />
              <div className="min-w-0">
                {p.organisation && (
                  <Link
                    href={`/organisations/${p.organisation.id}`}
                    className="text-accent-foreground inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                  >
                    <Building2 className="size-4" /> {p.organisation.name}
                  </Link>
                )}
                <h1 className="truncate text-2xl font-bold tracking-tight md:text-3xl">{p.name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <HealthPill projectId={p.id} health={p.health} canEdit={editable} />
                  <span className="text-muted-foreground">
                    {p.tasks.done} of {p.tasks.total} tasks done
                  </span>
                  {p.tasks.overdue > 0 && (
                    <span className="text-warn flex items-center gap-1 font-medium">
                      <AlertTriangle className="size-3.5" /> {p.tasks.overdue} overdue
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-6 text-sm md:gap-10">
              <div>
                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  Ends
                </p>
                <p className="font-semibold">{longDate(p.due_at)}</p>
              </div>
              {p.status === "active" && (
                <div>
                  <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    Check-in
                  </p>
                  <p
                    className={
                      p.checkInInDays <= 0
                        ? "text-warn flex items-center gap-1 font-semibold"
                        : "flex items-center gap-1 font-semibold"
                    }
                  >
                    <CalendarClock className="size-4" /> {checkIn}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Band>

        <Band index={1} wide label="Tasks">
          <BandTitle
            action={
              editable && (
                <NewTask
                  assignees={people}
                  defaultAssignee={p.lead_id}
                  links={{
                    project_id: p.id,
                    organisation_id: p.organisation_id,
                    deal_id: p.deal_id,
                  }}
                  context={`In ${p.name}. It also shows on their page.`}
                />
              )
            }
          >
            Tasks
          </BandTitle>
          <ProjectTasks
            tasks={tasks}
            canEdit={editable}
            assignees={people}
            userId={user.id}
            isAdmin={can.editWorkspace(role)}
          />
        </Band>

        <Band tone="soft" index={2} label="Check-ins">
          <BandTitle
            action={
              draft && (
                <WriteCheckIn
                  projectId={p.id}
                  projectName={p.name}
                  draft={draft}
                  due={p.checkInInDays <= 0}
                />
              )
            }
          >
            Check-ins ·{" "}
            {p.cadence === "weekly"
              ? "every week"
              : p.cadence === "fortnightly"
                ? "every two weeks"
                : "every month"}
          </BandTitle>
          <CheckInList checkIns={found.checkIns} names={names} />
        </Band>

        <Band index={3} label="About the project">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <BandTitle>What done looks like</BandTitle>
              <Card className="py-0">
                <CardContent className="p-4 text-sm leading-relaxed">
                  {p.scope ?? (
                    <span className="text-muted-foreground">
                      Not written yet. Use Edit to add it.
                    </span>
                  )}
                  {p.deal && (
                    <Link
                      href={`/deals/${p.deal.id}`}
                      className="text-accent-foreground mt-3 flex items-center gap-1.5 font-medium hover:underline"
                    >
                      <HandCoins className="size-4" /> {p.deal.title}
                    </Link>
                  )}
                </CardContent>
              </Card>
            </div>
            <div>
              <BandTitle
                action={
                  editable && (
                    <RaiseFlag
                      people={p.members
                        .filter((m) => m.id !== user.id)
                        .map((m) => ({ value: m.id, label: m.full_name }))}
                      projects={[{ value: p.id, label: p.name }]}
                      projectId={p.id}
                      variant="ghost"
                    />
                  )
                }
              >
                Who is on it
              </BandTitle>
              <Card className="py-0">
                <CardContent className="divide-border divide-y p-0">
                  {p.members.map((m) => (
                    <div key={m.id} className="flex min-h-12 items-center gap-3 px-4 py-2">
                      <span className="bg-fill-strong grid size-8 shrink-0 place-items-center rounded-full text-[10px] font-semibold">
                        {initials(m.full_name)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {m.full_name}
                      </span>
                      {m.id === p.lead_id && (
                        <span className="text-muted-foreground text-xs">Lead</span>
                      )}
                      <span className="text-muted-foreground text-xs">
                        {tasks.filter((t) => t.assignee_id === m.id && t.status !== "done").length}{" "}
                        open
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </Band>

        <Band tone="soft" index={4} label="History" className="pb-10">
          <BandTitle>What happened</BandTitle>
          <Timeline
            activities={found.activities}
            people={found.people}
            empty="Nothing yet. Finished tasks, health changes and check-ins show up here."
          />
        </Band>
      </main>
    </div>
  )
}
