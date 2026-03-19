import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Users, FileText, ArrowRight, CalendarDays,
  MapPin, BookOpen, Clock, LayoutGrid,
} from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Teacher Dashboard — Jaxtina EduOS' }

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClassCard {
  id:           string
  name:         string
  starts_on:    string
  ends_on:      string | null
  max_learners: number | null
  course:       { title: string } | null
  branch:       { name: string; city: string } | null
  enrolments:   { count: number }[] | null
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

function sectionLabel(text: string) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400 mb-3.5 mt-6 first:mt-0">
      {text}
    </p>
  )
}

const STATUS_STYLE: Record<string, { dot: string; bg: string; text: string; border: string }> = {
  submitted:    { dot: 'bg-blue-500',  bg: 'bg-blue-50',  text: 'text-blue-700',  border: 'border-blue-200'  },
  under_review: { dot: 'bg-amber-500', bg: 'bg-amber-light', text: 'text-amber',  border: 'border-amber/20'  },
  reviewed:     { dot: 'bg-teal',      bg: 'bg-teal-light', text: 'text-teal-text', border: 'border-teal/20' },
}

const QUEUE_STATUSES = ['submitted', 'under_review', 'reviewed'] as const

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function TeacherDashboardPage() {
  const t    = await getTranslations('teacherDashboard')
  const tSub = await getTranslations('teacherSubmissions')
  const supabase = await createClient()

  const STATUS_META: Record<string, { label: string } & typeof STATUS_STYLE[string]> = {
    submitted:    { label: tSub('statusSubmitted'),       ...STATUS_STYLE.submitted },
    under_review: { label: tSub('statusAiScored'),        ...STATUS_STYLE.under_review },
    reviewed:     { label: tSub('statusTeacherReviewed'), ...STATUS_STYLE.reviewed  },
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileRaw } = await supabase
    .from('user_profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const profile   = profileRaw as { full_name: string | null } | null
  const firstName = profile?.full_name?.split(' ').at(-1) ?? 'there'

  // ── Parallel data fetches ──────────────────────────────────────────────────
  const [
    { data: classesRaw, error: classesError },
    { data: queueRaw },
  ] = await Promise.all([
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

    supabase
      .from('v_submission_queue')
      .select('status')
      .eq('teacher_id', user.id)
      .in('status', [...QUEUE_STATUSES]),
  ])

  const classes   = (classesRaw ?? []) as ClassCard[]
  const queueRows = (queueRaw   ?? []) as QueueRow[]

  const statusCounts = Object.fromEntries(
    QUEUE_STATUSES.map(s => [s, queueRows.filter(r => r.status === s).length])
  ) as Record<typeof QUEUE_STATUSES[number], number>

  const totalPending = statusCounts.submitted + statusCounts.under_review

  return (
    <div className="space-y-0 max-w-4xl">

      {/* ── Welcome ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl text-gray-900">
            {t('welcomeBack', { name: firstName })}
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            {t('activeClasses', { count: classes.length })} ·{' '}
            {t('awaitingReview', { count: totalPending })}
          </p>
        </div>

        {/* CTA: review AI-scored submissions */}
        {statusCounts.under_review > 0 && (
          <Link
            href="/teacher/submissions?status=under_review"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-amber text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <FileText size={15} aria-hidden />
            {t('reviewAiScored')}
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-xs font-medium">
              {statusCounts.under_review}
            </span>
            <ArrowRight size={14} aria-hidden />
          </Link>
        )}
      </div>

      {/* ── Submission queue counts ── */}
      {sectionLabel(t('submissionsToReview'))}

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        {QUEUE_STATUSES.map(status => {
          const meta  = STATUS_META[status]
          const count = statusCounts[status]

          return (
            <Link
              key={status}
              href={`/teacher/submissions?status=${status}`}
              className={[
                'flex items-center justify-between gap-3 px-5 py-4',
                'rounded-lg border transition-colors hover:opacity-90',
                count > 0
                  ? `${meta.bg} ${meta.border}`
                  : 'bg-white border-gray-200',
              ].join(' ')}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${meta.dot} ${count === 0 ? 'opacity-30' : ''}`}
                  aria-hidden
                />
                <span className={['text-[13px] font-medium', count > 0 ? meta.text : 'text-gray-400'].join(' ')}>
                  {meta.label}
                </span>
              </div>
              <span className={['font-display text-2xl tabular-nums', count > 0 ? meta.text : 'text-gray-300'].join(' ')}>
                {count}
              </span>
            </Link>
          )
        })}
      </div>

      {/* ── My Classes ── */}
      {sectionLabel(t('myClasses'))}

      <div className="flex items-center justify-between mb-3.5 -mt-3.5">
        <span />
        <Link
          href="/teacher/classes"
          className="text-[13px] text-teal hover:text-teal-text font-medium transition-colors"
        >
          {t('viewAll')}
        </Link>
      </div>

      {classesError ? (
        <div
          role="alert"
          className="rounded-lg bg-brand-red-light border border-brand-red/20 px-4 py-3 text-sm text-brand-red"
        >
          {t('failedClasses')}
        </div>
      ) : classes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
          <LayoutGrid size={32} className="mx-auto text-gray-300 mb-3" aria-hidden />
          <p className="text-sm font-medium text-gray-500">Nothing here yet</p>
          <p className="text-[13px] text-gray-400 mt-1">{t('noClasses')}</p>
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map(cls => {
            const enrolCount = cls.enrolments?.[0]?.count ?? 0
            const atCapacity = cls.max_learners != null && enrolCount >= cls.max_learners

            return (
              <Link
                key={cls.id}
                href={`/teacher/classes/${cls.id}`}
                className="group bg-white rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all p-5 space-y-3"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-display text-base text-gray-900 group-hover:text-navy transition-colors truncate">
                      {cls.name}
                    </h3>
                    {cls.course && (
                      <p className="mt-0.5 text-[11px] text-gray-400 flex items-center gap-1 truncate">
                        <BookOpen size={11} aria-hidden />
                        {cls.course.title}
                      </p>
                    )}
                  </div>
                  {atCapacity && (
                    <span className="flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-red-light text-brand-red">
                      Full
                    </span>
                  )}
                </div>

                {/* Meta rows */}
                <div className="space-y-1.5">
                  {cls.branch && (
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                      <MapPin size={11} className="flex-shrink-0" aria-hidden />
                      <span className="truncate">{cls.branch.name}, {cls.branch.city}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                    <CalendarDays size={11} className="flex-shrink-0" aria-hidden />
                    <span>
                      {fmtDate(cls.starts_on)}
                      {cls.ends_on && ` → ${fmtDate(cls.ends_on)}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                    <Users size={11} className="flex-shrink-0" aria-hidden />
                    <span>
                      {t('activeLearners', { count: enrolCount })}
                      {cls.max_learners && (
                        <span className="text-gray-300"> {t('maxLearners', { max: cls.max_learners })}</span>
                      )}
                    </span>
                  </div>

                  {(() => {
                    const today = new Date()
                    const start = new Date(cls.starts_on)
                    const end   = cls.ends_on ? new Date(cls.ends_on) : null
                    const isLive = today >= start && (!end || today <= end)
                    return isLive ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-teal font-medium">
                        <Clock size={11} className="flex-shrink-0" aria-hidden />
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
    </div>
  )
}
