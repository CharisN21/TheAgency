import Link from "next/link"
import { AlertTriangle, Check, X } from "lucide-react"

import { Mark } from "@/components/brand/logo"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getInviteByToken } from "@/lib/data/queries"
import { getUser } from "@/lib/data/session"
import { ROLE_HELP, ROLE_LABEL } from "@/lib/data/types"
import { AcceptButton } from "./accept-button"

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-svh place-items-center p-6">
      <Link href="/" className="absolute top-6 left-6 flex items-center gap-3">
        <Mark size={28} />
        <span className="text-sm font-semibold tracking-[0.18em]">THE AGENCY</span>
      </Link>
      <div className="bg-card w-full max-w-md rounded-xl border p-8 text-center sm:p-10">
        {children}
      </div>
    </div>
  )
}

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const found = await getInviteByToken(token)
  const user = await getUser()

  if (!found?.workspace) {
    return (
      <Shell>
        <span className="bg-danger-soft text-destructive mx-auto grid size-14 place-items-center rounded-2xl">
          <X className="size-6" />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">
          This link is not valid
        </h1>
        <p className="text-muted-foreground mt-2">
          It may have been cancelled. Ask whoever invited you for a new one.
        </p>
      </Shell>
    )
  }

  const { invite, workspace, inviter } = found
  const expired = new Date(invite.expires_at) < new Date()

  if (invite.accepted_at || expired) {
    return (
      <Shell>
        <span className="bg-warn-soft text-warn mx-auto grid size-14 place-items-center rounded-2xl">
          <AlertTriangle className="size-6" />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">
          {invite.accepted_at ? "This invite has been used" : "This invite has expired"}
        </h1>
        <p className="text-muted-foreground mt-2">
          {invite.accepted_at
            ? `Someone already joined ${workspace.name} with this link.`
            : `It was good for 7 days. Ask ${inviter?.full_name ?? "the owner"} for a new one.`}
        </p>
        <Button asChild variant="outline" size="lg" className="mt-6 w-full">
          <Link href="/today">Go to The Agency</Link>
        </Button>
      </Shell>
    )
  }

  return (
    <Shell>
      <span
        className="mx-auto grid size-16 place-items-center rounded-2xl text-2xl font-bold text-white"
        style={{ backgroundColor: workspace.accent_color }}
      >
        {workspace.name.trim()[0]?.toUpperCase()}
      </span>

      <p className="text-muted-foreground mt-5 text-sm">
        {inviter?.full_name ?? "Someone"} invited you to join
      </p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{workspace.name}</h1>
      <Badge className="mt-3" variant="secondary">
        as {ROLE_LABEL[invite.role]}
      </Badge>

      <p className="bg-muted text-muted-foreground mt-6 rounded-lg px-4 py-3 text-left text-sm">
        {ROLE_HELP[invite.role]}
      </p>

      <p className="text-muted-foreground mt-3 text-left text-sm">
        Chat here is private to the people in each chat and stored encrypted. You sign in with your email and
        never handle keys. It is not end-to-end, so whoever runs this app could in principle read it.
      </p>

      {user ? (
        <>
          <AcceptButton token={token} workspaceName={workspace.name} />
          <p className="text-muted-foreground mt-4 text-sm">
            Signed in as {user.email}
          </p>
        </>
      ) : (
        <>
          <Button asChild size="lg" className="mt-6 w-full">
            <Link href={`/sign-in?next=/join/${token}`}>Sign in to join</Link>
          </Button>
          <p className="text-muted-foreground mt-4 flex items-center justify-center gap-1.5 text-sm">
            <Check className="size-3.5" /> You will only see {workspace.name}
          </p>
        </>
      )}
    </Shell>
  )
}
