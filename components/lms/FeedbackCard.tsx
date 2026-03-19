'use client'

import { useState } from 'react'
import { marked } from 'marked'
import { Bot, GraduationCap } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { FeedbackRow } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface FeedbackCardProps {
  /** Primary feedback to display (teacher-reviewed takes precedence). */
  feedback:      FeedbackRow
  preferredLang: 'en' | 'vi'
  /**
   * Original AI feedback, shown in a collapsed section when the primary
   * feedback is teacher-authored. Pass only when source = 'teacher'.
   */
  aiFeedback?:   FeedbackRow | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderMarkdown(source: string | null | undefined): string {
  if (!source) return ''
  // marked.parse() is synchronous when no async extensions are configured
  return marked.parse(source) as string
}

function scoreColor(score: number | null): string {
  if (score == null) return 'text-gray-400'
  if (score > 6.5)  return 'text-teal-text'
  if (score >= 5.5) return 'text-amber'
  return 'text-red-600'
}

const CRITERIA = [
  { key: 'band_ta',  label: 'TA',  title: 'Task Achievement / Response' },
  { key: 'band_cc',  label: 'CC',  title: 'Coherence & Cohesion' },
  { key: 'band_lr',  label: 'LR',  title: 'Lexical Resource' },
  { key: 'band_gra', label: 'GRA', title: 'Grammatical Range & Accuracy' },
] as const

// ── MarkdownBody ──────────────────────────────────────────────────────────────

function MarkdownBody({ source }: { source: string | null | undefined }) {
  const html = renderMarkdown(source)
  if (!html) {
    return (
      <p className="text-[13px] text-gray-400 italic">No detailed feedback available.</p>
    )
  }
  return (
    <div
      className={[
        'text-[13px] leading-[1.8] text-gray-600',
        // first element — no top margin
        '[&>*:first-child]:mt-0',
        // h2 / h3 section headings
        '[&_h2]:text-[11px] [&_h2]:font-medium [&_h2]:uppercase [&_h2]:tracking-widest [&_h2]:text-gray-900 [&_h2]:mb-2 [&_h2]:mt-5',
        '[&_h3]:text-[11px] [&_h3]:font-medium [&_h3]:uppercase [&_h3]:tracking-widest [&_h3]:text-gray-900 [&_h3]:mb-2 [&_h3]:mt-5',
        // blockquote — quoted essay excerpts
        '[&_blockquote]:border-l-2 [&_blockquote]:border-teal [&_blockquote]:pl-3 [&_blockquote]:text-gray-500 [&_blockquote]:italic [&_blockquote]:my-2',
        // paragraphs
        '[&_p]:mb-3 [&_p:last-child]:mb-0',
        // lists
        '[&_ul]:pl-5 [&_ul]:list-disc [&_ul]:space-y-1',
        '[&_ol]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-1',
        // emphasis
        '[&_strong]:text-gray-800 [&_strong]:font-medium',
      ].join(' ')}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

// ── SubScores ─────────────────────────────────────────────────────────────────

function SubScores({ feedback }: { feedback: FeedbackRow }) {
  return (
    <div className="grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-100">
      {CRITERIA.map(({ key, label, title }) => {
        const score = feedback[key]
        return (
          <div key={key} title={title} className="py-3.5 px-4 text-center">
            <p className={['font-display text-xl', scoreColor(score)].join(' ')}>
              {score ?? '—'}
            </p>
            <p className="text-[10px] text-gray-400 tracking-wide mt-1">{label}</p>
          </div>
        )
      })}
    </div>
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
  const [open, setOpen] = useState(false)
  const markdownSrc = lang === 'vi'
    ? (aiFeedback.feedback_vi ?? aiFeedback.feedback_en)
    : aiFeedback.feedback_en

  return (
    <div className="px-5 pb-5 border-t border-gray-100">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="mt-4 text-[12px] text-gray-400 underline cursor-pointer hover:text-gray-600 transition-colors"
      >
        View AI assessment
        {aiFeedback.band_overall != null && (
          <span className="no-underline"> · Band {aiFeedback.band_overall}</span>
        )}
      </button>

      {open && (
        <div className="mt-4 opacity-70">
          <div className="rounded-lg border border-gray-100 overflow-hidden">
            <SubScores feedback={aiFeedback} />
            <div className="px-5 py-5">
              <MarkdownBody source={markdownSrc} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── FeedbackCard ──────────────────────────────────────────────────────────────

export function FeedbackCard({ feedback, preferredLang, aiFeedback }: FeedbackCardProps) {
  const t   = useTranslations('feedback')
  const [lang, setLang] = useState<'en' | 'vi'>(preferredLang)

  const isTeacher   = feedback.source === 'teacher'
  const markdownSrc = lang === 'vi'
    ? (feedback.feedback_vi ?? feedback.feedback_en)
    : feedback.feedback_en

  const showAiSection = isTeacher && aiFeedback != null
  const sourceLabel   = isTeacher ? t('teacherReviewed') : t('aiMarked')

  return (
    <div className="rounded-lg border border-gray-100 overflow-hidden">

      {/* ── TOP BAND SECTION ── */}
      <div className="bg-navy rounded-t-lg px-7 py-5 flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-5xl text-white leading-none tabular-nums">
            {feedback.band_overall ?? '—'}
          </p>
          <p className="text-[13px] text-white/50 mt-1">Overall band</p>
        </div>
        <span className="flex items-center gap-1.5 bg-white/10 border border-white/15 text-white/60 text-[11px] px-3 py-1 rounded-full mt-1 flex-shrink-0">
          {isTeacher
            ? <GraduationCap size={12} aria-hidden />
            : <Bot size={12} aria-hidden />}
          {sourceLabel}
        </span>
      </div>

      {/* ── SUB-SCORES ── */}
      <SubScores feedback={feedback} />

      {/* ── LANGUAGE TOGGLE ── */}
      <div className="px-5 pt-4 pb-0 flex gap-1.5">
        {(['en', 'vi'] as const).map(l => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            aria-pressed={lang === l}
            className={[
              'text-[12px] px-5 py-1.5 rounded-md transition-colors',
              lang === l
                ? 'bg-navy text-white'
                : 'border border-gray-200 text-gray-500 hover:border-gray-300',
            ].join(' ')}
          >
            {l === 'en' ? 'EN' : 'VI'}
          </button>
        ))}
      </div>

      {/* ── FEEDBACK BODY ── */}
      <div className="px-5 py-5">
        <MarkdownBody source={markdownSrc} />
      </div>

      {/* ── COLLAPSIBLE AI SECTION (teacher-reviewed only) ── */}
      {showAiSection && (
        <CollapsibleAiFeedback aiFeedback={aiFeedback!} lang={lang} />
      )}
    </div>
  )
}
