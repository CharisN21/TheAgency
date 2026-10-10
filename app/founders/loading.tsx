import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-6 pt-24" aria-busy="true">
      <p role="status" className="sr-only">Loading</p>
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-5 w-80" />
      <Skeleton className="mt-6 h-20 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
    </div>
  )
}
