import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { TeacherReviewForm } from '@/components/teacher/TeacherReviewForm'
import { FeedbackCard } from '@/components/lms/FeedbackCard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
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
  id:         string
  content:    string
  status:     string
  learner_id: string
  assignment: { image_url: string | null } | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function NumberedEssay({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <div className="font-mono text-[13px] leading-relaxed text-gray-700">
      {lines.map((line, i) => (
        <div key={i} className="flex gap-4">
          <span
            aria-hidden
            className="select-none w-7 text-right text-[11px] text-gray-300 flex-shrink-0 leading-relaxed"
          >
            {i + 1}
          </span>
          <span className="break-words whitespace-pre-wrap flex-1 min-w-0">
            {line || '\u00A0'}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function TeacherSubmissionDetailPage({ params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
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

  // ── Fetch submission content + assignment image ───────────────────────────
  const { data: submissionRaw } = await supabase
    .from('submissions')
    .select('id, content, status, learner_id, assignment:assignments!assignment_id(image_url)')
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

  const feedbackRows     = (feedbackRaw ?? []) as FeedbackRow[]
  const teacherFeedback  = feedbackRows.find(f => f.source === 'teacher') ?? null
  const aiFeedback       = feedbackRows.find(f => f.source === 'ai')      ?? null

  const isReviewed = detail.status === 'reviewed'
  const t          = await getTranslations('teacherReview')
  const imageUrl   = submission.assignment?.image_url ?? null

  return (
    <div className="space-y-5">

      {/* ── Breadcrumb ── */}
      <Link
        href="/teacher/submissions"
        className="inline-flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-navy transition-colors"
      >
        <ChevronLeft size={14} aria-hidden />
        {t('backToSubmissions')}
      </Link>

      {/* ── Two-column grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

        {/* ── LEFT col-span-3: essay ── */}
        <section className="lg:col-span-3" aria-labelledby="essay-heading">
          <Card padding="lg">

            {/* Header row */}
            <div className="flex items-start gap-4">
              <h1
                id="essay-heading"
                className="font-display text-lg text-gray-900 leading-snug"
              >
                {detail.learner_name}
              </h1>
              <p className="text-[12px] text-gray-400 ml-auto whitespace-nowrap pt-0.5 flex-shrink-0">
                {fmtDateTime(detail.submitted_at)}
              </p>
            </div>

            {/* Metadata row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 mb-5 text-[12px] text-gray-500">
              <span>{detail.course_title}</span>
              <span className="text-gray-200" aria-hidden>·</span>
              <span>{detail.assignment_title}</span>
              {detail.ielts_task_type && (
                <>
                  <span className="text-gray-200" aria-hidden>·</span>
                  <Badge variant="teal">
                    {detail.ielts_task_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </Badge>
                </>
              )}
              {detail.word_count != null && (
                <>
                  <span className="text-gray-200" aria-hidden>·</span>
                  <span>{detail.word_count} {t('wordsLabel')}</span>
                </>
              )}
            </div>

            <hr className="border-gray-100" />

            {/* Task 1 image */}
            {imageUrl && (
              <div className="relative w-full h-[260px] mt-4">
                <Image
                  src={imageUrl}
                  alt="IELTS Task 1 chart"
                  fill
                  className="object-contain rounded-lg border border-gray-100"
                />
              </div>
            )}

            {/* Essay (read-only, line-numbered) */}
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 mt-4 min-h-[320px] max-h-[68vh] overflow-y-auto">
              <NumberedEssay content={submission.content} />
            </div>

          </Card>
        </section>

        {/* ── RIGHT col-span-2: AI section + review form ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* AI assessment */}
          {aiFeedback && (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400 mb-3">
                AI assessment
              </p>
              <FeedbackCard feedback={aiFeedback} preferredLang="en" />
            </div>
          )}

          {/* Teacher review form */}
          <TeacherReviewForm
            submissionId={id}
            aiFeedback={aiFeedback}
            existingTeacherFeedback={teacherFeedback}
            isReviewed={isReviewed}
          />

        </div>
      </div>
    </div>
  )
}
