import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { courseSchema } from '@/lib/validations/course'

// ── GET /api/courses ────────────────────────────────────────────────────────
// Accepts ?published=true to filter to published courses only (used by class
// creation form to populate the course select).
export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url)
  const onlyPublished = searchParams.get('published') === 'true'

  let query = supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false })

  if (onlyPublished) {
    query = query.eq('is_published', true)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, data })
}

// ── POST /api/courses ───────────────────────────────────────────────────────
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

  const parsed = courseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { data, error } = await supabase
    .from('courses')
    .insert({ ...parsed.data, created_by: user.id } as never)
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
