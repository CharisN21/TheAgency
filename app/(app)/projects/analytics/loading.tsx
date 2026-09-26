import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex min-h-svh flex-col" aria-busy="true">
      <header className="border-border flex h-14 items-center gap-2 border-b px-4">
        <Skeleton className="h-5 w-32" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-24" />
      </header>
      <div className="bg-accent/70 px-4 py-8 md:px-8">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
      <div className="px-4 py-8 md:px-8">
        <div className="mx-auto grid max-w-5xl gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    </div>
  )
}
