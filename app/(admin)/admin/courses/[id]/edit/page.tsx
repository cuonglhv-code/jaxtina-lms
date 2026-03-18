import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CourseForm } from '@/components/admin/courses/course-form'
import type { Course } from '@/lib/validations/course'

interface EditCoursePageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: EditCoursePageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('courses').select('title').eq('id', id).single()
  const row = data as { title: string } | null
  return { title: row ? `Edit "${row.title}" — Jaxtina Admin` : 'Edit Course — Jaxtina Admin' }
}

export default async function EditCoursePage({ params }: EditCoursePageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: course, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !course) {
    notFound()
  }

  const courseRow = course as Course

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
        <span className="text-slate-900 font-medium line-clamp-1">{courseRow.title}</span>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-slate-900">Edit course</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Changes are saved immediately. Toggle published when ready to go live.
        </p>
      </div>

      <CourseForm course={courseRow} />
    </div>
  )
}
