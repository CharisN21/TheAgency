import Link from "next/link"
import { LogOut } from "lucide-react"

import { Mark } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { signOut } from "@/lib/data/actions"

/** The frame for the screens before you enter a workspace: ventures, founders, waiting for an invite. */
export function EntryShell({ email, children }: { email?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-16 items-center justify-between gap-3 px-6">
        <Link href="/ventures" className="flex items-center gap-3">
          <Mark size={28} />
          <span className="text-sm font-semibold tracking-[0.18em]">THE AGENCY</span>
        </Link>
        {email && (
          <form action={signOut} className="flex items-center gap-3">
            <span className="text-muted-foreground hidden text-sm sm:inline">{email}</span>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut /> Sign out
            </Button>
          </form>
        )}
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pt-6 pb-16">{children}</main>
    </div>
  )
}
