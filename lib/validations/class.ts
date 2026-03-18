import { z } from 'zod'

// ── Schemas ──────────────────────────────────────────────────────────────────

export const classSchema = z.object({
  name:         z.string().min(1, 'Name is required').max(255),
  course_id:    z.string().uuid('Invalid course'),
  branch_id:    z.string().uuid('Invalid branch').nullable().optional(),
  teacher_id:   z.string().uuid('Invalid teacher').nullable().optional(),
  starts_on:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  ends_on:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').nullable().optional(),
  max_learners: z.number().int().min(1, 'Must be at least 1').nullable().optional(),
})

export const classUpdateSchema = classSchema.partial()

export type ClassInput       = z.infer<typeof classSchema>
export type ClassUpdateInput = z.infer<typeof classUpdateSchema>

// ── Domain type (with joined fields from API) ────────────────────────────────

export interface ClassRow {
  id:           string
  name:         string
  course_id:    string
  branch_id:    string | null
  teacher_id:   string | null
  starts_on:    string
  ends_on:      string | null
  max_learners: number | null
  is_active:    boolean
  created_at:   string
  updated_at:   string
  // Joined
  course:     { id: string; title: string } | null
  branch:     { id: string; name: string; city: string } | null
  teacher:    { id: string; full_name: string } | null
  enrolments: { count: number }[] | null
}

// ── Utility types for selects ────────────────────────────────────────────────

export interface SelectOption {
  id:   string
  label: string
}
