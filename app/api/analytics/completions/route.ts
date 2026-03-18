import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ── Constants ─────────────────────────────────────────────────────────────────

const ADMIN_ROLES = ['centre_admin', 'super_admin'] as const

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProgressRow {
  course_id:      string
  course_title:   string
  learner_id:     string
  completion_pct: number
}

export interface CompletionPoint {
  course_title: string
  enrolled:     number
  completed:    number
  rate:         number   // 0–100, rounded to 1 dp
}

// ── GET /api/analytics/completions ────────────────────────────────────────────

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

  // ── Data query ─────────────────────────────────────────────────────────────
  const adminSupabase = createAdminClient()

  const { data: rows, error } = await adminSupabase
    .from('v_learner_course_progress')
    .select('course_id, course_title, learner_id, completion_pct')

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  // ── Aggregate: per course, count distinct learners + completed learners ─────
  // A learner may have multiple enrolments in the same course (different classes);
  // use Sets to count each learner once per course.
  const courseMap = new Map<string, {
    title:     string
    enrolled:  Set<string>
    completed: Set<string>
  }>()

  for (const row of (rows ?? []) as ProgressRow[]) {
    if (!courseMap.has(row.course_id)) {
      courseMap.set(row.course_id, {
        title:     row.course_title,
        enrolled:  new Set(),
        completed: new Set(),
      })
    }
    const entry = courseMap.get(row.course_id)!
    entry.enrolled.add(row.learner_id)
    if (row.completion_pct === 100) {
      entry.completed.add(row.learner_id)
    }
  }

  const data: CompletionPoint[] = Array.from(courseMap.values())
    .map(({ title, enrolled, completed }) => {
      const enrolledCount   = enrolled.size
      const completedCount  = completed.size
      const rate = enrolledCount > 0
        ? Math.round((completedCount / enrolledCount) * 1000) / 10   // 1 dp
        : 0
      return { course_title: title, enrolled: enrolledCount, completed: completedCount, rate }
    })
    .sort((a, b) => a.course_title.localeCompare(b.course_title))

  return NextResponse.json({ success: true, data })
}
