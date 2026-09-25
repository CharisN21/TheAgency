import { DuplicateReview } from "@/components/app/duplicate-review"
import { listDuplicatePeople } from "@/lib/data/queries"
import { requireContext } from "@/lib/data/session"

export default async function PeopleDuplicatesPage() {
  const { workspace, role } = await requireContext()
  const pairs = await listDuplicatePeople(workspace.id)
  return <DuplicateReview object="people" pairs={pairs} role={role} workspaceName={workspace.name} />
}
