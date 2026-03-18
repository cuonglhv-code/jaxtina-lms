import { z } from 'zod'

export const ENROLMENT_STATUSES = ['active', 'paused', 'completed', 'withdrawn'] as const
export type EnrolmentStatus = typeof ENROLMENT_STATUSES[number]

export const STATUS_LABELS: Record<EnrolmentStatus, string> = {
  active:    'Active',
  paused:    'Paused',
  completed: 'Completed',
  withdrawn: 'Withdrawn',
}

export const STATUS_BADGE: Record<EnrolmentStatus, string> = {
  active:    'bg-green-100 text-green-700',
  paused:    'bg-amber-100  text-amber-700',
  completed: 'bg-blue-100   text-blue-700',
  withdrawn: 'bg-slate-100  text-slate-500',
}

// ── Schemas ──────────────────────────────────────────────────────────────────

export const enrolLearnerSchema = z.object({
  learner_id: z.string().uuid('Invalid learner ID'),
})

export const updateEnrolmentSchema = z.object({
  status: z.enum(ENROLMENT_STATUSES),
})

export type EnrolLearnerInput     = z.infer<typeof enrolLearnerSchema>
export type UpdateEnrolmentInput  = z.infer<typeof updateEnrolmentSchema>

// ── Domain type ──────────────────────────────────────────────────────────────

export interface Enrolment {
  id:          string
  class_id:    string
  learner_id:  string
  status:      EnrolmentStatus
  enrolled_at: string
  updated_at:  string
  learner: {
    id:        string
    full_name: string
    email:     string | null
  } | null
}
