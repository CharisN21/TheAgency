import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Mark } from "@/components/brand/logo"
import { getUser } from "@/lib/data/session"
import { readDb } from "@/lib/data/store"
import { NewCompanyForm } from "./form"

export default async function NewCompanyPage() {
  const user = await getUser()
  if (!user) redirect("/sign-in")

  const db = await readDb()
  const isFirst = !db.memberships.some((m) => m.user_id === user.id)

  return (
    <div className="grid min-h-svh lg:grid-cols-[1.15fr_1fr]">
      <div className="flex flex-col gap-8 p-6 md:p-12">
        <div className="flex items-center justify-between">
          <Link href={isFirst ? "/sign-in" : "/today"} className="flex items-center gap-3">
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
                <span className="text-sm font-medium">Back to Today</span>
              </>
            )}
          </Link>
          {isFirst && <span className="text-muted-foreground text-sm">Step 1 of 2</span>}
        </div>

        <div className="flex flex-1 items-center">
          <div className="w-full max-w-md">
            <h1 className="text-3xl font-bold tracking-tight">
              {isFirst ? "Create your company" : "Add another company"}
            </h1>
            <p className="text-muted-foreground mt-2 mb-8">
              A company is a separate space with its own projects, people and data.
              Nothing crosses between them.
            </p>
            <NewCompanyForm />
          </div>
        </div>
      </div>

      <aside className="bg-accent hidden flex-col justify-center gap-6 p-12 lg:flex">
        <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          What you get
        </p>
        <ul className="flex flex-col gap-4 text-sm">
          {[
            ["Your own space", "Projects, people and files that only this company sees."],
            ["Invite by link", "Give each person a role: admin, member or viewer."],
            ["Switch in one click", "The switcher at the top left moves between ventures."],
          ].map(([title, body]) => (
            <li key={title}>
              <p className="font-medium">{title}</p>
              <p className="text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}
