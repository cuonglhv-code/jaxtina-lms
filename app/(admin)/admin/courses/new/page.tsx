import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { CourseForm } from '@/components/admin/courses/course-form'

export const metadata = { title: 'New Course — Jaxtina Admin' }

export default function NewCoursePage() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link
          href="/admin/courses"
          className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors"
        >
          <ChevronLeft size={14} aria-hidden="true" />
          Courses
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">New course</span>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-slate-900">Create a course</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Fill in the details below. You can save as draft and publish later.
        </p>
      </div>

      <CourseForm />
    </div>
  )
}
