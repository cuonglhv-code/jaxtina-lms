import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FileText, Clock, ChevronRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Submissions — Jaxtina EduOS' }

// ── Types ─────────────────────────────────────────────────────────────────────

interface QueueRow {
  submission_id:    string
  learner_name:     string
  learner_email:    string
  assignment_title: string
  ielts_task_type:  string | null
  class_name:       string
  course_title:     string
  status:           string
  word_count:       number | null
  submitted_at:     string
  band_overall:     number | null
  feedback_source:  string | null
}

type FilterStatus = 'all' | 'submitted' | 'ai_scored' | 'reviewed'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function bandColor(score: number | null): string {
  if (score == null) return 'text-slate-400'
  if (score < 5.5)   return 'text-red-600 font-bold'
  if (score <= 6.5)  return 'text-amber-600 font-bold'
  return 'text-green-600 font-bold'
}

// STATUS_META and TABS built from translations inside the page component
const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  submitted: { bg: 'bg-blue-50',  text: 'text-blue-700'  },
  ai_scored: { bg: 'bg-amber-50', text: 'text-amber-700' },
  reviewed:  { bg: 'bg-green-50', text: 'text-green-700' },
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function TeacherSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; class_id?: string }>
}) {
  const { status: statusParam, class_id: classIdParam } = await searchParams
  const t        = await getTranslations('teacherSubmissions')
  const supabase = await createClient()

  const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
    submitted: { label: t('statusSubmitted'),        ...STATUS_STYLE.submitted },
    ai_scored: { label: t('statusAiScored'),         ...STATUS_STYLE.ai_scored },
    reviewed:  { label: t('statusTeacherReviewed'),  ...STATUS_STYLE.reviewed  },
  }

  const TABS: { value: FilterStatus; label: string }[] = [
    { value: 'all',       label: t('tabAll')           },
    { value: 'submitted', label: t('tabPendingAi')     },
    { value: 'ai_scored', label: t('tabReadyToReview') },
    { value: 'reviewed',  label: t('tabReviewed')      },
  ]

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const activeStatus = (TABS.some(tab => tab.value === statusParam) ? statusParam : 'all') as FilterStatus

  // ── Fetch queue rows for this teacher ─────────────────────────────────────
  let query = supabase
    .from('v_submission_queue')
    .select(
      'submission_id, learner_name, learner_email, assignment_title, ielts_task_type, class_name, course_title, status, word_count, submitted_at, band_overall, feedback_source'
    )
    .eq('teacher_id', user.id)
    .order('submitted_at', { ascending: false })

  if (activeStatus !== 'all') {
    query = query.eq('status', activeStatus)
  }
  if (classIdParam) {
    query = query.eq('class_id', classIdParam)
  }

  const { data: rows } = await query
  const queueRows = (rows ?? []) as QueueRow[]

  // ── Fetch distinct classes for sidebar filter (optional future use) ────────
  const { data: classesRaw } = await supabase
    .from('v_submission_queue')
    .select('class_id, class_name')
    .eq('teacher_id', user.id)

  // Deduplicate classes
  const classesTyped = (classesRaw ?? []) as { class_id: string | null; class_name: string | null }[]
  const classMap = new Map<string, string>()
  for (const r of classesTyped) {
    if (r.class_id && r.class_name) classMap.set(r.class_id, r.class_name)
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileText size={22} className="text-teal-500" aria-hidden />
          {t('title')}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {t('subtitle')}
        </p>
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('filterByStatus')}>
        {TABS.map(tab => {
          const isActive = activeStatus === tab.value
          const href = tab.value === 'all'
            ? '/teacher/submissions'
            : `/teacher/submissions?status=${tab.value}`
          return (
            <Link
              key={tab.value}
              href={classIdParam ? href + `&class_id=${classIdParam}` : href}
              role="tab"
              aria-selected={isActive}
              className={[
                'px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                isActive
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50',
              ].join(' ')}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* ── Table / Empty ── */}
      {queueRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <Clock size={30} className="mx-auto text-slate-300 mb-2" aria-hidden />
          <p className="text-sm text-slate-500">{t('noSubmissions')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">{t('learner')}</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">{t('assignment')}</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">{t('task')}</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">{t('class')}</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">{t('submitted')}</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-right whitespace-nowrap">{t('words')}</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-center whitespace-nowrap">{t('statusCol')}</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-center whitespace-nowrap">{t('aiBand')}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {queueRows.map(row => {
                  const meta = STATUS_META[row.status] ?? { label: row.status, bg: 'bg-slate-50', text: 'text-slate-600' }
                  return (
                    <tr key={row.submission_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{row.learner_name}</p>
                        <p className="text-xs text-slate-400 truncate max-w-[160px]">{row.learner_email}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700 max-w-[180px]">
                        <span className="truncate block">{row.assignment_title}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                        {row.ielts_task_type
                          ? row.ielts_task_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-[140px]">
                        <span className="truncate block">{row.class_name}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                        {fmtDateTime(row.submitted_at)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                        {row.word_count ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${meta.bg} ${meta.text}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-center tabular-nums text-sm ${bandColor(row.band_overall)}`}>
                        {row.band_overall != null && row.feedback_source === 'ai'
                          ? row.band_overall
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/teacher/submissions/${row.submission_id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors whitespace-nowrap"
                        >
                          {row.status === 'reviewed' ? t('view') : t('review')}
                          <ChevronRight size={13} aria-hidden />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
