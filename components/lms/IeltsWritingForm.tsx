'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { marked } from 'marked'
import { Loader2, Send, CheckCircle, AlertCircle, Globe } from 'lucide-react'
import type { FeedbackRow } from '@/lib/validations/submission'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Assignment {
  id:               string
  title:            string
  instructions:     string | null
  instructions_vi:  string | null
  ielts_task:       'task1' | 'task2'
  image_url:        string | null
  word_limit:       number | null
}

interface ExistingSubmission {
  id:       string
  status:   string
  feedback?: FeedbackRow | null
}

interface IeltsWritingFormProps {
  assignment:          Assignment
  preferredLang:       'en' | 'vi'
  existingSubmission?: ExistingSubmission | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'submitting' | 'awaiting_feedback' | 'feedback_ready'

const POLL_INTERVAL_MS = 4000
const MAX_POLL_ATTEMPTS = 20

function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length
}

const MIN_WORDS = 150

// ── FeedbackCard ──────────────────────────────────────────────────────────────

function FeedbackCard({
  feedback,
  lang,
  onToggleLang,
}: {
  feedback: FeedbackRow
  lang: 'en' | 'vi'
  onToggleLang: () => void
}) {
  const markdownSource = lang === 'vi' ? (feedback.feedback_vi ?? feedback.feedback_en) : feedback.feedback_en
  const html = markdownSource ? (marked.parse(markdownSource) as string) : null

  const bandItems = [
    { label: 'TA', value: feedback.band_ta },
    { label: 'CC', value: feedback.band_cc },
    { label: 'LR', value: feedback.band_lr },
    { label: 'GRA', value: feedback.band_gra },
  ]

  return (
    <div className="space-y-5">
      {/* Overall band + criteria */}
      <div className="bg-navy rounded-xl p-5 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-medium text-white/60 uppercase tracking-widest">
              {lang === 'vi' ? 'Điểm tổng' : 'Overall Band'}
            </p>
            <p className="font-display text-4xl leading-none mt-1">
              {feedback.band_overall ?? '—'}
            </p>
          </div>
          <button
            onClick={onToggleLang}
            aria-label="Toggle language"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors"
          >
            <Globe size={13} aria-hidden />
            {lang === 'en' ? 'VI' : 'EN'}
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {bandItems.map(({ label, value }) => (
            <div key={label} className="rounded-lg bg-white/10 px-2 py-2 text-center">
              <p className="text-[10px] text-white/60">{label}</p>
              <p className="text-lg font-bold">{value ?? '—'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Markdown feedback */}
      {html ? (
        <article
          className="prose prose-slate max-w-none text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <p className="text-sm text-gray-400 italic">
          {lang === 'vi' ? 'Không có phản hồi chi tiết.' : 'No detailed feedback available.'}
        </p>
      )}

      {/* Source + model */}
      <p className="text-[11px] text-gray-400">
        {feedback.source === 'ai'
          ? lang === 'vi' ? `Chấm tự động · ${feedback.model_used ?? 'AI'}` : `AI scored · ${feedback.model_used ?? ''}`
          : lang === 'vi' ? 'Nhận xét bởi giáo viên' : 'Scored by teacher'}
      </p>
    </div>
  )
}

// ── IeltsWritingForm ──────────────────────────────────────────────────────────

export function IeltsWritingForm({
  assignment,
  preferredLang,
  existingSubmission,
}: IeltsWritingFormProps) {
  const [lang, setLang]     = useState<'en' | 'vi'>(preferredLang)
  const [essay, setEssay]   = useState('')
  const [phase, setPhase]   = useState<Phase>('idle')
  const [timedOut, setTimedOut] = useState(false)
  const [submissionId, setSubmissionId] = useState<string | null>(
    existingSubmission?.id ?? null
  )
  const [feedback, setFeedback] = useState<FeedbackRow | null>(
    existingSubmission?.feedback ?? null
  )

  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const attempts = useRef(0)

  const wordCount  = countWords(essay)
  const wordLimit  = assignment.word_limit
  const minWords   = wordLimit ? Math.min(MIN_WORDS, wordLimit) : MIN_WORDS
  const overLimit  = wordLimit != null && wordCount > wordLimit
  const nearLimit  = wordLimit != null && !overLimit && wordCount >= wordLimit - 20
  const underMin   = wordCount < 50

  // ── Start polling ─────────────────────────────────────────────────────────

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => {
    if (phase !== 'awaiting_feedback' || !submissionId) return

    attempts.current = 0

    pollRef.current = setInterval(async () => {
      attempts.current++

      if (attempts.current > MAX_POLL_ATTEMPTS) {
        stopPolling()
        setTimedOut(true)
        return
      }

      try {
        const res  = await fetch(`/api/submissions/${submissionId}/status`)
        const json = await res.json() as {
          success: boolean
          data: { status: string; feedback: FeedbackRow | null }
        }

        if (json.success && json.data.status === 'ai_scored' && json.data.feedback) {
          stopPolling()
          setFeedback(json.data.feedback)
          setPhase('feedback_ready')
        }
      } catch {
        // transient network error — keep polling
      }
    }, POLL_INTERVAL_MS)

    return () => stopPolling()
  }, [phase, submissionId, stopPolling])

  // ── If already scored — show feedback immediately (no form) ───────────────

  const alreadyScored =
    existingSubmission &&
    existingSubmission.status !== 'submitted' &&
    existingSubmission.status !== 'draft'

  if (alreadyScored || phase === 'feedback_ready') {
    const fb = feedback ?? existingSubmission?.feedback ?? null
    if (fb) {
      return (
        <div className="p-5 sm:p-6">
          <FeedbackCard feedback={fb} lang={lang} onToggleLang={() => setLang(l => l === 'en' ? 'vi' : 'en')} />
        </div>
      )
    }
  }

  // ── Submit handler ─────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (underMin || phase !== 'idle') return

    setPhase('submitting')

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment_id: assignment.id,
          content:       essay,
          word_count:    wordCount,
        }),
      })

      const json = await res.json() as { success: boolean; data?: { submission_id: string }; error?: string }

      if (!res.ok || !json.success) {
        setPhase('idle')
        return
      }

      setSubmissionId(json.data!.submission_id)
      setPhase('awaiting_feedback')
    } catch {
      setPhase('idle')
    }
  }

  // ── Word count colour ──────────────────────────────────────────────────────

  const wordCountCn = overLimit
    ? 'text-brand-red font-medium'
    : nearLimit
    ? 'text-amber font-medium'
    : 'text-gray-400'

  const instructions = lang === 'vi'
    ? (assignment.instructions_vi ?? assignment.instructions)
    : assignment.instructions

  const isSubmitting = phase === 'submitting'
  const isAwaiting   = phase === 'awaiting_feedback'

  // ── Awaiting feedback state ────────────────────────────────────────────────

  if (isAwaiting) {
    return (
      <div className="p-6 space-y-4 text-center">
        {timedOut ? (
          <>
            <AlertCircle size={32} className="mx-auto text-amber" aria-hidden />
            <p className="text-sm text-gray-700 font-medium">
              {lang === 'vi'
                ? 'Chấm bài đang mất nhiều thời gian hơn dự kiến. Vui lòng tải lại trang sau vài giây.'
                : 'Marking is taking longer than usual. Refresh the page in a moment to see your feedback.'}
            </p>
          </>
        ) : (
          <>
            {/* Progress ring */}
            <div className="relative w-16 h-16 mx-auto">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64" aria-hidden>
                <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                <circle
                  cx="32" cy="32" r="28" fill="none"
                  stroke="#1E9E75" strokeWidth="4"
                  strokeDasharray="175.9"
                  strokeDashoffset={175.9 * (1 - Math.min(attempts.current / MAX_POLL_ATTEMPTS, 1))}
                  strokeLinecap="round"
                  className="transition-all duration-[4000ms] ease-linear"
                />
              </svg>
              <Loader2 size={20} className="absolute inset-0 m-auto text-teal animate-spin" aria-hidden />
            </div>
            <p className="text-sm text-gray-700 font-medium">
              {lang === 'vi'
                ? 'Bài viết đang được chấm. Thường mất khoảng 20–30 giây.'
                : 'Your essay is being marked. This usually takes 20–30 seconds.'}
            </p>
            <p className="text-[11px] text-gray-400">
              {lang === 'vi' ? 'Vui lòng không đóng trang này.' : 'Please keep this page open.'}
            </p>
          </>
        )}
      </div>
    )
  }

  // ── Main form ──────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">

      {/* Lang toggle + instructions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-medium text-gray-800">{assignment.title}</h3>
          {assignment.instructions_vi && (
            <button
              type="button"
              onClick={() => setLang(l => l === 'en' ? 'vi' : 'en')}
              aria-label="Toggle instruction language"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 text-[11px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Globe size={12} aria-hidden />
              {lang === 'en' ? 'VI' : 'EN'}
            </button>
          )}
        </div>

        {instructions && (
          <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {instructions}
            </p>
          </div>
        )}
      </div>

      {/* Task 1 image */}
      {assignment.image_url && (
        <div className="relative w-full h-[420px] rounded-lg border border-gray-100 overflow-hidden">
          <Image
            src={assignment.image_url}
            alt="IELTS Task 1 chart for this question"
            fill
            className="object-contain"
          />
        </div>
      )}

      {/* Essay textarea */}
      <div className="space-y-1.5">
        <label htmlFor="essay" className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
          {lang === 'vi' ? 'Bài viết của bạn' : 'Your essay'}
        </label>
        <textarea
          id="essay"
          value={essay}
          onChange={e => setEssay(e.target.value)}
          required
          placeholder={
            lang === 'vi'
              ? 'Viết bài của bạn tại đây…'
              : 'Write your essay here…'
          }
          className={[
            'w-full rounded-lg border px-4 py-3 text-base leading-relaxed resize-y',
            'focus:outline-none focus:ring-2 focus:ring-teal focus:border-teal transition-colors',
            'placeholder:text-gray-300 text-gray-800',
            overLimit ? 'border-brand-red bg-brand-red-light' : 'border-gray-200 bg-white',
          ].join(' ')}
          style={{ minHeight: '300px', fontSize: '16px', lineHeight: '1.6' }}
        />

        {/* Word count */}
        <div className="flex items-center justify-between">
          <span className={`text-[11px] ${wordCountCn}`}>
            {wordCount} {lang === 'vi' ? 'từ' : 'words'}
            {wordLimit && (
              <span className="text-gray-400 font-normal">
                {' '}/ {wordLimit}
              </span>
            )}
          </span>
          {underMin && wordCount > 0 && (
            <span className="text-[11px] text-amber">
              {lang === 'vi'
                ? `Cần ít nhất ${minWords} từ`
                : `Minimum ${minWords} words`}
            </span>
          )}
        </div>
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={underMin || isSubmitting || overLimit}
        className={[
          'w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg',
          'text-sm font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/30',
          underMin || isSubmitting || overLimit
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-navy text-white hover:bg-navy-hover',
        ].join(' ')}
      >
        {isSubmitting ? (
          <>
            <Loader2 size={16} className="animate-spin" aria-hidden />
            {lang === 'vi' ? 'Đang nộp…' : 'Submitting…'}
          </>
        ) : (
          <>
            <Send size={16} aria-hidden />
            {lang === 'vi' ? 'Nộp bài để nhận phản hồi' : 'Submit for Feedback'}
          </>
        )}
      </button>

      {/* Already submitted but awaiting */}
      {existingSubmission?.status === 'submitted' && !isAwaiting && (
        <div className="rounded-lg bg-amber-light border border-amber/20 px-4 py-3 flex items-center gap-2">
          <CheckCircle size={15} className="text-amber flex-shrink-0" aria-hidden />
          <p className="text-[12px] text-amber">
            {lang === 'vi'
              ? 'Bài đã được nộp và đang chờ chấm điểm.'
              : 'Essay submitted and awaiting feedback.'}
          </p>
        </div>
      )}
    </form>
  )
}
