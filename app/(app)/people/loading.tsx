import { PageSkeleton } from "@/components/app/page-skeleton"

export default function Loading() {
  return <PageSkeleton tone="maroon" stats={3} body="table" label="Loading people" />
}
