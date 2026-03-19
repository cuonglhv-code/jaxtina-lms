import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

/**
 * Refreshes the Supabase session on every request so the cookie-based
 * session token stays alive. Must be called from the root middleware.ts.
 *
 * Returns a NextResponse that has the refreshed session cookies set.
 * Always use the returned response — never the original request's response.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Forward cookies onto both the request and the response so that
          // Server Components downstream can read the refreshed session.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Calling getUser() triggers a token refresh if the access token has expired.
  // Do not remove this — session refresh will silently break without it.
  // Wrapped in try/catch so a missing/invalid env var fails fast instead of hanging.
  try {
    await supabase.auth.getUser()
  } catch (err) {
    console.error('[updateSession] Supabase getUser failed:', err)
  }

  return supabaseResponse
}
