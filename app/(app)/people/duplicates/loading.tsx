import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex min-h-svh flex-col" aria-busy="true">
      <header className="border-border flex h-14 items-center gap-2 border-b px-4">
        <Skeleton className="h-5 w-40" />
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-8">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-4 w-72" />
        {[0, 1].map((i) => (
          <Card key={i} className="mt-6 py-0">
            <CardContent className="flex flex-col gap-4 p-6">
              <Skeleton className="h-5 w-32" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
              <Skeleton className="h-32" />
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  )
}
