'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

/**
 * Supabase client for Client Components.
 * Manages session cookies via the browser automatically.
 *
 * Usage:
 *   const supabase = createClient()
 *   const { data, error } = await supabase.from('courses').select()
 *
 * Note: never access SUPABASE_SERVICE_ROLE_KEY here — anon key only.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
