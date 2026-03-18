import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ADMIN_ROLES = ['centre_admin', 'super_admin'] as const
const VALID_ROLES = ['learner', 'teacher', 'academic_admin', 'centre_admin', 'super_admin'] as const

type ValidRole = typeof VALID_ROLES[number]

// ── GET /api/users ───────────────────────────────────────────────────────────
// Admin-only. Returns id + full_name only (safe for select inputs).
// Accepts ?role= to filter by a specific role.
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Admin role check
  const { data: profileRaw, error: profileError } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const profile = profileRaw as { role: string } | null

  if (profileError || !profile || !ADMIN_ROLES.includes(profile.role as typeof ADMIN_ROLES[number])) {
    return NextResponse.json(
      { success: false, error: 'Forbidden' },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const role = searchParams.get('role')
  const q    = searchParams.get('q')?.trim()

  // Validate role param if provided
  if (role && !VALID_ROLES.includes(role as ValidRole)) {
    return NextResponse.json(
      { success: false, error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` },
      { status: 400 }
    )
  }

  let query = supabase
    .from('user_profiles')
    .select('id, full_name, email')
    .order('full_name', { ascending: true })
    .limit(30)

  if (role) {
    query = query.eq('role', role)
  }

  // Full-name substring search for learner picker
  if (q) {
    query = query.ilike('full_name', `%${q}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, data })
}
