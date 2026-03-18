import { createClient } from '@/lib/supabase/server'
import { ClassList } from '@/components/admin/classes/class-list'
import type { ClassRow } from '@/lib/validations/class'

export const metadata = { title: 'Classes — Jaxtina Admin' }

const CLASS_SELECT = `
  id, name, course_id, branch_id, teacher_id,
  starts_on, ends_on, max_learners, is_active, created_at, updated_at,
  course:courses!course_id(id, title),
  branch:branches!branch_id(id, name, city),
  teacher:user_profiles!teacher_id(id, full_name),
  enrolments(count)
` as const

export default async function AdminClassesPage() {
  const supabase = await createClient()

  const { data: classes, error } = await supabase
    .from('classes')
    .select(CLASS_SELECT)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
      >
        Failed to load classes: {error.message}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ClassList initialClasses={(classes ?? []) as ClassRow[]} />
    </div>
  )
}
