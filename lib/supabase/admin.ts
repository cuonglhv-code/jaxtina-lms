import { createClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client — bypasses RLS.
 * ONLY use in server-side code that runs outside the user request context
 * (e.g. background AI pipeline, notification insertion).
 * Never expose SUPABASE_SERVICE_ROLE_KEY to the client.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
