import Link from "next/link"
import { Mail } from "lucide-react"

import { Mark } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>
}) {
  const { to } = await searchParams

  return (
    <div className="relative grid min-h-svh place-items-center p-6">
      <Link href="/" className="absolute top-6 left-6 flex items-center gap-3">
        <Mark size={28} />
        <span className="text-sm font-semibold tracking-[0.18em]">THE AGENCY</span>
      </Link>

      <div className="bg-card w-full max-w-md rounded-xl border p-10 text-center">
        <span className="bg-accent text-accent-foreground mx-auto grid size-16 place-items-center rounded-2xl">
          <Mail className="size-7" />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">Check your email</h1>
        <p className="text-muted-foreground mt-2">
          We sent a sign-in link to{" "}
          <strong className="text-foreground">{to ?? "your inbox"}</strong>. Open it on
          this device. It works for 1 hour.
        </p>
        <Button asChild variant="outline" size="lg" className="mt-6 w-full">
          <Link href="/sign-in">Use a different email</Link>
        </Button>
      </div>
    </div>
  )
}
