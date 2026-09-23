import { Lock, UserPlus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Role = "Owner" | "Admin" | "Member" | "Viewer"

const MEMBERS: { initials: string; name: string; title: string; role: Role }[] = [
  { initials: "CN", name: "Charis N.", title: "Founder", role: "Owner" },
  { initials: "WK", name: "Wanjiru Kamau", title: "Operations lead", role: "Admin" },
  { initials: "OO", name: "Otieno Odhiambo", title: "Sales", role: "Member" },
  { initials: "AN", name: "Achieng Njeri", title: "Procurement", role: "Member" },
  { initials: "BM", name: "Brian Mwangi", title: "Accountant", role: "Viewer" },
]

const ROLE_HELP: Record<Role, string> = {
  Owner: "Everything, including billing and deleting the company.",
  Admin: "Invite people, change roles, see private flags, manage all projects.",
  Member: "Work on projects they are added to: tasks, comments, check-ins.",
  Viewer: "See projects and progress. Cannot create or edit anything.",
}

export default function TeamPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="bg-bar border-border sticky top-0 z-30 flex h-13 items-center gap-2 border-b px-4 backdrop-blur-xl">
        <SidebarTrigger className="md:hidden" />
        <h1 className="flex-1 font-semibold">Team</h1>
        <Button size="sm">
          <UserPlus /> Invite
        </Button>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-8">
        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members">Members 5</TabsTrigger>
            <TabsTrigger value="invites">Invites 0</TabsTrigger>
          </TabsList>
        </Tabs>

        <Card className="mt-4 py-0">
          <CardContent className="p-0">
            <ul className="divide-border divide-y">
              {MEMBERS.map((m) => (
                <li key={m.name} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
                  <span
                    className={
                      m.role === "Owner" || m.role === "Admin"
                        ? "bg-accent text-accent-foreground grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold"
                        : "bg-fill-strong grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold"
                    }
                  >
                    {m.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{m.name}</span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {m.title}
                    </span>
                  </span>
                  <Badge variant={m.role === "Owner" ? "default" : "secondary"}>
                    {m.role}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <h2 className="text-muted-foreground mt-8 text-xs font-semibold tracking-wide uppercase">
          What each role can do
        </h2>
        <Card className="mt-3 py-0">
          <CardContent className="p-0">
            <ul className="divide-border divide-y">
              {(Object.keys(ROLE_HELP) as Role[]).map((r) => (
                <li key={r} className="flex items-start gap-4 px-4 py-3">
                  <Badge
                    variant={r === "Owner" ? "default" : "secondary"}
                    className="mt-0.5 w-16 justify-center"
                  >
                    {r}
                  </Badge>
                  <p className="text-muted-foreground text-sm">{ROLE_HELP[r]}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <p className="text-muted-foreground mt-4 flex items-start gap-2 text-sm">
          <Lock className="mt-0.5 size-4 shrink-0" />
          Private flags are only ever visible to the person who raised them and to Owners
          and Admins.
        </p>
      </main>
    </div>
  )
}
