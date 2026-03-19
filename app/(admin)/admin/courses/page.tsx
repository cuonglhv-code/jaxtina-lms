import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CourseTable } from '@/components/admin/courses/course-table'
import type { Course } from '@/lib/validations/course'

export const metadata = { title: 'Courses — Jaxtina Admin' }

export default async function AdminCoursesPage() {
  const supabase = await createClient()

  const { data: courses, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div role="alert" className="rounded-lg bg-brand-red-light border border-brand-red/20 px-4 py-3 text-sm text-brand-red">
        Failed to load courses: {error.message}
      </div>
    )
  }

  const typedCourses = courses as Course[]
  const published = typedCourses.filter(c => c.is_published).length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h1 className="font-display text-2xl text-gray-900">Courses</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {published} course{published !== 1 ? 's' : ''} published
          </p>
        </div>
        <Link
          href="/admin/courses/new"
          className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-hover transition-colors"
        >
          <Plus size={15} aria-hidden />
          New Course
        </Link>
      </div>

      {/* Table */}
      <CourseTable courses={typedCourses} />
    </div>
  )
}
