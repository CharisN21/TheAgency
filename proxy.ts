import { NextResponse, type NextRequest } from "next/server"

const PROTECTED = [
  "/today",
  "/team",
  "/settings",
  "/projects",
  "/network",
  "/meetings",
  "/notebook",
  "/new-workspace",
]

/**
 * Keeps signed-out people out of the app. While we are on local data the session is
 * a cookie; when Supabase arrives this refreshes the Supabase session instead.
 */
export function proxy(request: NextRequest) {
  const signedIn = Boolean(request.cookies.get("agency_user")?.value)
  const needsAuth = PROTECTED.some((p) => request.nextUrl.pathname.startsWith(p))

  if (!signedIn && needsAuth) {
    const url = request.nextUrl.clone()
    url.pathname = "/sign-in"
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.svg|icon-maskable.svg|.*\\.png$).*)",
  ],
}
