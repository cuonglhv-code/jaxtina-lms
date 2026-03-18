import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Clock, Hash } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { TeacherReviewForm } from '@/components/teacher/TeacherReviewForm'
import type { Metadata } from 'next'
import type { FeedbackRow } from '@/types'

export const metadata: Metadata = { title: 'Review Submission — Jaxtina EduOS' }

type RouteContext = { params: Promise<{ id: string }> }

// ── Types ─────────────────────────────────────────────────────────────────────

interface QueueDetail {
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
}

interface SubmissionContent {
  id:        string
  content:   string
  status:    string
  learner_id: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// Adds 1-based line numbers to essay content
function NumberedEssay({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <div className="font-mono text-sm leading-6 overflow-x-auto">
      <table className="w-full border-separate border-spacing-0">
        <tbody>
          {lines.map((line, i) => (
            <tr key={i}>
              <td
                className="select-none pr-4 text-right text-xs text-slate-300 w-8 align-top pt-px"
                aria-hidden
              >
                {i + 1}
              </td>
              <td className="text-slate-800 break-words whitespace-pre-wrap align-top">
                {line || '\u00A0'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function TeacherSubmissionDetailPage({ params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // ── Verify access via v_submission_queue ──────────────────────────────────
  const { data: queueRow, error: queueError } = await supabase
    .from('v_submission_queue')
    .select(
      'submission_id, learner_name, learner_email, assignment_title, ielts_task_type, class_name, course_title, status, word_count, submitted_at'
    )
    .eq('submission_id', id)
    .eq('teacher_id', user.id)
    .maybeSingle()

  if (queueError || !queueRow) notFound()

  const detail = queueRow as QueueDetail

  // ── Fetch submission content ───────────────────────────────────────────────
  const { data: submissionRaw } = await supabase
    .from('submissions')
    .select('id, content, status, learner_id')
    .eq('id', id)
    .single()

  if (!submissionRaw) notFound()

  const submission = submissionRaw as SubmissionContent

  // ── Fetch all feedback for this submission ─────────────────────────────────
  const { data: feedbackRaw } = await supabase
    .from('feedback')
    .select(
      'id, source, band_overall, band_ta, band_cc, band_lr, band_gra, strengths, improvements, detailed_notes, feedback_en, feedback_vi, model_used, created_at'
    )
    .eq('submission_id', id)
    .order('created_at', { ascending: false })

  const feedbackRows = (feedbackRaw ?? []) as FeedbackRow[]

  const teacherFeedback = feedbackRows.find(f => f.source === 'teacher') ?? null
  const aiFeedback      = feedbackRows.find(f => f.source === 'ai')      ?? null

  const isReviewed = detail.status === 'reviewed'
  const t = await getTranslations('teacherReview')

  return (
    <div className="space-y-6">

      {/* ── Breadcrumb ── */}
      <Link
        href="/teacher/submissions"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-600 transition-colors"
      >
        <ChevronLeft size={15} aria-hidden />
        {t('backToSubmissions')}
      </Link>

      {/* ── Submission meta ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-4 flex flex-wrap gap-x-8 gap-y-2 items-center">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">{t('learnerLabel')}</p>
          <p className="font-semibold text-slate-800">{detail.learner_name}</p>
          <p className="text-xs text-slate-400">{detail.learner_email}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">{t('assignmentLabel')}</p>
          <p className="font-semibold text-slate-800">{detail.assignment_title}</p>
        </div>
        {detail.ielts_task_type && (
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">{t('taskTypeLabel')}</p>
            <p className="font-semibold text-slate-800">
              {detail.ielts_task_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </p>
          </div>
        )}
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">{t('classLabel')}</p>
          <p className="text-slate-700">{detail.class_name}</p>
        </div>
        <div className="flex items-center gap-4 ml-auto">
          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <Clock size={14} aria-hidden />
            {fmtDateTime(detail.submitted_at)}
          </div>
          {detail.word_count != null && (
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <Hash size={14} aria-hidden />
              {detail.word_count} {t('wordsLabel')}
            </div>
          )}
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid gap-6 lg:grid-cols-2 items-start">

        {/* ── Left: essay (read-only, line numbered) ── */}
        <section aria-labelledby="essay-heading">
          <h2 id="essay-heading" className="text-base font-semibold text-slate-700 mb-2">
            {t('learnerEssay')}
          </h2>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 max-h-[70vh] overflow-y-auto">
            <NumberedEssay content={submission.content} />
          </div>
        </section>

        {/* ── Right: review form ── */}
        <section aria-labelledby="review-heading">
          <h2 id="review-heading" className="text-base font-semibold text-slate-700 mb-2">
            {isReviewed ? t('teacherReview') : t('submitReview')}
          </h2>
          <TeacherReviewForm
            submissionId={id}
            aiFeedback={aiFeedback}
            existingTeacherFeedback={teacherFeedback}
            isReviewed={isReviewed}
          />
        </section>
      </div>
    </div>
  )
}
