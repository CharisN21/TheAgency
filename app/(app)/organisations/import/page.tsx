import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Band } from "@/components/app/band"
import { PageHeader } from "@/components/app/page-header"
import { requireContext } from "@/lib/data/session"
import { can } from "@/lib/data/types"
import { ImportWizard } from "./wizard"

export default async function ImportPage() {
  const { role, workspace } = await requireContext()
  if (!can.edit(role)) redirect("/organisations")

  return (
    <div className="flex min-h-svh flex-col">
      <PageHeader title="Import organisations" meta={`into ${workspace.name}`} />
      <main className="flex-1">
        <Band tone="accent" index={0} label="About importing">
          <Link
            href="/organisations"
            className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-1 text-sm"
          >
            <ArrowLeft className="size-4" /> All organisations
          </Link>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">Bring in a spreadsheet</h2>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            Upload a CSV, tell us which column is which, and see what already exists before
            anything is added. People on the same row come in with their organisation.
          </p>
        </Band>

        <Band index={1} label="Import steps" className="pb-10">
          <ImportWizard />
        </Band>
      </main>
    </div>
  )
}
