import { Database, Share, SquarePlus, Smartphone } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { requireContext } from "@/lib/data/session"
import { can } from "@/lib/data/types"
import { CompanyNameForm, ResetDemo } from "./forms"

const INSTALL = [
  ["Open in Safari", "Add to Home Screen only works from Safari on iPhone.", null],
  ["Tap the Share button", "At the bottom of the screen.", Share],
  ["Choose Add to Home Screen", "Scroll the list if you do not see it.", SquarePlus],
  ["Tap Add", "The Agency appears on your Home Screen like an app.", null],
] as const

export default async function SettingsPage() {
  const { company, role } = await requireContext()

  return (
    <div className="flex min-h-svh flex-col">
      <header className="bg-bar border-border sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-4 backdrop-blur-xl">
        <SidebarTrigger className="md:hidden" />
        <h1 className="flex-1 font-semibold">Settings</h1>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 md:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Company</CardTitle>
          </CardHeader>
          <CardContent>
            {can.editCompany(role) ? (
              <CompanyNameForm name={company.name} />
            ) : (
              <p className="text-muted-foreground text-sm">
                {company.name} · only owners and admins can change this.
              </p>
            )}
          </CardContent>
        </Card>

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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="size-4" /> Data
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-muted-foreground text-sm">
              The Agency is running on a local file (<code>.data/agency.json</code>) while
              we settle the flows and the feel. Everything you do here is real — it is just
              kept on this laptop. Supabase replaces this file without the screens
              changing.
            </p>
            <ResetDemo />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
