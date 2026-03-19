import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FileText, ChevronRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'My Submissions — Jaxtina EduOS' }

// ── Types ─────────────────────────────────────────────────────────────────────

interface FeedbackSummary {
  source:       string
  band_overall: number | null
}

interface SubmissionRow {
  id:           string
  status:       string
  word_count:   number | null
  submitted_at: string | null
  assignment: {
    id:        string
    title:     string
    task_type: string | null
    lesson: {
      id:              string
      ielts_task_type: string | null
      module: {
        course: {
          id:    string
          title: string
        } | null
      } | null
    } | null
  } | null
  feedback: FeedbackSummary[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, 'gray' | 'blue' | 'amber' | 'teal' | 'green'> = {
  draft:        'gray',
  submitted:    'blue',
  ai_scored:    'amber',
  under_review: 'teal',
  reviewed:     'green',
}

function formatIeltsTask(taskType: string | null, lessonTaskType: string | null): string {
  const raw = taskType ?? lessonTaskType ?? ''
  if (raw.includes('task2') || raw === 'task2') return 'Task 2'
  if (raw.includes('task1') || raw === 'task1') return 'Task 1'
  return '—'
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function bandColor(score: number | null): string {
  if (score == null) return 'text-gray-400'
  if (score < 5.5)   return 'text-brand-red font-medium'
  if (score <= 6.5)  return 'text-amber font-medium'
  return 'text-teal-text font-medium'
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SubmissionsPage() {
  const t        = await getTranslations('submissions')
  const supabase = await createClient()

  const STATUS_LABELS: Record<string, string> = {
    draft:        t('statusDraft'),
    submitted:    t('statusSubmitted'),
    ai_scored:    t('statusAiScored'),
    under_review: t('statusUnderReview'),
    reviewed:     t('statusReviewed'),
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await supabase
    .from('submissions')
    .select(`
      id, status, word_count, submitted_at,
      assignment:assignments!assignment_id(
        id, title, task_type,
        lesson:lessons!lesson_id(
          id, ielts_task_type,
          module:modules!module_id(
            course:courses!course_id(id, title)
          )
        )
      ),
      feedback:feedback!submission_id(
        source, band_overall
      )
    `)
    .eq('learner_id', user.id)
    .order('submitted_at', { ascending: false })

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-lg bg-brand-red-light border border-brand-red/20 px-4 py-3 text-sm text-brand-red"
      >
        {t('failedLoad', { message: error.message })}
      </div>
    )
  }

  const submissions = (data ?? []) as SubmissionRow[]

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl text-gray-900">{t('title')}</h1>
        <p className="mt-0.5 text-sm text-gray-400">{t('subtitle')}</p>
      </div>

      {submissions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
          <FileText size={32} className="mx-auto text-gray-300 mb-3" aria-hidden />
          <p className="text-sm font-medium text-gray-500">Nothing here yet</p>
          <p className="text-[13px] text-gray-400 mt-1">{t('noSubmissions')}</p>
          <Link
            href="/courses"
            className="mt-3 inline-block text-[13px] font-medium text-teal hover:text-teal-text transition-colors"
          >
            {t('browseCourses')}
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-4 px-5 py-3 border-b border-gray-100 bg-gray-50 text-[11px] font-medium text-gray-400 uppercase tracking-wider">
            <span>{t('assignment')}</span>
            <span>{t('task')}</span>
            <span>{t('words')}</span>
            <span>{t('submitted')}</span>
            <span>{t('status')}</span>
            <span>{t('band')}</span>
          </div>

          <ul className="divide-y divide-gray-50">
            {submissions.map(sub => {
              const assignment = sub.assignment
              const lesson     = assignment?.lesson
              const course     = lesson?.module?.course

              const lessonHref =
                course && lesson
                  ? `/courses/${course.id}/lessons/${lesson.id}`
                  : '/courses'

              const teacherFb = sub.feedback.find(f => f.source === 'teacher')
              const bestFb    = teacherFb ?? sub.feedback[0] ?? null

              const taskLabel = formatIeltsTask(
                assignment?.task_type ?? null,
                lesson?.ielts_task_type ?? null
              )

              const badgeVariant = STATUS_BADGE[sub.status] ?? 'gray'

              return (
                <li key={sub.id}>
                  <Link
                    href={lessonHref}
                    className="grid sm:grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-4 gap-y-1 items-center px-5 py-4 hover:bg-gray-50 transition-colors group"
                  >
                    {/* Assignment + course */}
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-gray-800 group-hover:text-navy transition-colors truncate">
                        {assignment?.title ?? 'Untitled'}
                      </p>
                      {course && (
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">{course.title}</p>
                      )}
                    </div>

                    {/* IELTS task */}
                    <span className="text-[12px] text-gray-500 whitespace-nowrap sm:text-right">
                      {taskLabel}
                    </span>

                    {/* Word count */}
                    <span className="text-[12px] text-gray-400 whitespace-nowrap tabular-nums sm:text-right">
                      {sub.word_count != null ? `${sub.word_count}w` : '—'}
                    </span>

                    {/* Submitted date */}
                    <span className="text-[12px] text-gray-400 whitespace-nowrap sm:text-right">
                      {formatDate(sub.submitted_at)}
                    </span>

                    {/* Status badge */}
                    <Badge variant={badgeVariant}>
                      {STATUS_LABELS[sub.status] ?? sub.status}
                    </Badge>

                    {/* Overall band */}
                    <span
                      className={[
                        'text-[13px] tabular-nums whitespace-nowrap sm:text-right',
                        bandColor(bestFb?.band_overall ?? null),
                      ].join(' ')}
                    >
                      {bestFb?.band_overall != null ? bestFb.band_overall : '—'}
                      <ChevronRight
                        size={13}
                        className="inline-block ml-1 text-gray-300 group-hover:text-navy transition-colors"
                        aria-hidden
                      />
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
