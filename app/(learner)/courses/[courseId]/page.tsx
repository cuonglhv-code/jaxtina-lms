import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, BookOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CourseOutline } from '@/components/lms/course-outline'
import { Badge }       from '@/components/ui/Badge'
import { Card }        from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
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
        className="rounded-lg bg-brand-red-light border border-brand-red/20 px-4 py-3 text-sm text-brand-red"
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
    <div className="space-y-5 max-w-3xl">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-gray-400">
        <Link href="/dashboard" className="hover:text-gray-700 transition-colors">
          Dashboard
        </Link>
        <ChevronRight size={13} className="flex-shrink-0" />
        <Link href="/courses" className="hover:text-gray-700 transition-colors">
          My Courses
        </Link>
        <ChevronRight size={13} className="flex-shrink-0" />
        <span className="text-gray-700 truncate">{course.title}</span>
      </nav>

      {/* Course header */}
      <Card padding="lg">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-teal-light flex items-center justify-center">
            <BookOpen size={20} className="text-teal" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-xl text-gray-900">{course.title}</h1>
              {course.level && (
                <Badge variant="teal">{course.level}</Badge>
              )}
            </div>
            {className && (
              <p className="mt-0.5 text-[12px] text-gray-400">{className}</p>
            )}
            {course.description && (
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                {course.description}
              </p>
            )}
          </div>
        </div>

        {/* Progress summary */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-gray-400">
              {completedLessons} of {totalLessons} lesson{totalLessons !== 1 ? 's' : ''} completed
            </span>
            <span className="text-[11px] font-medium text-gray-600">{Math.round(completionPct)}%</span>
          </div>
          <ProgressBar value={completionPct} size="sm" />
        </div>
      </Card>

      {/* Module accordion */}
      <section aria-label="Course content">
        <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400 mb-3.5">
          Course content
        </p>
        <CourseOutline courseId={courseId} modules={modules} />
      </section>
    </div>
  )
}
