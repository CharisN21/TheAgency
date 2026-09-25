import { AppSidebar } from "@/components/app/app-sidebar"
import { MobileTabBar } from "@/components/app/mobile-tabbar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { listContacts, listDeals, listOrganisations } from "@/lib/data/queries"
import { requireContext } from "@/lib/data/session"
import { OPEN_STAGES } from "@/lib/data/types"

/** The app shell: sidebar on desktop, tab bar on iPhone. */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user, workspace, role, workspaces } = await requireContext()
  const [organisations, people, deals] = await Promise.all([
    listOrganisations(workspace.id),
    listContacts(workspace.id),
    listDeals(workspace.id),
  ])

  return (
    <TooltipProvider delayDuration={400}>
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
          }}
        />
        {/* min-w-0 lets wide content (the pipeline board) scroll inside the page instead of widening it. */}
        <SidebarInset className="min-w-0 pb-24 md:pb-0">{children}</SidebarInset>
        <MobileTabBar />
      </SidebarProvider>
    </TooltipProvider>
  )
}
