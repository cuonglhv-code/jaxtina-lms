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
      <div role="alert" className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
        Failed to load courses: {error.message}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Courses</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {courses.length} course{courses.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link
          href="/admin/courses/new"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} aria-hidden="true" />
          New course
        </Link>
      </div>

      {/* Table */}
      <CourseTable courses={courses as Course[]} />
    </div>
  )
}
