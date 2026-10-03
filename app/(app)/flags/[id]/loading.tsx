import { PageSkeleton } from "@/components/app/page-skeleton"

export default function Loading() {
  return <PageSkeleton tone="accent" stats={0} body="detail" narrow label="Loading the flag" />
}
