import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateEnrolmentSchema } from '@/lib/validations/enrolment'

type RouteContext = { params: Promise<{ id: string }> }

// ── PATCH /api/enrolments/[id] — update status only ──────────────────────────
export async function PATCH(request: NextRequest, { params }: RouteContext) {
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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  const parsed = updateEnrolmentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { data, error } = await supabase
    .from('enrolments')
    .update({ status: parsed.data.status } as never)
    .eq('id', id)
    .select(
      'id, class_id, learner_id, status, enrolled_at, updated_at, learner:user_profiles!learner_id(id, full_name, email)'
    )
    .single()

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500
    return NextResponse.json(
      { success: false, error: status === 404 ? 'Enrolment not found' : error.message },
      { status }
    )
  }

  return NextResponse.json({ success: true, data })
}

// ── DELETE /api/enrolments/[id] — admin only, hard delete ────────────────────
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
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

  const { error } = await supabase
    .from('enrolments')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, data: null })
}
