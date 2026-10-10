import { AppSidebar } from "@/components/app/app-sidebar"
import { ChatProvider } from "@/components/app/chat"
import { CommandPaletteProvider } from "@/components/app/command-palette"
import { LaunchSplash } from "@/components/app/launch-splash"
import { PushListener } from "@/components/app/push-card"
import { QuickCaptureProvider } from "@/components/app/quick-capture"
import { MobileTabBar } from "@/components/app/mobile-tabbar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { listContacts, listDeals, listFlags, listOrganisations, listProjects } from "@/lib/data/queries"
import { requireContext } from "@/lib/data/session"
import { mutate, readDb } from "@/lib/data/store"
import { runsVenture } from "@/lib/data/founders"
import { coloursOf, logoUrl } from "@/lib/ventures/logo"
import { themeCss } from "@/lib/ventures/palette"
import { can, OBSERVABLE_TABS, OPEN_STAGES } from "@/lib/data/types"

/** The app shell: sidebar on desktop, tab bar on iPhone. */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user, workspace, venture, role, workspaces } = await requireContext()
  const [organisations, people, deals, projects, flags] = await Promise.all([
    listOrganisations(workspace.id),
    listContacts(workspace.id),
    listDeals(workspace.id),
    listProjects(workspace.id),
    listFlags(workspace.id, { id: user.id, role }),
  ])
  const canAddWorkspace = runsVenture(await readDb(), user, venture)
  // An Observer sees only the tabs this workspace opened to Observers.
  const hidden = OBSERVABLE_TABS.filter((t) => !can.seeTab(role, workspace, t.key)).map((t) => `/${t.key}`)

  // A venture with a logo dresses its workspaces in the logo's colours; Main Hub stays maroon.
  // A logo from before themes existed gets its colours worked out once, here.
  if (venture.logo && !venture.theme) {
    const colours = await coloursOf(venture.logo)
    if (colours) {
      venture.theme = colours
      await mutate((d) => {
        const v = d.ventures.find((x) => x.id === venture.id)
        if (v && v.logo === venture.logo) v.theme = colours
      })
    }
  }
  const theme = themeCss(venture.theme)

  return (
    <TooltipProvider delayDuration={400}>
      {theme && <style data-venture-theme>{theme}</style>}
      <LaunchSplash name={venture.name} title={workspace.name} color={venture.accent_color} logo={logoUrl(venture.logo)} />
      <a href="#content" className="skip-link">
        Skip to content
      </a>
      <SidebarProvider>
        <AppSidebar
          workspaces={workspaces.map((w) => ({
            id: w.id,
            name: w.name,
            role: w.role,
            people: w.people,
            accent_color: w.accent_color,
            venture_id: w.venture_id,
          }))}
          currentId={workspace.id}
          venture={{ id: venture.id, name: venture.name, accent_color: venture.accent_color, logo: logoUrl(venture.logo), canAdd: canAddWorkspace }}
          user={{ full_name: user.full_name, email: user.email }}
          role={role}
          hidden={hidden}
          counts={{
            organisations: organisations.length,
            people: people.length,
            openDeals: deals.filter((d) => OPEN_STAGES.includes(d.stage)).length,
            projects: projects.filter((p) => p.status === "active").length,
            flags: flags.filter((f) => f.status === "open").length,
          }}
        />
        {/* min-w-0 lets wide content (the pipeline board) scroll inside the page instead of widening it. */}
        <SidebarInset id="content" tabIndex={-1} className="min-w-0 pb-24 outline-none md:pb-0">
          <PushListener />
          <QuickCaptureProvider key={workspace.id} canEdit={can.edit(role)}>
            <ChatProvider key={workspace.id} userId={user.id}>
              <CommandPaletteProvider
                workspaces={workspaces.map((w) => ({ id: w.id, name: w.name }))}
                currentId={workspace.id}
                canInvite={can.invite(role)}
                hidden={hidden}
              >
                {children}
              </CommandPaletteProvider>
            </ChatProvider>
          </QuickCaptureProvider>
        </SidebarInset>
        <MobileTabBar hidden={hidden} />
      </SidebarProvider>
    </TooltipProvider>
  )
}
