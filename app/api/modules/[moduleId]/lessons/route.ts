import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { lessonSchema } from '@/lib/validations/lesson'

type RouteContext = { params: Promise<{ moduleId: string }> }

// ── GET /api/modules/[moduleId]/lessons ─────────────────────────────────────
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { moduleId } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('module_id', moduleId)
    .order('position', { ascending: true })

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, data })
}

// ── POST /api/modules/[moduleId]/lessons ────────────────────────────────────
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { moduleId } = await params
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

  const parsed = lessonSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { data, error } = await supabase
    .from('lessons')
    .insert({ ...parsed.data, module_id: moduleId } as never)
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
