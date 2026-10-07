import { Lock } from "lucide-react"

import { Band, BandTitle } from "@/components/app/band"
import { Notebook } from "@/components/app/notebook"
import { PageHeader } from "@/components/app/page-header"
import { listMyNotes } from "@/lib/data/queries"
import { requireContext } from "@/lib/data/session"
import { can } from "@/lib/data/types"

export default async function NotebookPage() {
  const { user, workspace, role } = await requireContext()
  const notes = await listMyNotes(workspace.id, user.id)

  return (
    <div className="flex min-h-svh flex-col">
      <PageHeader title="Notebook" meta="Only you" />

      <main className="flex-1">
        <Band tone="accent" index={0} narrow label="About your notebook">
          <p className="flex items-start gap-2 text-sm">
            <Lock className="text-accent-foreground mt-0.5 size-4 shrink-0" />
            <span>
              Only you can see your notes. Owners and admins cannot.{" "}
              <span className="text-muted-foreground">
                A note reaches anyone else only if you post it to a person, organisation or deal timeline, and then just those words.
              </span>
            </span>
          </p>
        </Band>

        <Band index={1} narrow label="Your notes" className="pb-10">
          <BandTitle>{notes.length === 1 ? "1 note" : `${notes.length} notes`}</BandTitle>
          <Notebook notes={notes} canEdit={can.edit(role)} />
        </Band>
      </main>
    </div>
  )
}
