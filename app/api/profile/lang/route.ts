import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  preferred_lang: z.enum(['en', 'vi']),
})

// ── PATCH /api/profile/lang ────────────────────────────────────────────────────
// Updates preferred_lang for the authenticated user.

export async function PATCH(request: NextRequest) {
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

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid preferred_lang. Must be "en" or "vi".' },
      { status: 422 }
    )
  }

  const { error } = await supabase
    .from('user_profiles')
    .update({ preferred_lang: parsed.data.preferred_lang } as never)
    .eq('id', user.id)

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
