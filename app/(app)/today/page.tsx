import Link from "next/link"
import { Check, Search, Sun, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { getSetupState, listMembers, pendingInviteCount } from "@/lib/data/queries"
import { requireContext } from "@/lib/data/session"
import { can } from "@/lib/data/types"
import { WelcomeToast } from "./welcome-toast"

function Ring({ value, label }: { value: number; label: string }) {
  const r = 26
  const c = 2 * Math.PI * r
  return (
    <div className="relative size-16 shrink-0">
      <svg viewBox="0 0 64 64" className="size-full -rotate-90">
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          strokeWidth="6"
          className="stroke-fill-strong"
        />
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
  const { user, company, role } = await requireContext()
  const [setup, members, pending] = await Promise.all([
    getSetupState(company.id, user.id),
    listMembers(company.id),
    pendingInviteCount(company.id),
  ])

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening"
  const firstName = user.full_name.split(" ")[0]

  const steps = [
    {
      done: setup.hasCompany,
      title: "Create your company",
      meta: `${company.name} is ready.`,
    },
    { done: setup.signedIn, title: "Sign in on your laptop", meta: "You are signed in." },
    {
      done: setup.invitedSomeone,
      title: "Invite your office team",
      meta:
        members.length > 1
          ? `${members.length - 1} ${members.length === 2 ? "person has" : "people have"} joined.`
          : pending > 0
            ? `${pending} ${pending === 1 ? "invite" : "invites"} waiting to be opened.`
            : "Nobody else is in here yet.",
      href: "/team",
      action: can.invite(role) ? "Invite" : "See team",
    },
    {
      done: setup.teamJoined,
      title: "Install The Agency on your iPhone",
      meta: "Open this site in Safari, tap Share, then Add to Home Screen.",
      href: "/settings",
      action: "Show me",
    },
  ]

  return (
    <div className="flex min-h-svh flex-col">
      <WelcomeToast />

      <header className="bg-bar border-border sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-4 backdrop-blur-xl">
        <SidebarTrigger className="md:hidden" />
        <span className="text-muted-foreground hidden items-center gap-2 text-sm md:flex">
          <Search className="size-4" /> Search
          <kbd className="border-border text-muted-foreground ml-1 rounded border px-1.5 text-[11px]">
            Ctrl K
          </kbd>
        </span>
        <div className="flex-1" />
        {can.invite(role) && (
          <Button asChild variant="secondary" size="sm">
            <Link href="/team?invite=1">
              <UserPlus /> Invite
            </Link>
          </Button>
        )}
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-8">
        <p className="text-muted-foreground text-sm">{today}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          {greeting}, {firstName}
        </h1>

        {setup.done < setup.total && (
          <Card className="mt-6 gap-0 py-0">
            <CardContent className="flex items-center gap-4 p-6">
              <Ring
                value={(setup.done / setup.total) * 100}
                label={`${setup.done}/${setup.total}`}
              />
              <div>
                <h2 className="font-semibold">Get {company.name} set up</h2>
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
                      <span className="text-muted-foreground block text-xs">
                        {s.meta}
                      </span>
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
        )}

        <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center">
          <Sun className="text-ink-3 size-9" />
          <h3 className="font-semibold">Nothing due today</h3>
          <p className="text-muted-foreground max-w-xs text-sm">
            When you create projects, tasks due today, overdue work and check-ins show up
            here.
          </p>
        </div>
      </main>
    </div>
  )
}
