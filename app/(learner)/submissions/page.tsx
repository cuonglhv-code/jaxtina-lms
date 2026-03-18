import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FileText, ChevronRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
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

const STATUS_STYLES: Record<string, string> = {
  draft:        'bg-slate-100 text-slate-500',
  submitted:    'bg-blue-100 text-blue-700',
  ai_scored:    'bg-amber-100 text-amber-700',
  under_review: 'bg-purple-100 text-purple-700',
  reviewed:     'bg-green-100 text-green-700',
}

// STATUS_LABELS built from translations inside the page component

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
  if (score == null) return 'text-slate-400'
  if (score < 5.5)   return 'text-red-600'
  if (score <= 6.5)  return 'text-amber-600'
  return 'text-green-600'
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

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
        className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
      >
        {t('failedLoad', { message: error.message })}
      </div>
    )
  }

  const submissions = (data ?? []) as SubmissionRow[]

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {t('subtitle')}
        </p>
      </div>

      {submissions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <FileText size={28} className="mx-auto text-slate-300 mb-2" aria-hidden />
          <p className="text-sm text-slate-500">{t('noSubmissions')}</p>
          <Link
            href="/learner/courses"
            className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline"
          >
            {t('browseCourses')}
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-4 px-5 py-3 border-b border-slate-100 bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wide">
            <span>{t('assignment')}</span>
            <span>{t('task')}</span>
            <span>{t('words')}</span>
            <span>{t('submitted')}</span>
            <span>{t('status')}</span>
            <span>{t('band')}</span>
          </div>

          <ul className="divide-y divide-slate-100">
            {submissions.map(sub => {
              const assignment = sub.assignment
              const lesson     = assignment?.lesson
              const course     = lesson?.module?.course

              // Reconstruct lesson URL: /learner/courses/{courseId}/lessons/{lessonId}
              const lessonHref =
                course && lesson
                  ? `/learner/courses/${course.id}/lessons/${lesson.id}`
                  : '/learner/courses'

              // Most recent feedback (teacher first if multiple)
              const teacherFb = sub.feedback.find(f => f.source === 'teacher')
              const bestFb    = teacherFb ?? sub.feedback[0] ?? null

              const taskLabel = formatIeltsTask(
                assignment?.task_type ?? null,
                lesson?.ielts_task_type ?? null
              )

              return (
                <li key={sub.id}>
                  <Link
                    href={lessonHref}
                    className="grid sm:grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-4 gap-y-1 items-center px-5 py-4 hover:bg-indigo-50 transition-colors group"
                  >
                    {/* Assignment + course */}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 group-hover:text-indigo-700 transition-colors truncate">
                        {assignment?.title ?? 'Untitled'}
                      </p>
                      {course && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">{course.title}</p>
                      )}
                    </div>

                    {/* IELTS task */}
                    <span className="text-xs font-medium text-slate-500 whitespace-nowrap sm:text-right">
                      {taskLabel}
                    </span>

                    {/* Word count */}
                    <span className="text-xs text-slate-400 whitespace-nowrap sm:text-right">
                      {sub.word_count != null ? `${sub.word_count}w` : '—'}
                    </span>

                    {/* Submitted date */}
                    <span className="text-xs text-slate-400 whitespace-nowrap sm:text-right">
                      {formatDate(sub.submitted_at)}
                    </span>

                    {/* Status badge */}
                    <span
                      className={[
                        'inline-block text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap',
                        STATUS_STYLES[sub.status] ?? 'bg-slate-100 text-slate-500',
                      ].join(' ')}
                    >
                      {STATUS_LABELS[sub.status] ?? sub.status}
                    </span>

                    {/* Overall band */}
                    <span
                      className={[
                        'text-sm font-bold tabular-nums whitespace-nowrap sm:text-right',
                        bandColor(bestFb?.band_overall ?? null),
                      ].join(' ')}
                    >
                      {bestFb?.band_overall != null ? bestFb.band_overall : '—'}
                      <ChevronRight
                        size={14}
                        className="inline-block ml-1 text-slate-300 group-hover:text-indigo-400 transition-colors"
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
