import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ── Constants ─────────────────────────────────────────────────────────────────

const ADMIN_ROLES = ['centre_admin', 'super_admin'] as const
const WEEKS_BACK  = 8

// ── Types ─────────────────────────────────────────────────────────────────────

interface FeedbackWithCourse {
  band_overall: number
  submission: {
    assignment: {
      lesson: {
        module: {
          course: { id: string; title: string } | null
        } | null
      } | null
    } | null
  } | null
}

export interface WeeklyPoint  { week: string; count: number }
export interface AvgBandPoint { course_title: string; avg_band: number }

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the Monday (start of week) for a given date, at midnight UTC-ish. */
function weekStartMonday(date: Date): Date {
  const d   = new Date(date)
  const day = d.getDay()                    // 0 = Sun, 1 = Mon, …
  const diff = day === 0 ? -6 : 1 - day    // shift to Monday
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function weekLabel(monday: Date): string {
  return monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// Build the ordered list of week start timestamps for the last N weeks
function lastWeekStarts(count: number): Date[] {
  const now   = new Date()
  const thisW = weekStartMonday(now)
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(thisW)
    d.setDate(d.getDate() - (count - 1 - i) * 7)
    return d
  })
}

// ── GET /api/analytics/submissions ────────────────────────────────────────────

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

  const adminSupabase = createAdminClient()

  const weekStarts    = lastWeekStarts(WEEKS_BACK)
  const eightWeeksAgo = weekStarts[0]

  // ── Two parallel queries ───────────────────────────────────────────────────
  const [{ data: subRows, error: subError }, { data: fbRows, error: fbError }] =
    await Promise.all([
      // a) Submission timestamps for last 8 weeks
      adminSupabase
        .from('submissions')
        .select('submitted_at')
        .gte('submitted_at', eightWeeksAgo.toISOString())
        .not('submitted_at', 'is', null),

      // b) AI feedback with deep course join for avg band per course
      adminSupabase
        .from('feedback')
        .select(
          `band_overall,
           submission:submissions!submission_id(
             assignment:assignments!assignment_id(
               lesson:lessons!lesson_id(
                 module:modules!module_id(
                   course:courses!course_id(id, title)
                 )
               )
             )
           )`
        )
        .eq('source', 'ai')
        .not('band_overall', 'is', null),
    ])

  if (subError) {
    return NextResponse.json({ success: false, error: subError.message }, { status: 500 })
  }
  if (fbError) {
    return NextResponse.json({ success: false, error: fbError.message }, { status: 500 })
  }

  // ── Weekly aggregation ─────────────────────────────────────────────────────
  // Map from week-start timestamp → count
  const weekCountMap = new Map<number, number>(
    weekStarts.map(d => [d.getTime(), 0])
  )

  for (const row of (subRows ?? []) as { submitted_at: string }[]) {
    if (!row.submitted_at) continue
    const ws  = weekStartMonday(new Date(row.submitted_at))
    const key = ws.getTime()
    if (weekCountMap.has(key)) {
      weekCountMap.set(key, (weekCountMap.get(key) ?? 0) + 1)
    }
  }

  const weekly: WeeklyPoint[] = weekStarts.map(d => ({
    week:  weekLabel(d),
    count: weekCountMap.get(d.getTime()) ?? 0,
  }))

  // ── Avg band aggregation ───────────────────────────────────────────────────
  const courseMap = new Map<string, { title: string; scores: number[] }>()

  for (const f of (fbRows ?? []) as unknown as FeedbackWithCourse[]) {
    const course = f.submission?.assignment?.lesson?.module?.course
    if (!course || f.band_overall == null) continue
    if (!courseMap.has(course.id)) {
      courseMap.set(course.id, { title: course.title, scores: [] })
    }
    courseMap.get(course.id)!.scores.push(Number(f.band_overall))
  }

  const avgBands: AvgBandPoint[] = Array.from(courseMap.values())
    .map(({ title, scores }) => ({
      course_title: title,
      avg_band: Math.round(
        (scores.reduce((a, b) => a + b, 0) / scores.length) * 100
      ) / 100,
    }))
    .sort((a, b) => a.course_title.localeCompare(b.course_title))

  return NextResponse.json({ success: true, data: { weekly, avgBands } })
}
