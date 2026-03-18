import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, BookOpen } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { CourseOutline } from '@/components/lms/course-outline'
import type { ModuleRow } from '@/components/lms/course-outline'
import type { Metadata } from 'next'

type PageProps = { params: Promise<{ courseId: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { courseId } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('courses')
    .select('title')
    .eq('id', courseId)
    .single()
  const row = data as { title: string } | null
  return { title: row ? `${row.title} — Jaxtina EduOS` : 'Course — Jaxtina EduOS' }
}

export default async function CourseOutlinePage({ params }: PageProps) {
  const { courseId } = await params
  const t        = await getTranslations()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) notFound()

  // Parallel fetch: course info, modules+lessons+progress, overall completion
  const [
    { data: courseRaw, error: courseError },
    { data: modulesRaw, error: modulesError },
    { data: progressRowRaw },
  ] = await Promise.all([
    supabase
      .from('courses')
      .select('id, title, title_vi, description, level, thumbnail_url')
      .eq('id', courseId)
      .single(),

    // Nested select: modules → lessons → learner_progress (RLS auto-filters to current user)
    supabase
      .from('modules')
      .select(`
        id, title, position,
        lessons:lessons!module_id(
          id, title, lesson_type, duration_mins, position, is_preview,
          learner_progress:learner_progress!lesson_id(completed, progress_pct)
        )
      `)
      .eq('course_id', courseId)
      .order('position', { ascending: true }),

    // Overall completion from the view
    supabase
      .from('v_learner_course_progress')
      .select('completion_pct, class_name, enrolment_status')
      .eq('learner_id', user.id)
      .eq('course_id', courseId)
      .eq('enrolment_status', 'active')
      .maybeSingle(),
  ])

  if (courseError || !courseRaw) notFound()
  if (modulesError) {
    return (
      <div
        role="alert"
        className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
      >
        Failed to load course content: {modulesError.message}
      </div>
    )
  }

  const course      = courseRaw      as { id: string; title: string; title_vi: string | null; description: string | null; level: string | null; thumbnail_url: string | null }
  const progressRow = progressRowRaw as { completion_pct: number; class_name: string | null } | null
  const modules = (modulesRaw ?? []) as ModuleRow[]
  const completionPct = progressRow?.completion_pct ?? 0
  const className = progressRow?.class_name

  const totalLessons = modules.reduce((n, m) => n + m.lessons.length, 0)
  const completedLessons = modules.reduce(
    (n, m) => n + m.lessons.filter(l => l.learner_progress[0]?.completed).length,
    0
  )

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-slate-500">
        <Link href="/learner/dashboard" className="hover:text-slate-800 transition-colors">
          {t('courses.breadcrumbDashboard')}
        </Link>
        <ChevronRight size={14} className="flex-shrink-0" />
        <Link href="/learner/courses" className="hover:text-slate-800 transition-colors">
          {t('courses.breadcrumbCourses')}
        </Link>
        <ChevronRight size={14} className="flex-shrink-0" />
        <span className="text-slate-800 font-medium truncate">{course.title}</span>
      </nav>

      {/* Course header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
            <BookOpen size={22} className="text-indigo-600" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">{course.title}</h1>
              {course.level && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                  {course.level}
                </span>
              )}
            </div>
            {className && (
              <p className="mt-0.5 text-sm text-slate-500">{className}</p>
            )}
            {course.description && (
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                {course.description}
              </p>
            )}
          </div>
        </div>

        {/* Progress summary */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">
              {t('outline.lessonsOf', { completed: completedLessons, total: totalLessons })}
            </span>
            <span className="text-xs font-semibold text-slate-700">{completionPct}%</span>
          </div>
          <div
            className="h-2.5 bg-slate-100 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={completionPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Course progress: ${completionPct}%`}
          >
            <div
              className="h-full bg-indigo-500 rounded-full transition-[width] duration-500"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Module accordion */}
      <section aria-label="Course content">
        <h2 className="text-base font-semibold text-slate-700 mb-3">{t('outline.courseContent')}</h2>
        <CourseOutline courseId={courseId} modules={modules} />
      </section>
    </div>
  )
}
