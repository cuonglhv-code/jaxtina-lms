import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen, Clock, MessageSquare, ArrowRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { CourseProgressCard } from '@/components/lms/CourseProgressCard'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard — Jaxtina EduOS' }

// ── Types ─────────────────────────────────────────────────────────────────────

interface CourseProgress {
  enrolment_id: string
  class_id: string
  course_id: string
  course_title: string
  course_title_vi: string | null
  class_name: string
  thumbnail_url: string | null
  level: string | null
  completion_pct: number
  enrolment_status: string
  starts_on: string
  ends_on: string | null
}

interface RecentActivity {
  id: string
  last_viewed_at: string
  completed: boolean
  progress_pct: number
  lesson: {
    title: string
    module: {
      title: string
      course: {
        title: string
      } | null
    } | null
  } | null
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function LearnerDashboardPage() {
  const t        = await getTranslations('dashboard')
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileRaw } = await supabase
    .from('user_profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const profile = profileRaw as { full_name: string | null } | null
  const firstName = profile?.full_name?.split(' ').at(-1) ?? profile?.full_name ?? 'there'

  // ── Parallel data fetches ──────────────────────────────────────────────────

  const [
    { data: courseProgressRows },
    { data: recentRows },
    { count: pendingCount },
  ] = await Promise.all([
    // a) Active enrolments with course completion from the view
    supabase
      .from('v_learner_course_progress')
      .select('*')
      .eq('learner_id', user.id)
      .eq('enrolment_status', 'active')
      .order('starts_on', { ascending: true }),

    // b) Last 5 lesson interactions
    supabase
      .from('learner_progress')
      .select(`
        id, last_viewed_at, completed, progress_pct,
        lesson:lessons!lesson_id(
          title,
          module:modules!module_id(
            title,
            course:courses!course_id(title)
          )
        )
      `)
      .eq('learner_id', user.id)
      .order('last_viewed_at', { ascending: false })
      .limit(5),

    // c) Pending feedback count (submitted or AI-scored, awaiting teacher review)
    supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('learner_id', user.id)
      .in('status', ['submitted', 'ai_scored']),
  ])

  const courses  = (courseProgressRows ?? []) as CourseProgress[]
  const activity = (recentRows ?? []) as RecentActivity[]

  return (
    <div className="space-y-10">

      {/* ── Welcome heading ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t('welcomeBack', { name: firstName })}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t('subtitle')}
          </p>
        </div>

        {/* Pending feedback badge */}
        {(pendingCount ?? 0) > 0 && (
          <Link
            href="/learner/submissions"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors"
          >
            <MessageSquare size={15} aria-hidden />
            {t('pendingFeedback', { count: pendingCount ?? 0 })}
            <ArrowRight size={13} aria-hidden />
          </Link>
        )}
      </div>

      {/* ── My Courses ── */}
      <section aria-labelledby="courses-heading">
        <div className="flex items-center justify-between mb-4">
          <h2 id="courses-heading" className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <BookOpen size={18} className="text-indigo-500" aria-hidden />
            {t('myCourses')}
          </h2>
          <Link
            href="/learner/courses"
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            {t('viewAll')}
          </Link>
        </div>

        {courses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
            <BookOpen size={28} className="mx-auto text-slate-300 mb-2" aria-hidden />
            <p className="text-sm text-slate-500">{t('noEnrolments')}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map(row => (
              <CourseProgressCard
                key={row.enrolment_id}
                title={row.course_title}
                className={row.class_name}
                completionPct={row.completion_pct}
                continueHref={`/learner/courses/${row.course_id}`}
                thumbnailUrl={row.thumbnail_url}
                level={row.level}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Recent Activity ── */}
      {activity.length > 0 && (
        <section aria-labelledby="activity-heading">
          <h2 id="activity-heading" className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
            <Clock size={18} className="text-indigo-500" aria-hidden />
            {t('recentActivity')}
          </h2>

          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-sm">
            {activity.map(row => {
              const courseName = row.lesson?.module?.course?.title ?? '—'
              const moduleName = row.lesson?.module?.title ?? '—'
              const lessonName = row.lesson?.title ?? 'Untitled lesson'
              const relativeTime = formatRelativeTime(row.last_viewed_at, t)

              return (
                <div
                  key={row.id}
                  className="flex items-center gap-4 px-5 py-3.5"
                >
                  {/* Completion indicator */}
                  <span
                    aria-label={row.completed ? 'Completed' : `${row.progress_pct}% complete`}
                    className={[
                      'flex-shrink-0 w-2 h-2 rounded-full',
                      row.completed ? 'bg-green-500' : 'bg-indigo-300',
                    ].join(' ')}
                  />

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{lessonName}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {courseName} · {moduleName}
                    </p>
                  </div>

                  <span className="flex-shrink-0 text-xs text-slate-400 whitespace-nowrap">
                    {relativeTime}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type TDashboard = Awaited<ReturnType<typeof getTranslations<'dashboard'>>>

function formatRelativeTime(isoString: string, t: TDashboard): string {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const diffMins = Math.floor(diffMs / 60_000)

  if (diffMins < 1)   return t('justNow')
  if (diffMins < 60)  return t('minutesAgo', { count: diffMins })

  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24)   return t('hoursAgo', { count: diffHrs })

  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays < 7)   return t('daysAgo', { count: diffDays })

  return new Date(isoString).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short',
  })
}
