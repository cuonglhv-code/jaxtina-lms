import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Users, FileText, ArrowRight, CalendarDays,
  MapPin, BookOpen, Clock,
} from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Teacher Dashboard — Jaxtina EduOS' }

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClassCard {
  id:          string
  name:        string
  starts_on:   string
  ends_on:     string | null
  max_learners: number | null
  course:      { title: string } | null
  branch:      { name: string; city: string } | null
  enrolments:  { count: number }[] | null
}

interface QueueRow {
  status: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// STATUS_META built from translations inside the page component
const STATUS_STYLE: Record<string, { dot: string; ring: string; bg: string; text: string }> = {
  submitted: { dot: 'bg-blue-500',  ring: 'ring-blue-200',  bg: 'bg-blue-50',  text: 'text-blue-700'  },
  ai_scored: { dot: 'bg-amber-500', ring: 'ring-amber-200', bg: 'bg-amber-50', text: 'text-amber-700' },
  reviewed:  { dot: 'bg-green-500', ring: 'ring-green-200', bg: 'bg-green-50', text: 'text-green-700' },
}

const QUEUE_STATUSES = ['submitted', 'ai_scored', 'reviewed'] as const

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function TeacherDashboardPage() {
  const t   = await getTranslations('teacherDashboard')
  const tSub = await getTranslations('teacherSubmissions')
  const supabase = await createClient()

  const STATUS_META: Record<string, { label: string; dot: string; ring: string; bg: string; text: string }> = {
    submitted: { label: tSub('statusSubmitted'),        ...STATUS_STYLE.submitted },
    ai_scored: { label: tSub('statusAiScored'),         ...STATUS_STYLE.ai_scored },
    reviewed:  { label: tSub('statusTeacherReviewed'),  ...STATUS_STYLE.reviewed  },
  }

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
  const firstName = profile?.full_name?.split(' ').at(-1) ?? 'there'

  // ── Parallel data fetches ──────────────────────────────────────────────────
  const [
    { data: classesRaw, error: classesError },
    { data: queueRaw },
  ] = await Promise.all([
    // a) Active classes where teacher_id = this user
    supabase
      .from('classes')
      .select(`
        id, name, starts_on, ends_on, max_learners,
        course:courses!course_id(title),
        branch:branches!branch_id(name, city),
        enrolments(count)
      `)
      .eq('teacher_id', user.id)
      .eq('is_active', true)
      .order('starts_on', { ascending: false }),

    // b) Submission queue rows for this teacher (status only — grouped client-side)
    supabase
      .from('v_submission_queue')
      .select('status')
      .eq('teacher_id', user.id)
      .in('status', [...QUEUE_STATUSES]),
  ])

  const classes = (classesRaw ?? []) as ClassCard[]

  // Group submission counts by status
  const queueRows = (queueRaw ?? []) as QueueRow[]
  const statusCounts = Object.fromEntries(
    QUEUE_STATUSES.map(s => [s, queueRows.filter(r => r.status === s).length])
  ) as Record<typeof QUEUE_STATUSES[number], number>

  const totalPending = statusCounts.submitted + statusCounts.ai_scored

  return (
    <div className="space-y-10">

      {/* ── Welcome ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t('welcomeBack', { name: firstName })}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t('activeClasses', { count: classes.length })} ·{' '}
            {t('awaitingReview', { count: totalPending })}
          </p>
        </div>

        {/* CTA: review AI-scored submissions */}
        {statusCounts.ai_scored > 0 && (
          <Link
            href="/teacher/submissions?status=ai_scored"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors shadow-sm"
          >
            <FileText size={15} aria-hidden />
            {t('reviewAiScored')}
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-xs font-bold">
              {statusCounts.ai_scored}
            </span>
            <ArrowRight size={14} aria-hidden />
          </Link>
        )}
      </div>

      {/* ── Submission queue counts ── */}
      <section aria-labelledby="queue-heading">
        <h2
          id="queue-heading"
          className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4"
        >
          <FileText size={18} className="text-teal-500" aria-hidden />
          {t('submissionsToReview')}
        </h2>

        <div className="grid gap-4 sm:grid-cols-3">
          {QUEUE_STATUSES.map(status => {
            const meta  = STATUS_META[status]
            const count = statusCounts[status]

            return (
              <Link
                key={status}
                href={`/teacher/submissions?status=${status}`}
                className={[
                  'group flex items-center justify-between gap-3 px-5 py-4',
                  'rounded-2xl border-2 transition-all hover:shadow-md',
                  `ring-0 hover:ring-4 ${meta.ring}`,
                  count > 0
                    ? `${meta.bg} border-transparent`
                    : 'bg-white border-slate-200',
                ].join(' ')}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${meta.dot} ${count === 0 ? 'opacity-30' : ''}`}
                    aria-hidden
                  />
                  <span
                    className={[
                      'text-sm font-medium',
                      count > 0 ? meta.text : 'text-slate-400',
                    ].join(' ')}
                  >
                    {meta.label}
                  </span>
                </div>
                <span
                  className={[
                    'text-2xl font-extrabold tabular-nums',
                    count > 0 ? meta.text : 'text-slate-300',
                  ].join(' ')}
                >
                  {count}
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ── My Classes ── */}
      <section aria-labelledby="classes-heading">
        <div className="flex items-center justify-between mb-4">
          <h2
            id="classes-heading"
            className="text-lg font-semibold text-slate-800 flex items-center gap-2"
          >
            <Users size={18} className="text-teal-500" aria-hidden />
            {t('myClasses')}
          </h2>
          <Link
            href="/teacher/classes"
            className="text-sm text-teal-600 hover:text-teal-800 font-medium transition-colors"
          >
            {t('viewAll')}
          </Link>
        </div>

        {classesError ? (
          <div
            role="alert"
            className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
          >
            {t('failedClasses')}
          </div>
        ) : classes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
            <Users size={28} className="mx-auto text-slate-300 mb-2" aria-hidden />
            <p className="text-sm text-slate-500">{t('noClasses')}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map(cls => {
              const enrolCount  = cls.enrolments?.[0]?.count ?? 0
              const atCapacity  = cls.max_learners != null && enrolCount >= cls.max_learners

              return (
                <Link
                  key={cls.id}
                  href={`/teacher/classes/${cls.id}`}
                  className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 space-y-4"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-slate-800 group-hover:text-teal-700 transition-colors truncate">
                        {cls.name}
                      </h3>
                      {cls.course && (
                        <p className="mt-0.5 text-xs text-slate-500 flex items-center gap-1 truncate">
                          <BookOpen size={11} aria-hidden />
                          {cls.course.title}
                        </p>
                      )}
                    </div>
                    {atCapacity && (
                      <span className="flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-600">
                        Full
                      </span>
                    )}
                  </div>

                  {/* Meta rows */}
                  <div className="space-y-1.5">
                    {/* Branch */}
                    {cls.branch && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin size={12} className="flex-shrink-0" aria-hidden />
                        <span className="truncate">
                          {cls.branch.name}, {cls.branch.city}
                        </span>
                      </div>
                    )}

                    {/* Date range */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <CalendarDays size={12} className="flex-shrink-0" aria-hidden />
                      <span>
                        {fmtDate(cls.starts_on)}
                        {cls.ends_on && ` → ${fmtDate(cls.ends_on)}`}
                      </span>
                    </div>

                    {/* Learner count */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Users size={12} className="flex-shrink-0" aria-hidden />
                      <span>
                        {t('activeLearners', { count: enrolCount })}
                        {cls.max_learners && (
                          <span className="text-slate-400"> {t('maxLearners', { max: cls.max_learners })}</span>
                        )}
                      </span>
                    </div>

                    {/* "Today" indicator for active classes */}
                    {(() => {
                      const today    = new Date()
                      const start    = new Date(cls.starts_on)
                      const end      = cls.ends_on ? new Date(cls.ends_on) : null
                      const isLive   = today >= start && (!end || today <= end)
                      return isLive ? (
                        <div className="flex items-center gap-1.5 text-xs text-teal-600 font-medium">
                          <Clock size={12} className="flex-shrink-0" aria-hidden />
                          {t('inProgress')}
                        </div>
                      ) : null
                    })()}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
