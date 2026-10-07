import { AppSidebar } from "@/components/app/app-sidebar"
import { ChatProvider } from "@/components/app/chat"
import { LaunchSplash } from "@/components/app/launch-splash"
import { PushListener } from "@/components/app/push-card"
import { QuickCaptureProvider } from "@/components/app/quick-capture"
import { MobileTabBar } from "@/components/app/mobile-tabbar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { listContacts, listDeals, listFlags, listOrganisations, listProjects } from "@/lib/data/queries"
import { requireContext } from "@/lib/data/session"
import { can, OPEN_STAGES } from "@/lib/data/types"

/** The app shell: sidebar on desktop, tab bar on iPhone. */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user, workspace, role, workspaces } = await requireContext()
  const [organisations, people, deals, projects, flags] = await Promise.all([
    listOrganisations(workspace.id),
    listContacts(workspace.id),
    listDeals(workspace.id),
    listProjects(workspace.id),
    listFlags(workspace.id, { id: user.id, role }),
  ])

  return (
    <TooltipProvider delayDuration={400}>
      <LaunchSplash name={workspace.name} color={workspace.accent_color} />
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
          }))}
          currentId={workspace.id}
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
              {children}
            </ChatProvider>
          </QuickCaptureProvider>
        </SidebarInset>
        <MobileTabBar />
      </SidebarProvider>
    </TooltipProvider>
  )
}
