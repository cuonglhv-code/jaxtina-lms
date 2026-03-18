import { z } from 'zod'

// ── Constants (reused in UI and submissions — Phase 5) ───────────────────────

export const LESSON_TYPES = ['video', 'reading', 'exercise', 'live', 'ielts_writing'] as const
export type LessonType = typeof LESSON_TYPES[number]

export const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  video:         'Video',
  reading:       'Reading',
  exercise:      'Exercise',
  live:          'Live Session',
  ielts_writing: 'IELTS Writing',
}

export const IELTS_TASKS = ['task1', 'task2'] as const
export type IeltsTask = typeof IELTS_TASKS[number]

export const IELTS_TASK_LABELS: Record<IeltsTask, string> = {
  task1: 'Task 1 (Graph / Chart / Diagram)',
  task2: 'Task 2 (Essay)',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const optionalUrl = z
  .string()
  .url('Must be a valid URL')
  .nullable()
  .optional()
  .or(z.literal('').transform(() => null))

// ── Schemas ──────────────────────────────────────────────────────────────────

export const lessonSchema = z.object({
  title:           z.string().min(1, 'Title is required').max(255),
  title_vi:        z.string().max(255).nullable().optional(),
  lesson_type:     z.enum(LESSON_TYPES).default('video'),
  content_url:     optionalUrl,
  content_body:    z.string().nullable().optional(),
  duration_mins:   z.number().int().min(1, 'Must be at least 1 minute').nullable().optional(),
  position:        z.number().int().min(0).default(0),
  is_preview:      z.boolean().default(false),
  ielts_task_type: z.enum(IELTS_TASKS).nullable().optional(),
})

export const lessonUpdateSchema = lessonSchema.partial()

export type LessonInput       = z.infer<typeof lessonSchema>
export type LessonUpdateInput = z.infer<typeof lessonUpdateSchema>

// ── Domain type (mirrors DB row post-migration) ───────────────────────────────

export interface Lesson {
  id:              string
  module_id:       string
  title:           string
  title_vi:        string | null
  lesson_type:     LessonType
  content_url:     string | null
  content_body:    string | null
  duration_mins:   number | null
  position:        number
  is_published:    boolean
  is_preview:      boolean
  ielts_task_type: IeltsTask | null
  created_at:      string
  updated_at:      string
}
