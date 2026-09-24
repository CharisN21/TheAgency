import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/** Same shape as the real list, so nothing jumps when the data arrives. */
export default function Loading() {
  return (
    <div className="flex min-h-svh flex-col" aria-busy="true">
      <header className="border-border flex h-14 items-center gap-2 border-b px-4">
        <Skeleton className="h-5 w-16" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-20" />
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-8">
        <Skeleton className="h-9 w-56 rounded-lg" />
        <Card className="mt-4 py-0">
          <CardContent className="p-0">
            <ul className="divide-border divide-y">
              {[62, 48, 55, 44, 58].map((w, i) => (
                <li key={i} className="flex min-h-16 items-center gap-3 px-4 py-2.5">
                  <Skeleton className="size-9 rounded-full" />
                  <span className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-3.5" style={{ width: `${w}%` }} />
                    <Skeleton className="h-3 w-2/5" />
                  </span>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
