import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SubmissionSchema } from '@/lib/validations/submission'
import { scoreIeltsWriting } from '@/lib/anthropic/scoreIeltsWriting'

// ── POST /api/submissions ─────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  const parsed = SubmissionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { assignment_id, content, word_count } = parsed.data

  // ── Verify enrolment access ───────────────────────────────────────────────
  // Fetch assignment → lesson → module → course to get course_id,
  // then verify learner has an active enrolment in a class for that course.

  const { data: assignmentRaw, error: assignmentError } = await supabase
    .from('assignments')
    .select(`
      id, instructions, instructions_vi, image_url, task_type,
      lesson:lessons!lesson_id(
        id, ielts_task_type,
        module:modules!module_id(
          course:courses!course_id(id)
        )
      )
    `)
    .eq('id', assignment_id)
    .single()

  type AssignmentRow = {
    id: string; instructions: string | null; instructions_vi: string | null
    image_url: string | null; task_type: string | null
    lesson: { id: string; ielts_task_type: string | null; module: { course: { id: string } | null } | null } | null
  }
  const assignment = assignmentRaw as AssignmentRow | null

  if (assignmentError || !assignment) {
    return NextResponse.json(
      { success: false, error: 'Assignment not found' },
      { status: 404 }
    )
  }

  const lesson  = assignment.lesson as { id: string; ielts_task_type: string | null; module: { course: { id: string } | null } | null } | null
  const courseId = lesson?.module?.course?.id

  if (!courseId) {
    return NextResponse.json(
      { success: false, error: 'Could not resolve course for this assignment' },
      { status: 422 }
    )
  }

  // Check active enrolment — RLS filters enrolments to current user automatically
  const { data: enrolmentsRaw } = await supabase
    .from('enrolments')
    .select('id, class:classes!class_id(course_id)')
    .eq('learner_id', user.id)
    .eq('status', 'active')

  const enrolments = enrolmentsRaw as { id: string; class: { course_id: string } | null }[] | null
  const hasAccess = (enrolments ?? []).some(e => e.class?.course_id === courseId)

  if (!hasAccess) {
    return NextResponse.json(
      { success: false, error: 'You are not enrolled in this course' },
      { status: 403 }
    )
  }

  // ── Duplicate submission check ────────────────────────────────────────────

  const { data: existing } = await supabase
    .from('submissions')
    .select('id')
    .eq('assignment_id', assignment_id)
    .eq('learner_id', user.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { success: false, error: 'Already submitted' },
      { status: 409 }
    )
  }

  // ── Insert submission ─────────────────────────────────────────────────────

  const { data: rowRaw, error: insertError } = await supabase
    .from('submissions')
    .insert({
      assignment_id,
      learner_id:   user.id,
      content,
      word_count,
      status:       'submitted',
      submitted_at: new Date().toISOString(),
    } as never)
    .select('id')
    .single()

  const row = rowRaw as { id: string } | null

  if (insertError || !row) {
    return NextResponse.json(
      { success: false, error: insertError?.message ?? 'Insert failed' },
      { status: 500 }
    )
  }

  // ── Fire-and-forget AI scoring ────────────────────────────────────────────

  // Determine ielts task type from lesson or assignment task_type field
  const rawTaskType = lesson?.ielts_task_type ?? assignment.task_type ?? ''
  const ieltsTask: 'task1' | 'task2' =
    rawTaskType.includes('task2') || rawTaskType === 'task2' ? 'task2' : 'task1'

  void scoreIeltsWriting({
    submissionId: row.id,
    content,
    ieltsTask,
    instructions: (assignment.instructions ?? '').toString(),
    imageUrl:     (assignment.image_url as string | null) ?? undefined,
  })

  return NextResponse.json(
    { success: true, data: { submission_id: row.id } },
    { status: 201 }
  )
}
