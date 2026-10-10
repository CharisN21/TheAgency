import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronRight, Crown, Plus } from "lucide-react"

import { EntryShell } from "@/components/app/entry-shell"
import { VentureMark } from "@/components/app/venture-forms"
import { isFounder, isPlatformOwner } from "@/lib/data/founders"
import { listMyVentures } from "@/lib/data/queries"
import { getUser } from "@/lib/data/session"

export default async function VenturesPage() {
  const user = await getUser()
  if (!user) redirect("/sign-in?next=/ventures")
  const ventures = await listMyVentures(user.id)
  const founder = isFounder(user)
  if (ventures.length === 0 && !founder) redirect("/welcome")

  return (
    <EntryShell email={user.email}>
      <h1 className="text-3xl font-bold tracking-tight">Main Hub</h1>

      {ventures.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
          <h2 className="font-semibold">Nothing here yet</h2>
          <Link href="/new-workspace" className="text-primary text-sm font-medium underline underline-offset-4">
            Start a venture
          </Link>
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {ventures.map((v) => (
            <li key={v.id}>
              <Link
                href={`/ventures/${v.id}`}
                className="bg-card hover:bg-muted/50 focus-visible:ring-ring flex min-h-20 items-center gap-4 rounded-xl border p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <VentureMark name={v.name} color={v.accent_color} logo={v.logo} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-semibold">{v.name}</span>
                  <span className="text-muted-foreground block truncate text-sm">
                    {v.workspaces.length === 0
                      ? "No workspaces yet"
                      : v.workspaces.map((w) => w.name).join(" · ")}
                  </span>
                </span>
                <ChevronRight className="text-muted-foreground size-5" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {(founder || isPlatformOwner(user)) && (
        <div className="mt-8 flex flex-wrap gap-3">
          {founder && ventures.length > 0 && (
            <Link
              href="/new-workspace"
              className="focus-visible:ring-ring inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
            >
              <Plus className="size-4" /> Start a venture
            </Link>
          )}
          {isPlatformOwner(user) && (
            <Link
              href="/founders"
              className="focus-visible:ring-ring inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
            >
              <Crown className="size-4" /> Founders
            </Link>
          )}
        </div>
      )}
    </EntryShell>
  )
}
