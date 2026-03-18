# /lib/supabase

Supabase client factory functions.

## Planned files
- `server.ts` — `createServerClient` via `@supabase/ssr` (cookies-based, for RSC + Route Handlers)
- `browser.ts` — `createBrowserClient` via `@supabase/ssr` (for Client Components)

## Rules
- Never import `server.ts` from a `"use client"` file
- Always destructure `{ data, error }` — never assume success
- `SUPABASE_SERVICE_ROLE_KEY` is used only in server-side admin utilities, never exposed to the client
