import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ── GET /api/branches ────────────────────────────────────────────────────────
// Returns all branches accessible to the session user (RLS-filtered).
// Note: user_profiles has no org_id column in the current schema.
// The RLS policy "authenticated: read branches" allows all authenticated
// users to read all branches, so this returns all branches. Scope by
// organisation once an org_id column is added to user_profiles.
export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const { data, error } = await supabase
    .from('branches')
    .select('id, name, city, organisation_id')
    .order('name', { ascending: true })

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, data })
}
