import { Database, Share, Sparkles, SquarePlus, Smartphone } from "lucide-react"

import { Band } from "@/components/app/band"
import { PageHeader } from "@/components/app/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { aiAvailable } from "@/lib/ai/claude"
import { FieldManager } from "@/components/app/custom-fields"
import { NotificationSwitches } from "@/components/app/notifications"
import { getMutedNotifications, listCustomFields } from "@/lib/data/queries"
import { requireContext } from "@/lib/data/session"
import { can, ROLE_HELP, ROLE_LABEL } from "@/lib/data/types"
import { WorkspaceNameForm, ResetDemo } from "./forms"

const INSTALL = [
  ["Open in Safari", "Add to Home Screen only works from Safari on iPhone.", null],
  ["Tap the Share button", "At the bottom of the screen.", Share],
  ["Choose Add to Home Screen", "Scroll the list if you do not see it.", SquarePlus],
  ["Tap Add", "The Agency appears on your Home Screen like an app.", null],
] as const

export default async function SettingsPage() {
  const { user, workspace, role } = await requireContext()

  return (
    <div className="flex min-h-svh flex-col">
      <PageHeader title="Settings" />

      <main className="flex-1">
        <Band tone="accent" index={0} narrow label="Your place here">
          <p className="text-muted-foreground text-sm">Settings for</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">{workspace.name}</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            You are {role === "admin" || role === "owner" ? "an" : "a"} {ROLE_LABEL[role]}.{" "}
            {ROLE_HELP[role]}
          </p>
        </Band>

        <Band index={1} narrow label="Workspace">
          <Card>
            <CardHeader>
              <CardTitle>Workspace</CardTitle>
            </CardHeader>
            <CardContent>
              {can.editWorkspace(role) ? (
                <WorkspaceNameForm name={workspace.name} />
              ) : (
                <p className="text-muted-foreground text-sm">
                  {workspace.name} · only owners and admins can change this.
                </p>
              )}
            </CardContent>
          </Card>
        </Band>

        <Band tone="soft" index={2} narrow label="Notifications">
          <Card id="notifications" className="scroll-mt-20">
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 p-0">
              <p className="text-muted-foreground px-6 text-sm">
                The bell in the top bar tells you what happened to your work. Switch off what you do
                not need; this is yours only and changes nothing for anyone else. Email digests and
                quiet hours come next.
              </p>
              <NotificationSwitches muted={await getMutedNotifications(workspace.id, user.id)} />
            </CardContent>
          </Card>
        </Band>

        <Band index={3} narrow label="Install on your iPhone">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="size-4" /> Install on your iPhone
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ol className="divide-border divide-y">
                {INSTALL.map(([title, body, Icon], i) => (
                  <li key={title} className="flex items-start gap-3 px-6 py-3.5">
                    <span className="bg-accent text-accent-foreground grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{title}</span>
                      <span className="text-muted-foreground block text-xs">{body}</span>
                    </span>
                    {Icon && <Icon className="text-primary size-4" />}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </Band>

        {can.editWorkspace(role) && (
          <Band tone="soft" index={4} narrow label="Custom fields">
            <Card id="custom-fields" className="scroll-mt-20">
              <CardHeader>
                <CardTitle>Custom fields</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="text-muted-foreground text-sm">
                  Your own details on every organisation or deal, like credit terms, a KRA PIN or a
                  tender number. Everyone in {workspace.name} can fill them in; only owners and
                  admins change the list.
                </p>
                <FieldManager
                  fields={await listCustomFields(workspace.id)}
                  aiEnabled={aiAvailable()}
                />
              </CardContent>
            </Card>
          </Band>
        )}

        <Band
          tone={can.editWorkspace(role) ? "soft" : "plain"}
          index={4}
          narrow
          label="Data"
          className="pb-10"
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-4" /> Claude
                <span
                  className={
                    aiAvailable()
                      ? "bg-ok-soft text-ok ml-auto rounded-full px-2 py-0.5 text-xs font-medium"
                      : "bg-muted text-muted-foreground ml-auto rounded-full px-2 py-0.5 text-xs font-medium"
                  }
                >
                  {aiAvailable() ? "Switched on" : "Switched off"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground flex flex-col gap-2 text-sm">
              <p>
                Claude suggests team structures, drafts check-ins and suggests lessons when a
                project closes. It only ever suggests: you accept each line yourself. Project names,
                tasks, dates and first names are sent; private flags never are.
              </p>
              {!aiAvailable() && (
                <p>
                  To switch it on, put your key from console.anthropic.com in the file{" "}
                  <code>.env.local</code> on this laptop as <code>ANTHROPIC_API_KEY=</code>, then
                  restart the app. Set a monthly spending limit in the console while you are there.
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="size-4" /> Data
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-muted-foreground text-sm">
                The Agency is running on a local file (<code>.data/agency.json</code>) while we
                settle the flows and the feel. Everything you do here is real — it is just kept on
                this laptop. Supabase replaces this file without the screens changing.
              </p>
              <ResetDemo />
            </CardContent>
          </Card>
        </Band>
      </main>
    </div>
  )
}
