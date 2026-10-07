import { NextResponse, type NextRequest } from "next/server"

import { getUser, setCurrentWorkspace } from "@/lib/data/session"
import { readDb } from "@/lib/data/store"
import { safeTarget } from "@/lib/push/open"

/**
 * Where a banner lands. Signed out: sign in first, then come back here. Signed
 * in: switch to the workspace the banner is about, but only if you belong to
 * it, then go to the page. A link to anywhere outside the app goes to Today.
 */
export async function GET(request: NextRequest) {
  const to = safeTarget(request.nextUrl.searchParams.get("to")) ?? "/today"
  const workspaceId = request.nextUrl.searchParams.get("w") ?? ""

  const user = await getUser()
  if (!user) {
    const back = `${request.nextUrl.pathname}${request.nextUrl.search}`
    return NextResponse.redirect(new URL(`/sign-in?next=${encodeURIComponent(back)}`, request.nextUrl.origin))
  }

  const db = await readDb()
  if (db.memberships.some((m) => m.user_id === user.id && m.workspace_id === workspaceId)) {
    await setCurrentWorkspace(workspaceId)
  }
  return NextResponse.redirect(new URL(to, request.nextUrl.origin))
}
