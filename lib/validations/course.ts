import { z } from 'zod'

const optionalText = z.string().nullable().optional()

const thumbnailUrl = z
  .string()
  .url('Must be a valid URL')
  .nullable()
  .optional()
  .or(z.literal('').transform(() => null))

export const courseSchema = z.object({
  title:          z.string().min(1, 'Title is required').max(255),
  title_vi:       z.string().max(255).nullable().optional(),
  description:    optionalText,
  description_vi: optionalText,
  level:          z.string().max(100).nullable().optional(),
  is_published:   z.boolean().default(false),
  thumbnail_url:  thumbnailUrl,
})

export const courseUpdateSchema = courseSchema.partial()

export type CourseInput       = z.infer<typeof courseSchema>
export type CourseUpdateInput = z.infer<typeof courseUpdateSchema>

export interface Course {
  id:             string
  title:          string
  title_vi:       string | null
  description:    string | null
  description_vi: string | null
  level:          string | null
  is_published:   boolean
  thumbnail_url:  string | null
  created_by:     string | null
  created_at:     string
  updated_at:     string
}
