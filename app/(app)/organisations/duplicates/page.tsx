import { DuplicateReview } from "@/components/app/duplicate-review"
import { listDuplicateOrganisations } from "@/lib/data/queries"
import { requireContext } from "@/lib/data/session"

export default async function OrganisationDuplicatesPage() {
  const { workspace, role } = await requireContext()
  const pairs = await listDuplicateOrganisations(workspace.id)
  return (
    <DuplicateReview object="organisations" pairs={pairs} role={role} workspaceName={workspace.name} />
  )
}
