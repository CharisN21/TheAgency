import { ChatButton } from "@/components/app/chat"
import { SearchButton } from "@/components/app/command-palette"
import { NotificationBell } from "@/components/app/notification-bell"
import { CaptureButton } from "@/components/app/quick-capture"
import { SidebarTrigger } from "@/components/ui/sidebar"

/** Every screen wears the same hat: trigger on phones, title, then actions. */
export function PageHeader({
  title,
  meta,
  children,
}: {
  title: string
  meta?: string
  children?: React.ReactNode
}) {
  return (
    <header className="bg-bar border-border sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 backdrop-blur-xl">
      <SidebarTrigger className="md:hidden" />
      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        <h1 className="truncate font-semibold">{title}</h1>
        {meta && (
          <span className="text-muted-foreground hidden truncate text-sm sm:inline">
            {meta}
          </span>
        )}
      </div>
      <SearchButton />
      {children}
      <CaptureButton />
      <ChatButton />
      <NotificationBell />
    </header>
  )
}
