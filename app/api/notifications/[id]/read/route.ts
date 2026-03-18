import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type RouteContext = { params: Promise<{ id: string }> }

// ── PATCH /api/notifications/[id]/read ────────────────────────────────────────
// Sets is_read=true for the notification. RLS enforces user_id = auth.uid(),
// so a user can only mark their own notifications as read.

export async function PATCH(_request: NextRequest, { params }: RouteContext) {
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
    .from('notifications')
    .update({ is_read: true } as never)
    .eq('id', id)
    .eq('user_id', user.id)   // belt-and-suspenders alongside RLS

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
