import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { classUpdateSchema } from '@/lib/validations/class'

type RouteContext = { params: Promise<{ id: string }> }

const CLASS_SELECT = `
  id, name, course_id, branch_id, teacher_id,
  starts_on, ends_on, max_learners, is_active, created_at, updated_at,
  course:courses!course_id(id, title),
  branch:branches!branch_id(id, name, city),
  teacher:user_profiles!teacher_id(id, full_name),
  enrolments(count)
` as const

// ── GET /api/classes/[id] ────────────────────────────────────────────────────
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

  const { data, error } = await supabase
    .from('classes')
    .select(CLASS_SELECT)
    .eq('id', id)
    .single()

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500
    return NextResponse.json(
      { success: false, error: status === 404 ? 'Class not found' : error.message },
      { status }
    )
  }

  return NextResponse.json({ success: true, data })
}

// ── PATCH /api/classes/[id] ──────────────────────────────────────────────────
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

  const parsed = classUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.flatten() },
      { status: 422 }
    )
  }

  // Re-validate teacher_id if it's being updated
  if (parsed.data.teacher_id) {
    const { data: teacherRaw, error: teacherError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', parsed.data.teacher_id)
      .single()

    const teacher = teacherRaw as { role: string } | null

    if (teacherError || !teacher || teacher.role !== 'teacher') {
      return NextResponse.json(
        {
          success: false,
          error: { fieldErrors: { teacher_id: ['Selected user is not a teacher'] } },
        },
        { status: 422 }
      )
    }
  }

  const { data, error } = await supabase
    .from('classes')
    .update(parsed.data as never)
    .eq('id', id)
    .select(CLASS_SELECT)
    .single()

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500
    return NextResponse.json(
      { success: false, error: status === 404 ? 'Class not found' : error.message },
      { status }
    )
  }

  return NextResponse.json({ success: true, data })
}

// ── DELETE /api/classes/[id] — soft delete (is_active = false) ───────────────
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

  const { data, error } = await supabase
    .from('classes')
    .update({ is_active: false } as never)
    .eq('id', id)
    .select('id, is_active')
    .single()

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500
    return NextResponse.json(
      { success: false, error: status === 404 ? 'Class not found' : error.message },
      { status }
    )
  }

  return NextResponse.json({ success: true, data })
}
