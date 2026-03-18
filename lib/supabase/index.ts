// Supabase client instances.
// - createClient (server.ts) → Server Components, Route Handlers, Server Actions
// - createClient (client.ts) → Client Components only  (import from '@/lib/supabase/client')
//
// Import directly from the specific file to avoid bundling server code into the client:
//   import { createClient } from '@/lib/supabase/server'   ← RSC / Route Handler
//   import { createClient } from '@/lib/supabase/client'   ← 'use client' files

export { createClient as createServerSupabaseClient } from './server'
export { createClient as createBrowserSupabaseClient } from './client'
