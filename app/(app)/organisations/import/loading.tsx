import { PageSkeleton } from "@/components/app/page-skeleton"

export default function Loading() {
  return <PageSkeleton tone="maroon" stats={0} body="form" label="Loading the import" />
}
