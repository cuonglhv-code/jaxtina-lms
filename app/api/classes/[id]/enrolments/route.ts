import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enrolLearnerSchema } from '@/lib/validations/enrolment'

type RouteContext = { params: Promise<{ id: string }> }

const ENROLMENT_SELECT = `
  id, class_id, learner_id, status, enrolled_at, updated_at,
  learner:user_profiles!learner_id(id, full_name, email)
` as const

// ── GET /api/classes/[id]/enrolments ─────────────────────────────────────────
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('enrolments')
    .select(ENROLMENT_SELECT)
    .eq('class_id', id)
    .order('enrolled_at', { ascending: false })

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, data })
}

// ── POST /api/classes/[id]/enrolments ────────────────────────────────────────
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id: classId } = await params
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

  const parsed = enrolLearnerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { learner_id } = parsed.data

  // Validate learner exists with role='learner'
  const { data: learnerRaw, error: learnerError } = await supabase
    .from('user_profiles')
    .select('id, role')
    .eq('id', learner_id)
    .single()

  const learner = learnerRaw as { id: string; role: string } | null

  if (learnerError || !learner) {
    return NextResponse.json(
      { success: false, error: 'Learner not found' },
      { status: 404 }
    )
  }

  if (learner.role !== 'learner') {
    return NextResponse.json(
      {
        success: false,
        error: { fieldErrors: { learner_id: ['Selected user is not a learner'] } },
      },
      { status: 422 }
    )
  }

  // Check for duplicate — UNIQUE (class_id, learner_id) on the table
  const { data: existing } = await supabase
    .from('enrolments')
    .select('id')
    .eq('class_id', classId)
    .eq('learner_id', learner_id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { success: false, error: 'Learner is already enrolled in this class' },
      { status: 409 }
    )
  }

  const { data, error } = await supabase
    .from('enrolments')
    .insert({ class_id: classId, learner_id } as never)
    .select(ENROLMENT_SELECT)
    .single()

  if (error) {
    // Postgres unique violation code
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Learner is already enrolled in this class' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, data }, { status: 201 })
}
