import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ── Constants ─────────────────────────────────────────────────────────────────

const ADMIN_ROLES = ['centre_admin', 'super_admin'] as const

// ── Types ─────────────────────────────────────────────────────────────────────

interface EnrolmentRow {
  enrolled_at: string
  class: { branch: { city: string } | null } | null
}

export interface EnrolmentMonthPoint {
  month: string
  [branchCode: string]: number | string   // HAN, HCM, …
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function branchCode(city: string): string {
  const c = city.toLowerCase()
  if (c.includes('hanoi') || c.includes('hà nội') || c.includes('ha noi')) return 'HAN'
  if (c.includes('minh') || c.includes('hcm') || c.includes('ho chi'))      return 'HCM'
  return city.slice(0, 3).toUpperCase()
}

// Returns the last `count` calendar months, earliest first.
// Each element: { key: 'YYYY-MM', label: 'Mon YYYY' }
function lastMonths(count: number): { key: string; label: string }[] {
  const now = new Date()
  const result = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' })
    result.push({ key, label })
  }
  return result
}

// ── GET /api/analytics/enrolments ─────────────────────────────────────────────

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profileRaw } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const profile = profileRaw as { role: string } | null

  if (!profile || !ADMIN_ROLES.includes(profile.role as typeof ADMIN_ROLES[number])) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  // ── Data query (admin client — bypasses RLS) ───────────────────────────────
  const adminSupabase = createAdminClient()

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  sixMonthsAgo.setDate(1)
  sixMonthsAgo.setHours(0, 0, 0, 0)

  const { data: rows, error } = await adminSupabase
    .from('enrolments')
    .select('enrolled_at, class:classes!class_id(branch:branches!branch_id(city))')
    .gte('enrolled_at', sixMonthsAgo.toISOString())

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  // ── Aggregate ──────────────────────────────────────────────────────────────
  const months = lastMonths(6)

  // Initialise all months with 0 counts
  const buckets = new Map<string, Record<string, number>>(
    months.map(({ key }) => [key, {}])
  )

  for (const row of (rows ?? []) as unknown as EnrolmentRow[]) {
    if (!row.enrolled_at) continue
    const d    = new Date(row.enrolled_at)
    const key  = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const code = branchCode(row.class?.branch?.city ?? 'Unknown')

    const bucket = buckets.get(key)
    if (!bucket) continue
    bucket[code] = (bucket[code] ?? 0) + 1
  }

  const data: EnrolmentMonthPoint[] = months.map(({ key, label }) => ({
    month: label,
    ...buckets.get(key),
  }))

  return NextResponse.json({ success: true, data })
}
