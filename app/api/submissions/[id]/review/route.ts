import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type RouteContext = { params: Promise<{ id: string }> }

// ── Validation ────────────────────────────────────────────────────────────────

const bandScore = z
  .number({ error: 'Band score must be a number' })
  .min(1, 'Minimum 1.0')
  .max(9, 'Maximum 9.0')
  .refine(v => v % 0.5 === 0, 'Must be a multiple of 0.5')

const reviewSchema = z.object({
  band_overall: bandScore,
  band_ta:      bandScore,
  band_cc:      bandScore,
  band_lr:      bandScore,
  band_gra:     bandScore,
  feedback_en:  z.string().min(1, 'English feedback is required'),
  feedback_vi:  z.string().optional().nullable(),
})

// ── POST /api/submissions/[id]/review ─────────────────────────────────────────
// Teacher submits their review: inserts feedback, marks submission reviewed,
// notifies the learner.
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  const parsed = reviewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.flatten() },
      { status: 422 }
    )
  }

  // ── Verify this teacher can review this submission ─────────────────────────
  // v_submission_queue is filtered by RLS + teacher_id eq
  const { data: queueRowRaw, error: accessError } = await supabase
    .from('v_submission_queue')
    .select('submission_id, learner_id, class_name, assignment_title, course_title')
    .eq('submission_id', id)
    .eq('teacher_id', user.id)
    .maybeSingle()

  const queueRow = queueRowRaw as {
    submission_id: string; learner_id: string; class_name: string
    assignment_title: string; course_title: string
  } | null

  if (accessError || !queueRow) {
    return NextResponse.json(
      { success: false, error: 'Submission not found or you do not have access' },
      { status: 403 }
    )
  }

  const { band_overall, band_ta, band_cc, band_lr, band_gra, feedback_en, feedback_vi } = parsed.data

  // ── Insert teacher feedback ────────────────────────────────────────────────
  // Teacher RLS allows this: source='teacher', author_id=auth.uid()
  const { error: feedbackError } = await supabase
    .from('feedback')
    .insert({
      submission_id: id,
      source:        'teacher',
      author_id:     user.id,
      band_overall,
      band_ta,
      band_cc,
      band_lr,
      band_gra,
      feedback_en,
      feedback_vi:   feedback_vi ?? null,
    } as never)

  if (feedbackError) {
    return NextResponse.json(
      { success: false, error: feedbackError.message },
      { status: 500 }
    )
  }

  // ── Update submission status → 'reviewed' (requires admin client: no teacher update RLS) ──
  const { error: updateError } = await adminSupabase
    .from('submissions')
    .update({ status: 'reviewed' } as never)
    .eq('id', id)

  if (updateError) {
    // Non-fatal — feedback was saved; status update failure is recoverable
  }

  // ── Notify learner (service-role only) ────────────────────────────────────
  await adminSupabase.from('notifications').insert({
    user_id:    queueRow.learner_id,
    type:       'feedback_ready',
    title:      'Teacher feedback ready',
    title_vi:   'Giáo viên đã chấm bài của bạn',
    body:       `Your submission for "${queueRow.assignment_title}" has been reviewed. Overall band: ${band_overall}`,
    action_url: `/learner/submissions`,
  } as never)

  return NextResponse.json({ success: true, data: { submission_id: id } })
}
