import { DuplicateReview } from "@/components/app/duplicate-review"
import { listDuplicatePeople } from "@/lib/data/queries"
import { requireTab } from "@/lib/data/session"

export default async function PeopleDuplicatesPage() {
  const { workspace, role } = await requireTab("people")
  const pairs = await listDuplicatePeople(workspace.id)
  return <DuplicateReview object="people" pairs={pairs} role={role} workspaceName={workspace.name} />
}
