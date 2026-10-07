import Link from "next/link"
import { Flag, Lock } from "lucide-react"

import { Band, BandStat, BandTitle } from "@/components/app/band"
import { RaiseFlag, SeverityPill } from "@/components/app/flags"
import { PageHeader } from "@/components/app/page-header"
import { listFlags, listMembers, listProjects, type FlagRow } from "@/lib/data/queries"
import { requireContext } from "@/lib/data/session"
import { can } from "@/lib/data/types"

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" })

function FlagRows({ flags }: { flags: FlagRow[] }) {
  return (
    <ul className="bg-card divide-border divide-y rounded-xl border">
      {flags.map((f) => (
        <li key={f.id}>
          <Link
            href={`/flags/${f.id}`}
            className="hover:bg-muted/50 focus-visible:ring-ring flex min-h-16 items-center gap-3 px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <SeverityPill severity={f.severity} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {f.about?.name ?? f.project?.name ?? "A concern"}
                {f.about && f.project ? ` · ${f.project.name}` : ""}
              </span>
              <span className="text-muted-foreground block truncate text-xs">{f.behaviour}</span>
            </span>
            <span className="text-muted-foreground hidden text-xs sm:block">
              {f.status === "closed"
                ? `Talked ${shortDate(f.talked_at ?? f.created_at)}`
                : `Raised ${shortDate(f.created_at)}`}
              {f.raisedBy ? ` · ${f.raisedBy.split(" ")[0]}` : ""}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export default async function FlagsPage() {
  const { user, workspace, role } = await requireContext()
  const [flags, members, projects] = await Promise.all([
    listFlags(workspace.id, { id: user.id, role }),
    listMembers(workspace.id),
    listProjects(workspace.id),
  ])
  const open = flags.filter((f) => f.status === "open")
  const closed = flags.filter((f) => f.status === "closed")
  const admin = can.seeFlags(role)

  const raise = can.edit(role) && (
    <RaiseFlag
      people={members.filter((m) => m.id !== user.id).map((m) => ({ value: m.id, label: m.full_name }))}
      projects={projects.filter((p) => p.status === "active").map((p) => ({ value: p.id, label: p.name }))}
      variant="default"
    />
  )

  return (
    <div className="flex min-h-svh flex-col">
      <PageHeader title="Flags" meta="Private">
        {raise}
      </PageHeader>

      <main className="flex-1">
        <Band tone="accent" index={0} narrow label="About flags">
          <p className="flex items-start gap-2 text-sm">
            <Lock className="text-accent-foreground mt-0.5 size-4 shrink-0" />
            <span>
              {admin
                ? "You see the flags you raised, and every other flag in the workspace except any about you."
                : "You see the flags you raised. Owners and admins see them too."}{" "}
              <span className="text-muted-foreground">
                The person a flag is about never sees it, and flags never appear on a timeline.
              </span>
            </span>
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
            <BandStat lead label="Open" value={String(open.length)} help="Waiting for a conversation" />
            <BandStat
              label="Serious"
              value={String(open.filter((f) => f.severity === "serious").length)}
              help="Talk now"
              tone={open.some((f) => f.severity === "serious") ? "warn" : undefined}
            />
            <BandStat
              label="Talked through"
              value={String(closed.length)}
              help="Closed with one agreed change"
            />
          </div>
        </Band>

        <Band index={1} narrow label="Open flags" className={closed.length ? undefined : "pb-10"}>
          <BandTitle>Open</BandTitle>
          {open.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
              <Flag className="text-ink-3 size-8" />
              <h3 className="font-semibold">Nothing open</h3>
              <p className="text-muted-foreground max-w-sm text-sm">
                When something about a person, task or project worries you, raise a flag. You get a
                suggested way to talk it through.
              </p>
              {raise}
            </div>
          ) : (
            <FlagRows flags={open} />
          )}
        </Band>

        {closed.length > 0 && (
          <Band tone="soft" index={2} narrow label="Closed flags" className="pb-10">
            <BandTitle>Talked through</BandTitle>
            <FlagRows flags={closed} />
          </Band>
        )}
      </main>
    </div>
  )
}
