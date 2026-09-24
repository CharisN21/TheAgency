"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"

/** Anything that throws inside the app shell lands here, with a way out. */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="grid min-h-svh place-items-center p-6">
      <div className="max-w-md text-center">
        <span className="bg-danger-soft text-destructive mx-auto grid size-14 place-items-center rounded-2xl">
          <AlertTriangle className="size-6" />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">
          That didn&apos;t load
        </h1>
        <p className="text-muted-foreground mt-2">
          Something went wrong on this screen. Nothing you did was lost — try again, and
          if it keeps happening, tell Claude Code what you clicked.
        </p>
        {error.digest && (
          <p className="text-muted-foreground mt-2 font-mono text-xs">
            Reference: {error.digest}
          </p>
        )}
        <Button size="lg" className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  )
}
