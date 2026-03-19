import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Clock, ChevronRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/Badge'
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

type FilterStatus = 'all' | 'submitted' | 'under_review' | 'reviewed'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function bandColor(score: number | null): string {
  if (score == null) return 'text-gray-400'
  if (score < 5.5)   return 'text-brand-red font-medium'
  if (score <= 6.5)  return 'text-amber font-medium'
  return 'text-teal-text font-medium'
}

const STATUS_BADGE: Record<string, { variant: 'blue' | 'amber' | 'teal' | 'green' | 'gray'; label?: string }> = {
  submitted:    { variant: 'blue' },
  under_review: { variant: 'amber' },
  reviewed:     { variant: 'green' },
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

  const STATUS_META: Record<string, { label: string }> = {
    submitted:    { label: t('statusSubmitted')    },
    under_review: { label: t('statusUnderReview')  },
    reviewed:     { label: t('statusReviewed')     },
  }

  const TABS: { value: FilterStatus; label: string }[] = [
    { value: 'all',          label: t('tabAll')           },
    { value: 'submitted',    label: t('tabPendingAi')     },
    { value: 'under_review', label: t('tabReadyToReview') },
    { value: 'reviewed',     label: t('tabReviewed')      },
  ]

  const { data: { user } } = await supabase.auth.getUser()
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
    <div className="space-y-5">

      {/* ── Header ── */}
      <div>
        <h1 className="font-display text-2xl text-gray-900">{t('title')}</h1>
        <p className="mt-0.5 text-sm text-gray-400">{t('subtitle')}</p>
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
                'px-4 py-1.5 rounded-md text-[13px] font-medium transition-colors',
                isActive
                  ? 'bg-navy text-white'
                  : 'border border-gray-200 text-gray-500 hover:border-gray-300',
              ].join(' ')}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* ── Table / Empty ── */}
      {queueRows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
          <Clock size={32} className="mx-auto text-gray-300 mb-3" aria-hidden />
          <p className="text-sm font-medium text-gray-500">Nothing here yet</p>
          <p className="text-[13px] text-gray-400 mt-1">{t('noSubmissions')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    { label: t('learner'),    align: 'left'   },
                    { label: t('assignment'), align: 'left'   },
                    { label: t('task'),       align: 'left'   },
                    { label: t('class'),      align: 'left'   },
                    { label: t('submitted'),  align: 'left'   },
                    { label: t('words'),      align: 'right'  },
                    { label: t('statusCol'),  align: 'center' },
                    { label: t('aiBand'),     align: 'center' },
                    { label: '',              align: 'right'  },
                  ].map(({ label, align }, i) => (
                    <th
                      key={i}
                      scope="col"
                      className={[
                        'px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-gray-400 whitespace-nowrap',
                        align === 'right'  ? 'text-right'  : '',
                        align === 'center' ? 'text-center' : '',
                        align === 'left'   ? 'text-left'   : '',
                      ].join(' ')}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queueRows.map(row => {
                  const statusMeta  = STATUS_META[row.status]  ?? { label: row.status }
                  const badgeCfg    = STATUS_BADGE[row.status]  ?? { variant: 'gray' as const }
                  return (
                    <tr
                      key={row.submission_id}
                      className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900 text-sm">{row.learner_name}</p>
                        <p className="text-[11px] text-gray-400 truncate max-w-[160px]">{row.learner_email}</p>
                      </td>
                      <td className="px-5 py-4 max-w-[180px]">
                        <span className="text-[13px] text-gray-600 truncate block">{row.assignment_title}</span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-[13px] text-gray-500">
                        {row.ielts_task_type
                          ? row.ielts_task_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                          : '—'}
                      </td>
                      <td className="px-5 py-4 max-w-[140px]">
                        <span className="text-[13px] text-gray-500 truncate block">{row.class_name}</span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-[13px] text-gray-500">
                        {fmtDateTime(row.submitted_at)}
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums text-[13px] text-gray-500">
                        {row.word_count ?? '—'}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <Badge variant={badgeCfg.variant}>
                          {statusMeta.label}
                        </Badge>
                      </td>
                      <td className={`px-5 py-4 text-center tabular-nums text-sm ${bandColor(row.band_overall)}`}>
                        {row.band_overall != null && row.feedback_source === 'ai'
                          ? row.band_overall
                          : '—'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/teacher/submissions/${row.submission_id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-navy text-white text-[12px] font-medium hover:bg-navy-hover transition-colors whitespace-nowrap"
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
