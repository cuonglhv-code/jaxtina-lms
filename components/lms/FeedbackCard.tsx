'use client'

import { useState } from 'react'
import { marked } from 'marked'
import { ChevronDown, ChevronUp, Bot, GraduationCap } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { FeedbackRow } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface FeedbackCardProps {
  /** Primary feedback to display (teacher-reviewed takes precedence). */
  feedback:    FeedbackRow
  preferredLang: 'en' | 'vi'
  /**
   * Original AI feedback, shown in a collapsed section when the primary
   * feedback is teacher-authored. Pass only when source = 'teacher'.
   */
  aiFeedback?: FeedbackRow | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function bandColor(score: number | null): string {
  if (score == null) return 'bg-slate-100 text-slate-400'
  if (score < 5.5)   return 'bg-red-100 text-red-700'
  if (score <= 6.5)  return 'bg-amber-100 text-amber-700'
  return 'bg-green-100 text-green-700'
}

function renderMarkdown(source: string | null | undefined): string {
  if (!source) return ''
  // marked.parse() is synchronous when no async extensions are configured
  return marked.parse(source) as string
}

const CRITERIA = [
  { key: 'band_ta',  label: 'TA', title: 'Task Achievement / Response' },
  { key: 'band_cc',  label: 'CC', title: 'Coherence & Cohesion' },
  { key: 'band_lr',  label: 'LR', title: 'Lexical Resource' },
  { key: 'band_gra', label: 'GRA', title: 'Grammatical Range & Accuracy' },
] as const

// ── MarkdownBody ──────────────────────────────────────────────────────────────

function MarkdownBody({ source }: { source: string | null | undefined }) {
  const t = useTranslations('feedback')
  const html = renderMarkdown(source)
  if (!html) return <p className="text-sm text-slate-400 italic">{t('noFeedbackText')}</p>
  return (
    <article
      className="prose prose-slate prose-sm max-w-none
        prose-headings:text-slate-800 prose-headings:font-semibold
        prose-p:text-slate-700 prose-p:leading-relaxed
        prose-strong:text-slate-800"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

// ── BandGrid ──────────────────────────────────────────────────────────────────

function BandGrid({ feedback }: { feedback: FeedbackRow }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {CRITERIA.map(({ key, label, title }) => {
        const score = feedback[key]
        return (
          <div
            key={key}
            title={title}
            className={`rounded-xl px-3 py-2.5 flex items-center justify-between ${bandColor(score)}`}
          >
            <span className="text-xs font-semibold uppercase tracking-wide opacity-80">
              {label}
            </span>
            <span className="text-lg font-bold tabular-nums">
              {score ?? '—'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── SourceBadge ───────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: string }) {
  const t = useTranslations('feedback')
  const isTeacher = source === 'teacher'
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        isTeacher
          ? 'bg-indigo-100 text-indigo-700'
          : 'bg-slate-100 text-slate-500',
      ].join(' ')}
    >
      {isTeacher
        ? <GraduationCap size={12} aria-hidden />
        : <Bot size={12} aria-hidden />}
      {isTeacher ? t('teacherReviewed') : t('aiMarked')}
    </span>
  )
}

// ── CollapsibleAiFeedback ─────────────────────────────────────────────────────

function CollapsibleAiFeedback({
  aiFeedback,
  lang,
}: {
  aiFeedback: FeedbackRow
  lang: 'en' | 'vi'
}) {
  const t = useTranslations('feedback')
  const [open, setOpen] = useState(false)
  const label = t('viewAiFeedback')

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Bot size={14} className="text-slate-400" aria-hidden />
          <span className="text-sm font-medium text-slate-600">{label}</span>
          {aiFeedback.band_overall != null && (
            <span className="text-xs text-slate-400">
              · Band {aiFeedback.band_overall}
            </span>
          )}
        </div>
        {open
          ? <ChevronUp size={15} className="text-slate-400 flex-shrink-0" aria-hidden />
          : <ChevronDown size={15} className="text-slate-400 flex-shrink-0" aria-hidden />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-3 space-y-4">
          <BandGrid feedback={aiFeedback} />
          <MarkdownBody
            source={lang === 'vi'
              ? (aiFeedback.feedback_vi ?? aiFeedback.feedback_en)
              : aiFeedback.feedback_en}
          />
        </div>
      )}
    </div>
  )
}

// ── FeedbackCard ──────────────────────────────────────────────────────────────

export function FeedbackCard({ feedback, preferredLang, aiFeedback }: FeedbackCardProps) {
  const t    = useTranslations('feedback')
  const [lang, setLang] = useState<'en' | 'vi'>(preferredLang)

  const isTeacher    = feedback.source === 'teacher'
  const markdownSrc  = lang === 'vi'
    ? (feedback.feedback_vi ?? feedback.feedback_en)
    : feedback.feedback_en

  const showAiSection = isTeacher && aiFeedback != null

  return (
    <div className="space-y-5">

      {/* ── Header: overall band + source badge ── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">
            {t('overallBand')}
          </p>
          <p className="text-5xl font-extrabold text-slate-900 leading-none tabular-nums">
            {feedback.band_overall ?? '—'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <SourceBadge source={feedback.source} />
          {/* EN | VI toggle */}
          <div
            className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium"
            role="group"
            aria-label={t('feedbackLanguage')}
          >
            {(['en', 'vi'] as const).map(l => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                className={[
                  'px-3 py-1.5 transition-colors',
                  lang === l
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50',
                ].join(' ')}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Sub-score 2×2 grid ── */}
      <BandGrid feedback={feedback} />

      {/* ── Feedback body ── */}
      <div className="border-t border-slate-100 pt-4">
        <MarkdownBody source={markdownSrc} />
      </div>

      {/* ── Collapsed AI feedback (teacher-reviewed only) ── */}
      {showAiSection && (
        <CollapsibleAiFeedback aiFeedback={aiFeedback!} lang={lang} />
      )}
    </div>
  )
}
