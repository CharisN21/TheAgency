import Link from "next/link"
import { ArrowRight, Check, Clock, Search, TrendingUp, UserPlus } from "lucide-react"

import { Band, BandTitle, toneAfterLead } from "@/components/app/band"
import { PageHeader } from "@/components/app/page-header"
import { TaskList } from "@/components/app/tasks"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  getSetupState,
  getTodayNumbers,
  listAssignees,
  listTasks,
  pendingInviteCount,
} from "@/lib/data/queries"
import { requireContext } from "@/lib/data/session"
import { can, money, moneyShort, stageOf } from "@/lib/data/types"
import { WelcomeToast } from "./welcome-toast"

function Ring({ value, label }: { value: number; label: string }) {
  const r = 26
  const c = 2 * Math.PI * r
  return (
    <div className="relative size-16 shrink-0">
      <svg viewBox="0 0 64 64" className="size-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" className="stroke-fill-strong" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          className="stroke-primary"
          strokeDasharray={`${(c * value) / 100} ${c}`}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-xs font-semibold">
        {label}
      </span>
    </div>
  )
}

export default async function TodayPage() {
  const { user, workspace, role } = await requireContext()
  const [setup, numbers, pending, myTasks, assignees] = await Promise.all([
    getSetupState(workspace.id, user.id),
    getTodayNumbers(workspace.id),
    pendingInviteCount(workspace.id),
    listTasks(workspace.id, { assignee: user.id }),
    listAssignees(workspace.id),
  ])
  // Today shows what is late, due now or due soon; the rest waits on your page.
  const tasksNow = myTasks.filter((t) => t.dueInDays !== null && t.dueInDays <= 2).slice(0, 6)

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening"
  const firstName = user.full_name.split(" ")[0]
  const { pipeline, touchesDue, stale } = numbers

  // Which bands are showing decides their tone, so neighbours always differ.
  const shown = [
    tasksNow.length > 0 && "tasks",
    touchesDue.length > 0 && "speak",
    pipeline.closingSoon.length > 0 && "closing",
    setup.done < setup.total && "setup",
  ].filter(Boolean)
  const band = {
    tasks: shown.indexOf("tasks"),
    speak: shown.indexOf("speak"),
    closing: shown.indexOf("closing"),
    setup: shown.indexOf("setup"),
  }

  const steps = [
    {
      done: setup.hasWorkspace,
      title: "Create your workspace",
      meta: `${workspace.name} is ready.`,
    },
    { done: setup.signedIn, title: "Sign in", meta: "You are signed in." },
    {
      done: setup.invitedSomeone,
      title: "Invite your office team",
      meta:
        pending > 0
          ? `${pending} invite${pending === 1 ? "" : "s"} waiting.`
          : "Nobody else is here yet.",
      href: "/team",
      action: can.invite(role) ? "Invite" : "See team",
    },
    {
      done: setup.addedOrganisation,
      title: "Add your first organisation",
      meta: "A supplier, a client or a partner you deal with.",
      href: "/organisations",
      action: "Add",
    },
  ]

  return (
    <div className="flex min-h-svh flex-col">
      <WelcomeToast />

      <PageHeader title="Today">
        <span className="text-muted-foreground hidden items-center gap-2 text-sm md:flex">
          <Search className="size-4" /> Search
          <kbd className="border-border text-muted-foreground ml-1 rounded border px-1.5 text-[11px]">
            Ctrl K
          </kbd>
        </span>
        {can.invite(role) && (
          <Button asChild variant="secondary" size="sm">
            <Link href="/team?invite=1">
              <UserPlus /> Invite
            </Link>
          </Button>
        )}
      </PageHeader>

      <main className="flex-1">
        <Band tone="accent" index={0} narrow label="Your numbers">
          <p className="text-muted-foreground text-sm">{today}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {greeting}, {firstName}
          </h1>

          {/* The three numbers that matter before anything else. */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Link href="/deals">
              <Card className="hover:border-primary/40 h-full py-0 transition-colors">
                <CardContent className="p-4">
                  <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    Open pipeline
                  </p>
                  <p className="mt-1 text-xl font-bold tabular-nums">{money(pipeline.openValue)}</p>
                  <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                    <TrendingUp className="size-3" />
                    {moneyShort(Math.round(pipeline.forecast))} weighted
                  </p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/people">
              <Card className="hover:border-primary/40 h-full py-0 transition-colors">
                <CardContent className="p-4">
                  <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    People to speak to
                  </p>
                  <p className="mt-1 text-xl font-bold tabular-nums">{touchesDue.length}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {touchesDue.length === 0 ? "Nobody is waiting on you" : "Due today or overdue"}
                  </p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/organisations?stale=1">
              <Card className="hover:border-primary/40 h-full py-0 transition-colors">
                <CardContent className="p-4">
                  <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    Going quiet
                  </p>
                  <p className="mt-1 text-xl font-bold tabular-nums">{stale.length}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">No contact in 30 days</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </Band>

        {/* What you said you would do. */}
        {tasksNow.length > 0 && (
          <Band tone={toneAfterLead(band.tasks)} index={1} narrow label="Your tasks">
            <BandTitle
              action={
                <Link
                  href={`/team/${user.id}`}
                  className="text-primary flex min-h-8 items-center gap-1 normal-case"
                >
                  All your tasks <ArrowRight className="size-3" />
                </Link>
              }
            >
              Your tasks · due soon
            </BandTitle>
            <TaskList
              tasks={tasksNow}
              canEdit={can.edit(role)}
              assignees={assignees}
              userId={user.id}
              isAdmin={can.editWorkspace(role)}
              showAssignee={false}
              empty=""
            />
          </Band>
        )}

        {/* Who is waiting on you. */}
        {touchesDue.length > 0 && (
          <Band tone={toneAfterLead(band.speak)} index={2} narrow label="Speak to these people">
            <BandTitle>Speak to these people</BandTitle>
            <Card className="py-0">
              <CardContent className="divide-border divide-y p-0">
                {touchesDue.slice(0, 5).map((c) => (
                  <Link
                    key={c.id}
                    href={c.organisation ? `/organisations/${c.organisation.id}` : "/people"}
                    className="hover:bg-muted/50 flex items-center gap-3 px-4 py-3"
                  >
                    <span className="bg-accent text-accent-foreground grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold">
                      {c.full_name
                        .split(" ")
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{c.full_name}</span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {c.title ? `${c.title} · ` : ""}
                        {c.organisation?.name ?? "No organisation"}
                      </span>
                    </span>
                    <span className="text-warn flex items-center gap-1 text-xs font-medium">
                      <Clock className="size-3" />
                      {(c.touchDueInDays ?? 0) < 0
                        ? `${Math.abs(c.touchDueInDays ?? 0)}d overdue`
                        : "today"}
                    </span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </Band>
        )}

        {/* Deals about to land. */}
        {pipeline.closingSoon.length > 0 && (
          <Band tone={toneAfterLead(band.closing)} index={3} narrow label="Closing soon">
            <BandTitle
              action={
                <Link
                  href="/deals"
                  className="text-primary flex min-h-8 items-center gap-1 normal-case"
                >
                  All deals <ArrowRight className="size-3" />
                </Link>
              }
            >
              Closing soon
            </BandTitle>
            <Card className="py-0">
              <CardContent className="divide-border divide-y p-0">
                {pipeline.closingSoon.map((d) => (
                  <Link
                    key={d.id}
                    href={`/deals/${d.id}`}
                    className="hover:bg-muted/50 flex items-center gap-3 px-4 py-3 transition-colors"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{d.title}</span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {d.organisation?.name ?? "—"} · {stageOf(d.stage).label}
                      </span>
                    </span>
                    <span className="text-sm font-semibold tabular-nums">{money(d.value)}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </Band>
        )}

        {setup.done < setup.total && (
          <Band tone={toneAfterLead(band.setup)} index={4} narrow label="Setting up">
            <Card className="gap-0 py-0">
              <CardContent className="flex items-center gap-4 p-6">
                <Ring
                  value={(setup.done / setup.total) * 100}
                  label={`${setup.done}/${setup.total}`}
                />
                <div>
                  <h2 className="font-semibold">Get {workspace.name} set up</h2>
                  <p className="text-muted-foreground text-sm">
                    {setup.total - setup.done} step
                    {setup.total - setup.done === 1 ? "" : "s"} left. About 5 minutes.
                  </p>
                </div>
              </CardContent>
              <Separator />
              <CardContent className="p-0">
                <ul className="divide-border divide-y">
                  {steps.map((s) => (
                    <li key={s.title} className="flex items-center gap-3 px-6 py-3.5">
                      <span
                        className={
                          s.done
                            ? "bg-ok grid size-6 shrink-0 place-items-center rounded-full text-white"
                            : "border-input grid size-6 shrink-0 place-items-center rounded-full border-2"
                        }
                      >
                        {s.done && <Check className="size-3.5" />}
                      </span>
                      <span className="flex-1">
                        <span
                          className={
                            s.done
                              ? "text-muted-foreground block text-sm line-through"
                              : "block text-sm font-medium"
                          }
                        >
                          {s.title}
                        </span>
                        <span className="text-muted-foreground block text-xs">{s.meta}</span>
                      </span>
                      {!s.done && s.href && (
                        <Button asChild variant="outline" size="sm">
                          <Link href={s.href}>{s.action}</Link>
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </Band>
        )}
      </main>
    </div>
  )
}
