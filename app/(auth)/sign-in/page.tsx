import Link from "next/link"
import { redirect } from "next/navigation"
import { ShieldCheck } from "lucide-react"

import { Mark } from "@/components/brand/logo"
import { getUser } from "@/lib/data/session"
import { SignInForm } from "./sign-in-form"

export default async function SignInPage() {
  if (await getUser()) redirect("/today")

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Left: the brand panel. Hidden on phones, where the form is the whole screen. */}
      <div className="bg-accent hidden flex-col justify-between p-12 lg:flex">
        <Link href="/" className="flex items-center gap-3">
          <Mark size={32} />
          <span className="text-sm font-semibold tracking-[0.18em]">THE AGENCY</span>
        </Link>
        <div>
          <h2 className="max-w-md text-4xl font-bold tracking-tight text-balance">
            Every venture, organisation and person in one place.
          </h2>
          <p className="text-muted-foreground mt-4 max-w-sm text-lg">
            Run your ventures, remember every relationship and get better at leading, a
            little every week.
          </p>
        </div>
        <p className="text-muted-foreground text-sm">Nairobi · built for Kenyan SMEs</p>
      </div>

      {/* Right: the form. */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 flex items-center gap-3 lg:hidden">
            <Mark size={28} />
            <span className="text-sm font-semibold tracking-[0.18em]">THE AGENCY</span>
          </Link>

          <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
          <p className="text-muted-foreground mt-2 mb-6">
            No passwords. Google and email links arrive with the real database.
          </p>

          <SignInForm />

          <p className="text-muted-foreground mt-8 flex items-start gap-2 text-sm">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            Private by default. Only people you invite can see your workspace, and you can
            export or delete your data at any time.
          </p>
        </div>
      </div>
    </div>
  )
}
