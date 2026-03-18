import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { LessonList } from '@/components/admin/lessons/lesson-list'
import type { Lesson } from '@/lib/validations/lesson'

interface LessonsPageProps {
  params: Promise<{ courseId: string; moduleId: string }>
}

export async function generateMetadata({ params }: LessonsPageProps) {
  const { courseId, moduleId } = await params
  const supabase = await createClient()
  const [{ data: courseRaw }, { data: moduleRaw }] = await Promise.all([
    supabase.from('courses').select('title').eq('id', courseId).single(),
    supabase.from('modules').select('title').eq('id', moduleId).single(),
  ])
  const course = courseRaw as { title: string } | null
  const mod    = moduleRaw as { title: string } | null
  const parts = [mod?.title, course?.title, 'Jaxtina Admin'].filter(Boolean)
  return { title: `Lessons — ${parts.join(' — ')}` }
}

export default async function LessonsPage({ params }: LessonsPageProps) {
  const { courseId, moduleId } = await params
  const supabase = await createClient()

  // Three parallel fetches — course title, module title, lessons list
  const [
    { data: courseRaw,  error: courseError  },
    { data: moduleRaw,  error: moduleError  },
    { data: lessons,    error: lessonsError },
  ] = await Promise.all([
    supabase.from('courses').select('id, title').eq('id', courseId).single(),
    supabase.from('modules').select('id, title, course_id').eq('id', moduleId).single(),
    supabase.from('lessons').select('*').eq('module_id', moduleId).order('position', { ascending: true }),
  ])

  // Guard: course or module not found
  if (courseError || !courseRaw || moduleError || !moduleRaw) {
    notFound()
  }

  const course = courseRaw as { id: string; title: string }
  const mod    = moduleRaw as { id: string; title: string; course_id: string }

  // Guard: module must belong to this course
  if (mod.course_id !== courseId) {
    notFound()
  }

  if (lessonsError) {
    return (
      <div role="alert" className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
        Failed to load lessons: {lessonsError.message}
      </div>
    )
  }

  const lessonList = (lessons ?? []) as Lesson[]

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
          <li>
            <Link
              href="/admin/courses"
              className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors"
            >
              <ChevronLeft size={14} aria-hidden="true" />
              Courses
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={`/admin/courses/${courseId}/edit`}
              className="hover:text-slate-700 transition-colors max-w-[160px] truncate inline-block"
            >
              {course.title}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={`/admin/courses/${courseId}/modules`}
              className="hover:text-slate-700 transition-colors"
            >
              Modules
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="max-w-[160px] truncate text-slate-700">
            {mod.title}
          </li>
          <li aria-hidden="true">/</li>
          <li className="font-medium text-slate-900">Lessons</li>
        </ol>
      </nav>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Lessons</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {lessonList.length} lesson{lessonList.length !== 1 ? 's' : ''} in &quot;{mod.title}&quot;
        </p>
      </div>

      {/* ── Interactive list (client) ───────────────────────────────────── */}
      <LessonList
        courseId={courseId}
        moduleId={moduleId}
        initialLessons={lessonList}
      />
    </div>
  )
}
