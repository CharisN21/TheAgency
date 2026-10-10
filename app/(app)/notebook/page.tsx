import { Lock } from "lucide-react"

import { Band, BandTitle } from "@/components/app/band"
import { Notebook } from "@/components/app/notebook"
import { PageHeader } from "@/components/app/page-header"
import { listNotebook, listProjects } from "@/lib/data/queries"
import { requireContext } from "@/lib/data/session"
import { can } from "@/lib/data/types"

export default async function NotebookPage() {
  const { user, workspace, role } = await requireContext()
  const [{ mine, shared }, projects] = await Promise.all([listNotebook(workspace.id, user.id, role), listProjects(workspace.id)])
  const place = {
    canEdit: can.edit(role),
    workspaceName: workspace.name,
    projects: projects.filter((p) => p.status === "active").map((p) => ({ value: p.id, label: p.name })),
  }

  return (
    <div className="flex min-h-svh flex-col">
      <PageHeader title="Notebook" />

      <main className="flex-1">
        <Band tone="accent" index={0} narrow label="About your notebook">
          <p className="flex items-start gap-2 text-sm">
            <Lock className="text-accent-foreground mt-0.5 size-4 shrink-0" />
            <span>
              Your notes and whiteboards are yours alone until you share them. Owners and admins cannot see them.{" "}
              <span className="text-muted-foreground">
                Share one with everyone here or with a project, and each shows who can see it. Others can draw on a shared whiteboard;
                only you change your notes.
              </span>
            </span>
          </p>
        </Band>

        <Band index={1} narrow label="Your notes" className="pb-10">
          <BandTitle>Notes and whiteboards</BandTitle>
          <Notebook mine={mine} shared={shared} {...place} />
        </Band>
      </main>
    </div>
  )
}
