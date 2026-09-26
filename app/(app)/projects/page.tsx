import Link from "next/link"
import { AlertTriangle, CalendarClock, ChartColumn, FolderKanban } from "lucide-react"

import { Band, BandStat, BandTitle } from "@/components/app/band"
import { PageHeader } from "@/components/app/page-header"
import { ProgressRing } from "@/components/app/progress-ring"
import { ProjectForm } from "@/components/app/projects"
import { Button } from "@/components/ui/button"
import { cn } from "cn"
import { listAssignees, listOrganisations, listProjects, type ProjectRow } from "@/lib/data/queries"
import { requireContext } from "@/lib/data/session"
import { HEALTH, can } from "@/lib/data/types"

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

function checkIn(days: number) {
  if (days <= 0) return { text: "Check-in due today", tone: "text-warn font-medium" }
  if (days === 1) return { text: "Check-in tomorrow", tone: "" }
  return { text: `Check-in in ${days} days`, tone: "" }
}

function ProjectCard({ p }: { p: ProjectRow }) {
  const c = checkIn(p.checkInInDays)
  const ends =
    p.dueInDays === null
      ? null
      : p.dueInDays < 0
        ? `ended ${Math.abs(p.dueInDays)}d ago`
        : `ends in ${p.dueInDays}d`
  return (
    <Link
      href={`/projects/${p.id}`}
      className="bg-card hover:border-primary/40 focus-visible:ring-ring flex flex-col gap-3 rounded-xl border p-4 transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none"
    >
      <div className="flex items-start gap-3">
        <ProgressRing value={p.progress} health={p.health} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{p.name}</p>
          <p className="text-muted-foreground truncate text-sm">
            {p.organisation?.name ?? "Our own work"}
            {ends ? ` · ${ends}` : ""}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span
          className={cn(
            "inline-flex h-6 items-center rounded-full px-2 font-medium",
            HEALTH[p.health].tone,
          )}
        >
          {HEALTH[p.health].label}
        </span>
        <span className="text-muted-foreground">
          {p.tasks.done} of {p.tasks.total} tasks done
        </span>
        {p.tasks.overdue > 0 && (
          <span className="text-warn flex items-center gap-1 font-medium">
            <AlertTriangle className="size-3" /> {p.tasks.overdue} overdue
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="flex -space-x-1.5">
          {p.members.slice(0, 5).map((m) => (
            <span
              key={m.id}
              title={m.full_name}
              className="bg-fill-strong border-card grid size-7 place-items-center rounded-full border-2 text-[10px] font-semibold"
            >
              {initials(m.full_name)}
            </span>
          ))}
        </span>
        {p.status === "active" && (
          <span className={cn("text-muted-foreground flex items-center gap-1 text-xs", c.tone)}>
            <CalendarClock className="size-3" /> {c.text}
          </span>
        )}
      </div>
    </Link>
  )
}

export default async function ProjectsPage() {
  const { user, workspace, role } = await requireContext()
  const [projects, people, organisations] = await Promise.all([
    listProjects(workspace.id),
    listAssignees(workspace.id),
    listOrganisations(workspace.id, { sort: "name" }),
  ])
  const active = projects.filter((p) => p.status === "active")
  const closed = projects.filter((p) => p.status === "closed")
  const troubled = active.filter((p) => p.health !== "on_track").length
  const overdue = active.reduce((s, p) => s + p.tasks.overdue, 0)
  const checkIns = active.filter((p) => p.checkInInDays <= 0).length

  const form = can.edit(role) && (
    <ProjectForm
      values={{ lead_id: user.id, member_ids: [user.id], cadence: "weekly" }}
      people={people}
      organisations={organisations.map((o) => ({ value: o.id, label: o.name }))}
    />
  )

  return (
    <div className="flex min-h-svh flex-col">
      <PageHeader title="Projects" meta={`${active.length} ongoing`}>
        {can.editWorkspace(role) && (
          <Button asChild variant="outline" size="sm">
            <Link href="/projects/analytics">
              <ChartColumn /> Analytics
            </Link>
          </Button>
        )}
        {form}
      </PageHeader>

      <main className="flex-1">
        {projects.length > 0 && (
          <Band tone="accent" index={0} label="Projects at a glance">
            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
              <BandStat
                label="Ongoing"
                value={String(active.length)}
                help="Started and not yet closed"
              />
              <BandStat
                label="At risk or blocked"
                value={String(troubled)}
                help="Marked by the people on them"
                tone={troubled > 0 ? "warn" : undefined}
              />
              <BandStat
                label="Overdue tasks"
                value={String(overdue)}
                help="Across every ongoing project"
                tone={overdue > 0 ? "warn" : undefined}
              />
              <BandStat
                label="Check-ins due"
                value={String(checkIns)}
                help="Today, by each project's rhythm"
              />
            </div>
          </Band>
        )}

        <Band index={1} label="Ongoing projects" className={closed.length ? undefined : "pb-10"}>
          <BandTitle>Ongoing</BandTitle>
          {active.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
              <FolderKanban className="text-ink-3 size-9" />
              <h3 className="font-semibold">No projects yet</h3>
              <p className="text-muted-foreground max-w-sm text-sm">
                A project is work with an end: a campaign, a delivery, a move. Start one, add the
                people on it, and break it into tasks.
              </p>
              {form}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {active.map((p) => (
                <ProjectCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </Band>

        {closed.length > 0 && (
          <Band tone="soft" index={2} label="Closed projects" className="pb-10">
            <BandTitle>Closed</BandTitle>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {closed.map((p) => (
                <ProjectCard key={p.id} p={p} />
              ))}
            </div>
          </Band>
        )}
      </main>
    </div>
  )
}
