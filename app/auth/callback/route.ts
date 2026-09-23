import { NextResponse } from "next/server"

import { isSupabaseConfigured } from "@/lib/supabase/config"
import { createClient } from "@/lib/supabase/server"

/**
 * Where Google and the magic link come back to. Exchanges the code for a session,
 * then sends the person on to `next` (Today by default).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/today"

  if (!isSupabaseConfigured) {
    return NextResponse.redirect(`${origin}/sign-in?error=not-configured`)
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=sign-in-failed`)
}
