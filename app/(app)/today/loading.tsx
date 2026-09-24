import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex min-h-svh flex-col" aria-busy="true">
      <header className="border-border flex h-14 items-center gap-2 border-b px-4">
        <Skeleton className="h-5 w-24" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-20" />
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-8">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-2 h-7 w-52" />
        <Card className="mt-6 py-0">
          <CardContent className="flex items-center gap-4 p-6">
            <Skeleton className="size-16 rounded-full" />
            <span className="flex flex-col gap-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-36" />
            </span>
          </CardContent>
          <CardContent className="p-0">
            <ul className="divide-border divide-y border-t">
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className="flex items-center gap-3 px-6 py-3.5">
                  <Skeleton className="size-6 rounded-full" />
                  <span className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-3.5 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
