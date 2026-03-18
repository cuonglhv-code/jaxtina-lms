import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type RouteContext = { params: Promise<{ id: string }> }

// ── GET /api/submissions/[id]/status ─────────────────────────────────────────
// Returns submission status and feedback row (if scored).
// Used for polling from IeltsWritingForm while awaiting AI feedback.
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params
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

  // Fetch submission — RLS ensures learner can only see their own
  const { data: submissionRaw, error } = await supabase
    .from('submissions')
    .select('id, learner_id, status')
    .eq('id', id)
    .single()

  const submission = submissionRaw as { id: string; learner_id: string; status: string } | null

  if (error || !submission) {
    return NextResponse.json(
      { success: false, error: 'Submission not found' },
      { status: 404 }
    )
  }

  // Belt-and-suspenders ownership check
  if (submission.learner_id !== user.id) {
    return NextResponse.json(
      { success: false, error: 'Forbidden' },
      { status: 403 }
    )
  }

  // If still pending, return status only — no feedback yet
  if (submission.status === 'submitted') {
    return NextResponse.json({
      success: true,
      data: { status: submission.status, feedback: null },
    })
  }

  // Fetch feedback row (most recent, in case of multiple)
  const { data: feedback } = await supabase
    .from('feedback')
    .select(`
      id, source, band_overall, band_ta, band_cc, band_lr, band_gra,
      strengths, improvements, detailed_notes,
      feedback_en, feedback_vi, model_used, created_at
    `)
    .eq('submission_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({
    success: true,
    data: { status: submission.status, feedback: feedback ?? null },
  })
}
