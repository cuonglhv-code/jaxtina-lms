import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

/**
 * Supabase client for Server Components, Route Handlers, and Server Actions.
 * Reads and writes session cookies via next/headers.
 *
 * Usage:
 *   const supabase = await createClient()
 *   const { data, error } = await supabase.from('courses').select()
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll is called from a Server Component where cookies are read-only.
            // The middleware will handle session refresh in those cases.
          }
        },
      },
    }
  )
}
