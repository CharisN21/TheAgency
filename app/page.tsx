import Link from "next/link"
import { FolderKanban, Share2, Sparkles } from "lucide-react"

import { LogoIntro } from "@/components/brand/logo-intro"
import { Mark } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"

const FEATURES = [
  {
    icon: FolderKanban,
    title: "Projects that report themselves",
    body: "Scope it, let the AI propose the team, then watch progress rings instead of chasing people for updates.",
  },
  {
    icon: Share2,
    title: "Nobody falls through",
    body: "Every supplier, client and referral remembered, with the next conversation already scheduled.",
  },
  {
    icon: Sparkles,
    title: "A second opinion at 11pm",
    body: "Describe the problem. Get it restated, compared to real cases, and answered with paths — never one answer.",
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-svh">
      <header className="bg-bar border-border sticky top-0 z-40 flex items-center gap-6 border-b px-6 py-3 backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-2.5">
          <Mark size={26} />
          <span className="text-sm font-semibold tracking-[0.18em]">THE AGENCY</span>
        </Link>
        <div className="flex-1" />
        <Link href="/sign-in" className="text-muted-foreground text-sm font-medium">
          Sign in
        </Link>
        <Button asChild size="sm">
          <Link href="/sign-in">Start free</Link>
        </Button>
      </header>

      <main>
        <section className="flex flex-col items-center gap-5 px-6 pt-16 pb-14 text-center md:pt-20">
          <LogoIntro />
          <h1 className="mt-2 max-w-3xl text-4xl font-bold tracking-tight text-balance md:text-5xl lg:text-6xl">
            Run every company you own from one calm place.
          </h1>
          <p className="text-muted-foreground max-w-xl text-lg text-pretty">
            Projects, people, meetings and the leadership coaching that comes from your own
            decisions. Built for founders running more than one thing at once.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/sign-in">Start free for 30 days</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/today">See how it works</Link>
            </Button>
          </div>
          <p className="text-muted-foreground text-sm">
            Free while you set it up · M-Pesa when you are ready · your data stays yours
          </p>
        </section>

        <div className="mx-auto h-px max-w-3xl bg-linear-to-r from-transparent via-[var(--brass)] to-transparent" />

        <section className="mx-auto grid max-w-5xl gap-4 px-6 py-14 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-card rounded-xl border p-6">
              <f.icon className="text-primary size-6" />
              <h2 className="mt-3 font-semibold">{f.title}</h2>
              <p className="text-muted-foreground mt-1.5 text-sm">{f.body}</p>
            </div>
          ))}
        </section>

        <footer className="text-muted-foreground border-border border-t px-6 py-8 text-center text-sm">
          The Agency · Nairobi · Private by default
        </footer>
      </main>
    </div>
  )
}
