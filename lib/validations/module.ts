import { z } from 'zod'

export const moduleSchema = z.object({
  title:    z.string().min(1, 'Title is required').max(255),
  title_vi: z.string().max(255).nullable().optional(),
  position: z.number().int().min(0).default(0),
})

export const moduleUpdateSchema = moduleSchema.partial()

export type ModuleInput       = z.infer<typeof moduleSchema>
export type ModuleUpdateInput = z.infer<typeof moduleUpdateSchema>

export interface Module {
  id:         string
  course_id:  string
  title:      string
  title_vi:   string | null
  position:   number
  created_at: string
  updated_at: string
}
