import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  CalendarDays,
  Mail,
  MapPin,
  MessageCircle,
  NotebookPen,
  Phone,
  Plus,
  Users,
} from "lucide-react"

import { PageHeader } from "@/components/app/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { NewDeal } from "@/app/(app)/deals/new-deal"
import { getOrganisation, listOrganisations } from "@/lib/data/queries"
import { requireContext } from "@/lib/data/session"
import {
  ACTIVITY_LABEL,
  ORG_CATEGORY_LABEL,
  can,
  money,
  stageOf,
  type ActivityType,
} from "@/lib/data/types"
import { AddContact, LogActivity } from "./record-actions"

const ICON: Record<ActivityType, typeof Phone> = {
  call: Phone,
  whatsapp: MessageCircle,
  meeting: CalendarDays,
  email: Mail,
  visit: MapPin,
  note: NotebookPen,
  system: NotebookPen,
}

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

const when = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5)
  if (days === 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 30) return `${days} days ago`
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

export default async function OrganisationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { workspace, role, user } = await requireContext()
  const found = await getOrganisation(workspace.id, id)
  if (!found) notFound()

  const { organisation: o, owner, contacts, deals, activities, openValue, wonValue } = found
  const organisations = await listOrganisations(workspace.id)
  const editable = can.edit(role)

  return (
    <div className="flex min-h-svh flex-col">
      <PageHeader title={o.name} meta={ORG_CATEGORY_LABEL[o.category]}>
        {editable && (
          <NewDeal
            organisations={organisations}
            fixedOrganisationId={o.id}
            variant="inline"
          />
        )}
      </PageHeader>

      <main className="flex-1 px-4 py-6 md:px-8">
        <Link
          href="/organisations"
          className="text-muted-foreground mb-4 inline-flex items-center gap-1.5 text-sm hover:underline"
        >
          <ArrowLeft className="size-4" /> All organisations
        </Link>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr_280px]">
          {/* Properties */}
          <aside className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="bg-accent text-accent-foreground grid size-12 shrink-0 place-items-center rounded-lg text-lg font-bold">
                {o.name.trim()[0]?.toUpperCase()}
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold tracking-tight">{o.name}</h2>
                <p className="text-muted-foreground truncate text-sm">
                  {o.what_they_do ?? "—"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary">{ORG_CATEGORY_LABEL[o.category]}</Badge>
              {o.tags.map((t) => (
                <Badge key={t} variant="outline">
                  {t}
                </Badge>
              ))}
            </div>

            <Card className="py-0">
              <CardContent className="divide-border divide-y p-0">
                {[
                  ["Where", o.location ?? "—"],
                  ["Phone", o.phone ?? "—"],
                  ["Email", o.email ?? "—"],
                  ["Owner", owner?.full_name ?? "—"],
                  ["Open deals", openValue > 0 ? money(openValue) : "None"],
                  ["Won so far", wonValue > 0 ? money(wonValue) : "—"],
                ].map(([label, value]) => (
                  <div key={label} className="px-4 py-2.5">
                    <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                      {label}
                    </p>
                    <p className="text-sm">{value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </aside>

          {/* Timeline */}
          <section className="flex flex-col gap-4">
            {editable && (
              <Card className="py-0">
                <CardContent className="p-3">
                  <LogActivity organisationId={o.id} />
                </CardContent>
              </Card>
            )}

            <div>
              <h3 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
                Everything that happened
              </h3>
              {activities.length === 0 ? (
                <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-10 text-center text-sm">
                  Nothing logged yet. Every call, message and change shows up here.
                </p>
              ) : (
                <ol className="flex flex-col gap-4">
                  {activities.map((a) => {
                    const Icon = ICON[a.type]
                    const actor = found.people.find((p) => p.id === a.actor_id)
                    return (
                      <li key={a.id} className="flex gap-3">
                        <span
                          className={
                            a.type === "system"
                              ? "bg-muted text-muted-foreground grid size-7 shrink-0 place-items-center rounded-full"
                              : "bg-accent text-accent-foreground grid size-7 shrink-0 place-items-center rounded-full"
                          }
                        >
                          <Icon className="size-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm leading-snug">{a.summary}</p>
                          <p className="text-muted-foreground text-xs">
                            {ACTIVITY_LABEL[a.type]} · {when(a.occurred_at)}
                            {actor ? ` · ${actor.full_name.split(" ")[0]}` : ""}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}
            </div>
          </section>

          {/* Related */}
          <aside className="flex flex-col gap-6">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  People
                </h3>
                {editable && <AddContact organisationId={o.id} organisationName={o.name} />}
              </div>
              {contacts.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nobody added yet.</p>
              ) : (
                <Card className="py-0">
                  <CardContent className="divide-border divide-y p-0">
                    {contacts.map((c) => (
                      <div key={c.id} className="flex items-center gap-3 px-3 py-2.5">
                        <span className="bg-fill-strong grid size-8 shrink-0 place-items-center rounded-full text-[10px] font-semibold">
                          {initials(c.full_name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {c.full_name}
                          </span>
                          <span className="text-muted-foreground block truncate text-xs">
                            {c.title ?? c.email ?? "—"}
                          </span>
                        </span>
                        {c.phone && (
                          <Button variant="ghost" size="icon-sm" asChild aria-label={`Call ${c.full_name}`}>
                            <a href={`tel:${c.phone.replace(/\s/g, "")}`}>
                              <Phone />
                            </a>
                          </Button>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  Deals
                </h3>
                {editable && deals.length > 0 && (
                  <Button variant="ghost" size="icon-sm" asChild aria-label="All deals">
                    <Link href="/deals">
                      <Plus />
                    </Link>
                  </Button>
                )}
              </div>
              {deals.length === 0 ? (
                <p className="text-muted-foreground text-sm">No deals with them yet.</p>
              ) : (
                <Card className="py-0">
                  <CardContent className="divide-border divide-y p-0">
                    {deals.map((d) => {
                      const stage = stageOf(d.stage)
                      return (
                        <Link
                          key={d.id}
                          href={`/deals/${d.id}`}
                          className="hover:bg-muted/50 block px-3 py-2.5"
                        >
                          <p className="truncate text-sm font-medium">{d.title}</p>
                          <p className="mt-0.5 flex items-center gap-2 text-xs">
                            <span className="tabular-nums">{money(d.value)}</span>
                            <Badge
                              variant={d.stage === "won" ? "default" : "secondary"}
                              className="h-5"
                            >
                              {stage.label}
                            </Badge>
                          </p>
                        </Link>
                      )
                    })}
                  </CardContent>
                </Card>
              )}
            </div>

            <div>
              <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                Who can see this
              </h3>
              <p className="text-muted-foreground flex items-start gap-2 text-sm">
                <Users className="mt-0.5 size-4 shrink-0" />
                Everyone in {workspace.name}. Your other workspaces never see it.
              </p>
              {!editable && (
                <p className="bg-warn-soft mt-3 rounded-lg px-3 py-2 text-sm">
                  You are a viewer, {user.full_name.split(" ")[0]} — you can read this
                  record but not change it.
                </p>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
