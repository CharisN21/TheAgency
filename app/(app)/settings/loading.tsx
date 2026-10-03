import { PageSkeleton } from "@/components/app/page-skeleton"

export default function Loading() {
  return <PageSkeleton tone="accent" stats={0} body="form" narrow label="Loading settings" />
}
