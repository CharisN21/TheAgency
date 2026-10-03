import { PageSkeleton } from "@/components/app/page-skeleton"

export default function Loading() {
  return <PageSkeleton tone="accent" stats={2} body="list" narrow label="Loading notifications" />
}
