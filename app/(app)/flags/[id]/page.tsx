import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, FolderKanban, Lock, UserRound } from "lucide-react"

import { Band, BandTitle } from "@/components/app/band"
import { FlagActions, LogConversation, SeverityPill } from "@/components/app/flags"
import { PageHeader } from "@/components/app/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { conversationScript } from "@/lib/data/flag-script"
import { getFlag } from "@/lib/data/queries"
import { requireContext } from "@/lib/data/session"
import { can } from "@/lib/data/types"

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })

function Rows({ rows }: { rows: [string, string | undefined][] }) {
  return (
    <Card className="py-0">
      <CardContent className="divide-border divide-y p-0 text-sm">
        {rows
          .filter(([, text]) => text)
          .map(([label, text]) => (
            <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[9rem_1fr]">
              <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                {label}
              </span>
              <span className="whitespace-pre-line">{text}</span>
            </div>
          ))}
      </CardContent>
    </Card>
  )
}

export default async function FlagPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, workspace, role } = await requireContext()
  // Anyone who may not see this flag gets a plain not-found: not even that it exists leaks.
  const f = await getFlag(workspace.id, { id: user.id, role }, id)
  if (!f) notFound()

  const script = conversationScript({
    situation: f.situation,
    behaviour: f.behaviour,
    impact: f.impact,
    aboutName: f.about?.name,
  })
  const open = f.status === "open"
  const canDelete = f.raised_by === user.id || can.editWorkspace(role)

  return (
    <div className="flex min-h-svh flex-col">
      <PageHeader title="Flag" meta="Private" />

      <main className="flex-1">
        <Band tone="accent" index={0} narrow label="The flag">
          <Link
            href="/flags"
            className="text-muted-foreground hover:text-foreground mb-3 inline-flex min-h-11 items-center gap-1 text-sm"
          >
            <ArrowLeft className="size-4" /> All flags
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <SeverityPill severity={f.severity} />
            <span className="text-muted-foreground text-sm">
              {open ? "Open" : "Talked through"} · raised by {f.raisedBy ?? "someone"} on{" "}
              {longDate(f.created_at)}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            {f.about?.name ?? f.project?.name ?? "A concern"}
          </h1>
          <p className="text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {f.about && (
              <span className="flex items-center gap-1">
                <UserRound className="size-4" /> {f.about.name}
              </span>
            )}
            {f.project && (
              <Link
                href={`/projects/${f.project.id}`}
                className="flex items-center gap-1 hover:underline"
              >
                <FolderKanban className="size-4" /> {f.project.name}
              </Link>
            )}
            <span className="flex items-center gap-1">
              <Lock className="size-4" />
              {f.about ? `${f.about.name.split(" ")[0]} cannot see this` : "Private"}
            </span>
          </p>
        </Band>

        <Band index={1} narrow label="What happened">
          <BandTitle>What happened</BandTitle>
          <Rows
            rows={[
              ["Situation", f.situation],
              ["What happened", f.behaviour],
              ["The effect", f.impact],
            ]}
          />
        </Band>

        {open ? (
          <Band tone="soft" index={2} narrow label="Suggested conversation" className="pb-10">
            <BandTitle
              action={can.edit(role) && <LogConversation flagId={f.id} name={f.about?.name} />}
            >
              A way to talk it through
            </BandTitle>
            <ol className="flex flex-col gap-2">
              {script.map((s, i) => (
                <li key={s.step} className="bg-card flex gap-3 rounded-xl border p-4">
                  <span className="bg-accent text-accent-foreground grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="text-muted-foreground block text-xs font-semibold tracking-wide uppercase">
                      {s.step}
                    </span>
                    <span className="block text-sm">{s.say}</span>
                    {s.note && (
                      <span className="text-muted-foreground mt-1 block text-xs">{s.note}</span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
            <p className="text-muted-foreground mt-3 text-xs">
              A path, not a script to read out. Say it in your own words.
            </p>
            {canDelete && (
              <div className="mt-6">
                <FlagActions flagId={f.id} open canDelete />
              </div>
            )}
          </Band>
        ) : (
          <Band tone="soft" index={2} narrow label="The conversation" className="pb-10">
            <BandTitle>The conversation · {longDate(f.talked_at ?? f.created_at)}</BandTitle>
            <Rows
              rows={[
                ["What was said", f.conversation],
                ["Agreed change", f.agreed_change],
              ]}
            />
            {can.edit(role) && (
              <div className="mt-6">
                <FlagActions flagId={f.id} open={false} canDelete={canDelete} />
              </div>
            )}
          </Band>
        )}
      </main>
    </div>
  )
}
