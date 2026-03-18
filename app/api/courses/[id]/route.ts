import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { courseUpdateSchema } from '@/lib/validations/course'

type RouteContext = { params: Promise<{ id: string }> }

// ── GET /api/courses/[id] ───────────────────────────────────────────────────
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
    .from('courses')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500
    return NextResponse.json(
      { success: false, error: status === 404 ? 'Course not found' : error.message },
      { status }
    )
  }

  return NextResponse.json({ success: true, data })
}

// ── PATCH /api/courses/[id] ─────────────────────────────────────────────────
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

  const parsed = courseUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { data, error } = await supabase
    .from('courses')
    .update(parsed.data as never)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500
    return NextResponse.json(
      { success: false, error: status === 404 ? 'Course not found' : error.message },
      { status }
    )
  }

  return NextResponse.json({ success: true, data })
}

// ── DELETE /api/courses/[id] ────────────────────────────────────────────────
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
    .from('courses')
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
