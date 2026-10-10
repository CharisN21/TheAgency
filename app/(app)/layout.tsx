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
import { readDb } from "@/lib/data/store"
import { runsVenture } from "@/lib/data/founders"
import { logoUrl } from "@/lib/ventures/logo"
import { can, OPEN_STAGES } from "@/lib/data/types"

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

  return (
    <TooltipProvider delayDuration={400}>
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
              >
                {children}
              </CommandPaletteProvider>
            </ChatProvider>
          </QuickCaptureProvider>
        </SidebarInset>
        <MobileTabBar />
      </SidebarProvider>
    </TooltipProvider>
  )
}
