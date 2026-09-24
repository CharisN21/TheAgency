import Link from "next/link"
import { Contact, Mail, MessageCircle, Phone } from "lucide-react"

import { DuplicatesNotice } from "@/components/app/duplicates"
import { PageHeader } from "@/components/app/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { listContacts, listDuplicatePeople } from "@/lib/data/queries"
import { requireContext } from "@/lib/data/session"

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

function touch(days: number | null) {
  if (days === null) return { text: "No date set", tone: "text-muted-foreground" }
  if (days < 0) return { text: `${Math.abs(days)} days overdue`, tone: "text-destructive font-medium" }
  if (days === 0) return { text: "Speak today", tone: "text-warn font-medium" }
  if (days <= 7) return { text: `in ${days} days`, tone: "text-warn" }
  return { text: `in ${days} days`, tone: "text-muted-foreground" }
}

export default async function PeoplePage() {
  const { workspace } = await requireContext()
  const [people, duplicates] = await Promise.all([
    listContacts(workspace.id),
    listDuplicatePeople(workspace.id),
  ])
  const due = people.filter((p) => (p.touchDueInDays ?? 99) <= 0).length

  return (
    <div className="flex min-h-svh flex-col">
      <PageHeader
        title="People"
        meta={due > 0 ? `${people.length} · ${due} to speak to` : `${people.length}`}
      />

      <main className="flex-1 px-4 py-6 md:px-8">
        <DuplicatesNotice count={duplicates.length} href="/people/duplicates" />
        {people.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
            <Contact className="text-ink-3 size-9" />
            <h3 className="font-semibold">Nobody here yet</h3>
            <p className="text-muted-foreground max-w-sm text-sm">
              People are added from the organisation they work for, so their history stays
              in one place. Open an organisation and add someone.
            </p>
            <Button asChild variant="outline">
              <Link href="/organisations">Go to organisations</Link>
            </Button>
          </div>
        ) : (
          <Card className="py-0">
            <CardContent className="divide-border divide-y p-0">
              {people.map((p) => {
                const t = touch(p.touchDueInDays)
                return (
                  <div
                    key={p.id}
                    className="flex min-h-16 flex-wrap items-center gap-3 px-4 py-2.5"
                  >
                    <span className="bg-fill-strong grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold">
                      {initials(p.full_name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {p.full_name}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {p.title ? `${p.title} · ` : ""}
                        {p.organisation ? (
                          <Link
                            href={`/organisations/${p.organisation.id}`}
                            className="hover:underline"
                          >
                            {p.organisation.name}
                          </Link>
                        ) : (
                          "No organisation"
                        )}
                      </span>
                    </span>

                    <span className={`text-xs ${t.tone}`}>{t.text}</span>

                    {p.tags.slice(0, 1).map((tag) => (
                      <Badge key={tag} variant="outline" className="hidden sm:inline-flex">
                        {tag}
                      </Badge>
                    ))}

                    <span className="flex gap-1">
                      {p.phone && (
                        <>
                          <Button variant="ghost" size="icon-sm" asChild aria-label={`Call ${p.full_name}`}>
                            <a href={`tel:${p.phone.replace(/\s/g, "")}`}>
                              <Phone />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            asChild
                            aria-label={`WhatsApp ${p.full_name}`}
                          >
                            <a
                              href={`https://wa.me/?text=${encodeURIComponent(`Hi ${p.full_name.split(" ")[0]},`)}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <MessageCircle />
                            </a>
                          </Button>
                        </>
                      )}
                      {p.email && (
                        <Button variant="ghost" size="icon-sm" asChild aria-label={`Email ${p.full_name}`}>
                          <a href={`mailto:${p.email}`}>
                            <Mail />
                          </a>
                        </Button>
                      )}
                    </span>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
