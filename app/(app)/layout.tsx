import { AppSidebar } from "@/components/app/app-sidebar"
import { MobileTabBar } from "@/components/app/mobile-tabbar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { requireContext } from "@/lib/data/session"

/** The app shell: sidebar on desktop, tab bar on iPhone. */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user, company, role, companies } = await requireContext()

  return (
    <TooltipProvider delayDuration={400}>
      <SidebarProvider>
        <AppSidebar
          companies={companies.map((c) => ({
            id: c.id,
            name: c.name,
            role: c.role,
            people: c.people,
          }))}
          currentId={company.id}
          user={{ full_name: user.full_name, email: user.email }}
          role={role}
        />
        <SidebarInset className="pb-24 md:pb-0">{children}</SidebarInset>
        <MobileTabBar />
      </SidebarProvider>
    </TooltipProvider>
  )
}
