"use client"

import { useLinkStatus } from "next/link"

import { cn } from "cn"

/**
 * Goes inside a Link. While that link's page is on the way, a thin maroon
 * line sweeps along the bottom of it, so a click always gets an answer.
 */
export function LinkPending() {
  const { pending } = useLinkStatus()
  return <span aria-hidden className={cn("link-pending", pending && "is-pending")} />
}
