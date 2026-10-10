import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Mark } from "@/components/brand/logo"
import { isFounder } from "@/lib/data/founders"
import { getUser } from "@/lib/data/session"
import { readDb } from "@/lib/data/store"
import { NewCompanyForm } from "./form"

export default async function NewCompanyPage() {
  const user = await getUser()
  if (!user) redirect("/sign-in")
  // Only founders start ventures. Everyone else is invited into workspaces.
  if (!isFounder(user)) redirect("/welcome")

  const db = await readDb()
  const isFirst = !db.memberships.some((m) => m.user_id === user.id)

  return (
    <div className="grid min-h-svh">
      <div className="flex flex-col gap-8 p-6 md:p-12">
        <div className="flex items-center justify-between">
          <Link href="/ventures" className="flex items-center gap-3">
            {isFirst ? (
              <>
                <Mark size={28} />
                <span className="text-sm font-semibold tracking-[0.18em]">
                  THE AGENCY
                </span>
              </>
            ) : (
              <>
                <ArrowLeft className="size-4" />
                <span className="text-sm font-medium">Main Hub</span>
              </>
            )}
          </Link>
          {isFirst && <span className="text-muted-foreground text-sm">Step 1 of 2</span>}
        </div>

        <div className="flex flex-1 items-center">
          <div className="w-full max-w-md">
            <h1 className="mb-8 text-3xl font-bold tracking-tight">
              {isFirst ? "Start your first venture" : "Start a venture"}
            </h1>
            <NewCompanyForm />
          </div>
        </div>
      </div>
    </div>
  )
}
