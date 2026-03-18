import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const progressSchema = z.object({
  lesson_id:    z.string().uuid('Invalid lesson ID'),
  completed:    z.boolean(),
  progress_pct: z.number().int().min(0).max(100),
})

// ── POST /api/progress ────────────────────────────────────────────────────────
// Upserts learner_progress for the authenticated user.
// Preserves original completed_at if the lesson was already completed.
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

  const parsed = progressSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { lesson_id, completed, progress_pct } = parsed.data
  const now = new Date().toISOString()

  // Fetch existing record to preserve completed_at if already set
  const { data: existingRaw } = await supabase
    .from('learner_progress')
    .select('id, completed_at')
    .eq('learner_id', user.id)
    .eq('lesson_id', lesson_id)
    .maybeSingle()

  const existing = existingRaw as { id: string; completed_at: string | null } | null

  // Keep original completed_at if lesson was already marked done; don't clobber it.
  const completed_at = completed ? (existing?.completed_at ?? now) : null

  const { data, error } = await supabase
    .from('learner_progress')
    .upsert(
      {
        learner_id:    user.id,
        lesson_id,
        completed,
        completed_at,
        last_viewed_at: now,
        progress_pct,
      } as never,
      { onConflict: 'learner_id,lesson_id' }
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, data })
}
