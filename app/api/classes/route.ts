import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { classSchema } from '@/lib/validations/class'

const CLASS_SELECT = `
  id, name, course_id, branch_id, teacher_id,
  starts_on, ends_on, max_learners, is_active, created_at, updated_at,
  course:courses!course_id(id, title),
  branch:branches!branch_id(id, name, city),
  teacher:user_profiles!teacher_id(id, full_name),
  enrolments(count)
` as const

// ── GET /api/classes ─────────────────────────────────────────────────────────
export async function GET() {
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
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, data })
}

// ── POST /api/classes ────────────────────────────────────────────────────────
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

  const parsed = classSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.flatten() },
      { status: 422 }
    )
  }

  // Validate teacher_id belongs to a user with role='teacher'
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
    .insert(parsed.data as never)
    .select(CLASS_SELECT)
    .single()

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, data }, { status: 201 })
}
