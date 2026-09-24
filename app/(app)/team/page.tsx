import { Suspense } from "react"
import { Clock, Eye, Lock, Mail } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { listInvites, listMembers } from "@/lib/data/queries"
import { requireContext } from "@/lib/data/session"
import { ROLE_HELP, ROLE_LABEL, ROLES, can, type Role } from "@/lib/data/types"
import { CopyLink, InviteDialog } from "./invite-dialog"
import { MemberActions, RevokeInvite } from "./member-actions"

const initialsOf = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

const daysLeft = (iso: string) =>
  Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5))

export default async function TeamPage() {
  const { user, company, role } = await requireContext()
  const [members, invites] = await Promise.all([
    listMembers(company.id),
    listInvites(company.id),
  ])
  const mayManage = can.manageRoles(role)

  return (
    <div className="flex min-h-svh flex-col">
      <header className="bg-bar border-border sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-4 backdrop-blur-xl">
        <SidebarTrigger className="md:hidden" />
        <h1 className="flex-1 font-semibold">Team</h1>
        {can.invite(role) && (
          <Suspense fallback={null}>
            <InviteDialog companyName={company.name} />
          </Suspense>
        )}
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-8">
        {role === "viewer" && (
          <p className="bg-warn-soft mb-5 flex items-start gap-2 rounded-lg px-4 py-3 text-sm">
            <Eye className="mt-0.5 size-4 shrink-0" />
            <span>
              <strong>You are a Viewer in {company.name}.</strong> You can see everything
              here but cannot change it.
            </span>
          </p>
        )}

        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members">Members {members.length}</TabsTrigger>
            <TabsTrigger value="invites">Invites {invites.length}</TabsTrigger>
          </TabsList>

          <TabsContent value="members">
            <Card className="mt-4 py-0">
              <CardContent className="p-0">
                <ul className="divide-border divide-y">
                  {members.map((m) => (
                    <li
                      key={m.id}
                      className="flex min-h-16 items-center gap-3 px-4 py-2.5"
                    >
                      <span
                        className={
                          m.role === "owner" || m.role === "admin"
                            ? "bg-accent text-accent-foreground grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold"
                            : "bg-fill-strong grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold"
                        }
                      >
                        {initialsOf(m.full_name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {m.full_name}
                          {m.id === user.id && (
                            <span className="text-muted-foreground font-normal"> · you</span>
                          )}
                        </span>
                        <span className="text-muted-foreground block truncate text-xs">
                          {m.title ? `${m.title} · ` : ""}
                          {m.email}
                        </span>
                      </span>
                      <Badge variant={m.role === "owner" ? "default" : "secondary"}>
                        {ROLE_LABEL[m.role]}
                      </Badge>
                      {(mayManage || m.id === user.id) && (
                        <MemberActions
                          userId={m.id}
                          name={m.full_name}
                          role={m.role}
                          companyName={company.name}
                          isSelf={m.id === user.id}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invites">
            {invites.length === 0 ? (
              <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center">
                <Mail className="text-ink-3 size-8" />
                <h3 className="font-semibold">No invites waiting</h3>
                <p className="text-muted-foreground max-w-xs text-sm">
                  {can.invite(role)
                    ? "Invite someone and their link shows up here until they join."
                    : "Only owners and admins can invite people."}
                </p>
              </div>
            ) : (
              <Card className="mt-4 py-0">
                <CardContent className="p-0">
                  <ul className="divide-border divide-y">
                    {invites.map((i) => (
                      <li
                        key={i.id}
                        className="flex min-h-16 flex-wrap items-center gap-3 px-4 py-2.5"
                      >
                        <span className="border-input text-muted-foreground grid size-9 shrink-0 place-items-center rounded-full border border-dashed">
                          <Mail className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {i.email}
                          </span>
                          <span className="text-muted-foreground flex items-center gap-1 text-xs">
                            <Clock className="size-3" />
                            {daysLeft(i.expires_at)} days left · joins as{" "}
                            {ROLE_LABEL[i.role]}
                          </span>
                        </span>
                        {can.invite(role) && (
                          <>
                            <CopyLink token={i.token} />
                            <RevokeInvite inviteId={i.id} email={i.email} />
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <h2 className="text-muted-foreground mt-8 text-xs font-semibold tracking-wide uppercase">
          What each role can do
        </h2>
        <Card className="mt-3 py-0">
          <CardContent className="p-0">
            <ul className="divide-border divide-y">
              {ROLES.map((r: Role) => (
                <li key={r} className="flex items-start gap-4 px-4 py-3">
                  <Badge
                    variant={r === "owner" ? "default" : "secondary"}
                    className="mt-0.5 w-16 justify-center"
                  >
                    {ROLE_LABEL[r]}
                  </Badge>
                  <p className="text-muted-foreground text-sm">{ROLE_HELP[r]}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <p className="text-muted-foreground mt-4 flex items-start gap-2 text-sm">
          <Lock className="mt-0.5 size-4 shrink-0" />
          Private flags are only ever visible to the person who raised them and to owners
          and admins.
        </p>
      </main>
    </div>
  )
}
