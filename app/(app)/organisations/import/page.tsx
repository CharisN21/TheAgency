import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"

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
      <main className="flex-1 px-4 py-6 md:px-8">
        <Link
          href="/organisations"
          className="text-muted-foreground mb-6 inline-flex items-center gap-1.5 text-sm hover:underline"
        >
          <ArrowLeft className="size-4" /> All organisations
        </Link>
        <ImportWizard />
      </main>
    </div>
  )
}
