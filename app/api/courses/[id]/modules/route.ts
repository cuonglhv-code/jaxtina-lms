import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { moduleSchema } from '@/lib/validations/module'

type RouteContext = { params: Promise<{ id: string }> }

// ── GET /api/courses/[id]/modules ───────────────────────────────────────────
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .eq('course_id', id)
    .order('position', { ascending: true })

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, data })
}

// ── POST /api/courses/[id]/modules ──────────────────────────────────────────
export async function POST(request: NextRequest, { params }: RouteContext) {
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

  const parsed = moduleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { data, error } = await supabase
    .from('modules')
    .insert({ ...parsed.data, course_id: id } as never)
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, data }, { status: 201 })
}
