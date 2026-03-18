import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { moduleUpdateSchema } from '@/lib/validations/module'

type RouteContext = { params: Promise<{ id: string }> }

// ── PATCH /api/modules/[id] ─────────────────────────────────────────────────
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

  const parsed = moduleUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { data, error } = await supabase
    .from('modules')
    .update(parsed.data as never)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500
    return NextResponse.json(
      { success: false, error: status === 404 ? 'Module not found' : error.message },
      { status }
    )
  }

  return NextResponse.json({ success: true, data })
}

// ── DELETE /api/modules/[id] ────────────────────────────────────────────────
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
    .from('modules')
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
