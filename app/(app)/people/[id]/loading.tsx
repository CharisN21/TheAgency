import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex min-h-svh flex-col" aria-busy="true">
      <header className="border-border flex h-14 items-center gap-2 border-b px-4">
        <Skeleton className="h-5 w-40" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-16" />
      </header>
      <div className="bg-accent/70 px-4 py-8 md:px-8">
        <div className="mx-auto max-w-5xl">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-4 h-8 w-64" />
          <div className="mt-6 grid grid-cols-4 gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        </div>
      </div>
      <div className="px-4 py-8 md:px-8">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    </div>
  )
}
