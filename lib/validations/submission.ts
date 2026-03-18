import { z } from 'zod'

// ── Submission input schema ───────────────────────────────────────────────────

export const SubmissionSchema = z.object({
  assignment_id: z.string().uuid('Invalid assignment ID'),
  content:       z.string().min(50, 'Essay must be at least 50 characters'),
  word_count:    z.number().int().positive('Word count must be a positive integer'),
})

export type SubmissionInput = z.infer<typeof SubmissionSchema>

// ── Feedback domain type (post-migration, includes bilingual fields) ──────────

export interface FeedbackRow {
  id:                string
  source:            string                // 'ai' | 'teacher'
  band_overall:      number | null
  band_ta:           number | null
  band_cc:           number | null
  band_lr:           number | null
  band_gra:          number | null
  strengths:         string | null
  improvements:      string | null
  detailed_notes:    string | null
  feedback_en:       string | null         // markdown (EN)
  feedback_vi:       string | null         // markdown (VI)
  model_used:        string | null
  created_at:        string
}
