import { AppSidebar } from "@/components/app/app-sidebar"
import { MobileTabBar } from "@/components/app/mobile-tabbar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

/** The app shell: sidebar on desktop, tab bar on iPhone. */
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="pb-24 md:pb-0">{children}</SidebarInset>
      <MobileTabBar />
    </SidebarProvider>
  )
}
