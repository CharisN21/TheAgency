import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft, Users } from "lucide-react"

import { EntryShell } from "@/components/app/entry-shell"
import { EnterButton, NewWorkspaceForm, VentureMark } from "@/components/app/venture-forms"
import { Badge } from "@/components/ui/badge"
import { listMyVentures } from "@/lib/data/queries"
import { getUser } from "@/lib/data/session"
import { ROLE_LABEL } from "@/lib/data/types"

export default async function VenturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser()
  if (!user) redirect(`/sign-in?next=/ventures/${id}`)
  // Only a venture you are in (or run) is found; anyone else gets "not found", not a hint it exists.
  const venture = (await listMyVentures(user.id)).find((v) => v.id === id)
  if (!venture) notFound()

  return (
    <EntryShell email={user.email}>
      <Link href="/ventures" className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-2 text-sm">
        <ArrowLeft className="size-4" /> All ventures
      </Link>

      <div className="mt-4 flex items-center gap-4">
        <VentureMark name={venture.name} color={venture.accent_color} size={56} />
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-bold tracking-tight">{venture.name}</h1>
          <p className="text-muted-foreground">
            {venture.workspaces.length === 1 ? "1 workspace you are in" : `${venture.workspaces.length} workspaces you are in`}
          </p>
        </div>
      </div>

      {venture.workspaces.length === 0 ? (
        <p className="text-muted-foreground mt-8 text-sm">No workspaces yet. Add the first one below.</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {venture.workspaces.map((w) => (
            <li key={w.id} className="bg-card flex flex-wrap items-center gap-4 rounded-xl border p-4">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg font-semibold">{w.name}</span>
                <span className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="secondary">{w.title ?? ROLE_LABEL[w.role]}</Badge>
                  {w.title && <span>{ROLE_LABEL[w.role]}</span>}
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3.5" aria-hidden="true" /> {w.people} {w.people === 1 ? "person" : "people"}
                  </span>
                </span>
              </span>
              <EnterButton workspaceId={w.id} name={w.name} />
            </li>
          ))}
        </ul>
      )}

      {venture.canAdd && (
        <div className="mt-8">
          <NewWorkspaceForm ventureId={venture.id} ventureName={venture.name} />
        </div>
      )}
    </EntryShell>
  )
}
