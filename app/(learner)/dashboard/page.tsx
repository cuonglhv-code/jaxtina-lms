import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { BookOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Badge }              from '@/components/ui/Badge'
import { Card }               from '@/components/ui/Card'
import { CourseProgressCard } from '@/components/lms/CourseProgressCard'

export const metadata: Metadata = { title: 'Dashboard — Jaxtina EduOS' }

// ── Types ─────────────────────────────────────────────────────────────────────

interface CourseProgress {
  enrolment_id:     string
  course_id:        string
  course_title:     string
  class_name:       string
  level:            string | null
  thumbnail_url:    string | null
  completion_pct:   number
  enrolment_status: string
  starts_on:        string
  ends_on:          string | null
}

interface ActivityRow {
  id:             string
  last_viewed_at: string
  completed:      boolean
  progress_pct:   number
  lesson: {
    title:       string
    lesson_type: string
  } | null
  module_title:  string | null
  course_title:  string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sectionLabel(text: string) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400 mb-3.5 mt-6 first:mt-0">
      {text}
    </p>
  )
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7)   return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const LESSON_TYPE_BG: Record<string, string> = {
  ielts_writing: 'bg-teal-light',
  video:         'bg-brand-blue-light',
  reading:       'bg-gray-100',
  exercise:      'bg-amber-light',
  live:          'bg-brand-green-light',
}

const LESSON_TYPE_LABEL: Record<string, string> = {
  ielts_writing: 'Writing',
  video:         'Video',
  reading:       'Reading',
  exercise:      'Exercise',
  live:          'Live',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function LearnerDashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: profileRaw },
    { data: courseProgressRows },
    { data: recentRows },
    { count: pendingCount },
    { data: feedbackRows },
    { count: completedCount },
  ] = await Promise.all([
    // a) Profile
    supabase
      .from('user_profiles')
      .select('full_name, preferred_lang')
      .eq('id', user.id)
      .single(),

    // b) Active enrolments with course progress
    supabase
      .from('v_learner_course_progress')
      .select('*')
      .eq('learner_id', user.id)
      .eq('enrolment_status', 'active')
      .order('starts_on', { ascending: true }),

    // c) Last 5 lesson interactions
    supabase
      .from('learner_progress')
      .select(`
        id, last_viewed_at, completed, progress_pct,
        lesson:lessons!lesson_id( title, lesson_type )
      `)
      .eq('learner_id', user.id)
      .order('last_viewed_at', { ascending: false })
      .limit(5),

    // d) Pending feedback count
    supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('learner_id', user.id)
      .in('status', ['submitted', 'under_review']), // ✅ Matches database schema

    // e) Latest band score from feedback
    supabase
      .from('feedback')
      .select('band_overall, submissions!submission_id(learner_id)')
      .eq('submissions.learner_id', user.id)
      .not('band_overall', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1),

    // f) Lessons completed count
    supabase
      .from('learner_progress')
      .select('id', { count: 'exact', head: true })
      .eq('learner_id', user.id)
      .eq('completed', true),
  ])

  const profile     = profileRaw  as { full_name: string | null; preferred_lang: string | null } | null
  const courses     = (courseProgressRows ?? []) as CourseProgress[]
  const activity    = (recentRows    ?? []) as ActivityRow[]
  const feedback    = (feedbackRows  ?? []) as { band_overall: number | null }[]

  const firstName   = profile?.full_name?.split(' ').at(0) ?? 'there'
  const avgCompletion = courses.length
    ? Math.round(courses.reduce((sum, c) => sum + c.completion_pct, 0) / courses.length)
    : 0
  const latestBand  = feedback[0]?.band_overall ?? null
  const lessonsCompleted = completedCount ?? 0
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="max-w-3xl">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-xl text-gray-900">
            {greeting}, {firstName}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {courses.length > 0
              ? `You have ${courses.length} active course${courses.length > 1 ? 's' : ''}`
              : 'No active courses yet'}
          </p>
        </div>
        {(pendingCount ?? 0) > 0 && (
          <Badge variant="amber">
            {pendingCount} feedback pending
          </Badge>
        )}
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
        <Card padding="md">
          <p className="font-display text-2xl text-gray-900">{avgCompletion}%</p>
          <p className="text-[11px] text-gray-400 mt-1">Overall progress</p>
        </Card>
        <Card padding="md">
          <p className="font-display text-2xl text-gray-900">
            {latestBand !== null ? latestBand.toFixed(1) : '—'}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">Latest band score</p>
        </Card>
        <Card padding="md">
          <p className="font-display text-2xl text-gray-900">{lessonsCompleted}</p>
          <p className="text-[11px] text-gray-400 mt-1">Lessons completed</p>
        </Card>
      </div>

      {/* ── My Courses ── */}
      {sectionLabel('My courses')}

      {courses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
          <BookOpen size={32} className="mx-auto text-gray-300 mb-3" aria-hidden />
          <p className="text-sm font-medium text-gray-500">Nothing here yet</p>
          <p className="text-[13px] text-gray-400 mt-1">No active courses. Ask your teacher to enrol you.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {courses.map(row => (
            <CourseProgressCard
              key={row.enrolment_id}
              title={row.course_title}
              className={row.class_name}
              completionPct={row.completion_pct}
              continueHref={`/courses/${row.course_id}`}
              level={row.level}
            />
          ))}
        </div>
      )}

      {/* ── Recent Activity ── */}
      {activity.length > 0 && (
        <>
          {sectionLabel('Recent activity')}
          <Card padding="sm" className="divide-y divide-gray-50 !p-0 overflow-hidden">
            {activity.map(row => {
              const lessonType = row.lesson?.lesson_type ?? 'video'
              const iconBg     = LESSON_TYPE_BG[lessonType]    ?? 'bg-gray-100'
              const typeLabel  = LESSON_TYPE_LABEL[lessonType] ?? lessonType
              const status     = row.completed ? 'completed' : 'in-progress'

              return (
                <div key={row.id} className="flex items-center gap-3 py-3 px-4">
                  {/* Type icon */}
                  <div
                    aria-hidden
                    className={['w-8 h-8 rounded-lg flex-shrink-0', iconBg].join(' ')}
                  />

                  {/* Text */}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-gray-800 truncate">
                      {row.lesson?.title ?? 'Untitled lesson'}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {typeLabel} · {timeAgo(row.last_viewed_at)}
                    </p>
                  </div>

                  {/* Status badge */}
                  <Badge variant={row.completed ? 'green' : 'gray'}>
                    {status}
                  </Badge>
                </div>
              )
            })}
          </Card>
        </>
      )}
    </div>
  )
}
