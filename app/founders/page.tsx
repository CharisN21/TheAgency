import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, Crown } from "lucide-react"

import { EntryShell } from "@/components/app/entry-shell"
import { AppointFounderForm, RemoveFounderButton } from "@/components/app/venture-forms"
import { Badge } from "@/components/ui/badge"
import { isPlatformOwner } from "@/lib/data/founders"
import { listFounders } from "@/lib/data/queries"
import { getUser } from "@/lib/data/session"

/** The platform owner's page: who may start ventures. */
export default async function FoundersPage() {
  const user = await getUser()
  if (!user) redirect("/sign-in?next=/founders")
  if (!isPlatformOwner(user)) redirect("/ventures")
  const founders = await listFounders()

  return (
    <EntryShell email={user.email}>
      <Link href="/ventures" className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-2 text-sm">
        <ArrowLeft className="size-4" /> All ventures
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">Founders</h1>
      <p className="text-muted-foreground mt-2">
        Only founders can start a venture and add workspaces to it. Everyone else gets in by invite, in the role and title the
        founder or an admin gives them.
      </p>

      <div className="mt-8">
        <AppointFounderForm />
        <p className="text-muted-foreground mt-2 text-sm">They sign in with this email, then start their venture.</p>
      </div>

      <ul className="bg-card divide-border mt-8 divide-y rounded-xl border">
        {founders.map((p) => (
          <li key={p.id} className="flex min-h-16 flex-wrap items-center gap-3 px-4 py-3">
            <Crown className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{p.full_name}</span>
              <span className="text-muted-foreground block truncate text-sm">
                {p.email}
                {p.ventures.length > 0 && ` · ${p.ventures.join(", ")}`}
              </span>
            </span>
            {p.platformOwner ? <Badge variant="secondary">Platform owner</Badge> : <RemoveFounderButton id={p.id} name={p.full_name} />}
          </li>
        ))}
      </ul>
    </EntryShell>
  )
}
