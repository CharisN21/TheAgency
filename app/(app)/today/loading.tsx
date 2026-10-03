import { PageSkeleton } from "@/components/app/page-skeleton"

export default function Loading() {
  return <PageSkeleton tone="ink" stats={3} body="list" narrow label="Loading today" />
}
