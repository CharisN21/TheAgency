import { DuplicateReview } from "@/components/app/duplicate-review"
import { listDuplicateOrganisations } from "@/lib/data/queries"
import { requireTab } from "@/lib/data/session"

export default async function OrganisationDuplicatesPage() {
  const { workspace, role } = await requireTab("organisations")
  const pairs = await listDuplicateOrganisations(workspace.id)
  return (
    <DuplicateReview object="organisations" pairs={pairs} role={role} workspaceName={workspace.name} />
  )
}
