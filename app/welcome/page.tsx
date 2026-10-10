import { redirect } from "next/navigation"
import { MailOpen } from "lucide-react"

import { EntryShell } from "@/components/app/entry-shell"
import { isFounder } from "@/lib/data/founders"
import { getUser } from "@/lib/data/session"
import { readDb } from "@/lib/data/store"

/** For someone signed in who is not in any workspace yet and is not a founder. */
export default async function WelcomePage() {
  const user = await getUser()
  if (!user) redirect("/sign-in")
  const db = await readDb()
  if (db.memberships.some((m) => m.user_id === user.id) || isFounder(user)) redirect("/ventures")

  return (
    <EntryShell email={user.email}>
      <div className="bg-card mx-auto mt-10 flex max-w-md flex-col items-center gap-4 rounded-xl border p-8 text-center sm:p-10">
        <MailOpen className="text-ink-3 size-10" aria-hidden="true" />
        <h1 className="text-2xl font-bold tracking-tight">You are signed in, but not in a workspace yet</h1>
        <p className="text-muted-foreground text-sm">
          Workspaces are set up by the founder of each venture, who invites people in. Ask them to send you an invite link for{" "}
          <span className="text-foreground font-medium">{user.email}</span>, then open it.
        </p>
      </div>
    </EntryShell>
  )
}
