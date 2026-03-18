'use client'

import { useState, useId } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { FeedbackCard } from '@/components/lms/FeedbackCard'
import type { FeedbackRow } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  submissionId:            string
  aiFeedback:              FeedbackRow | null
  existingTeacherFeedback: FeedbackRow | null
  isReviewed:              boolean
}

interface BandValues {
  band_ta:      string
  band_cc:      string
  band_lr:      string
  band_gra:     string
  band_overall: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CRITERIA_KEYS: { key: keyof BandValues; label: string; titleKey: string }[] = [
  { key: 'band_ta',  label: 'TA',  titleKey: 'criteriaTA'  },
  { key: 'band_cc',  label: 'CC',  titleKey: 'criteriaCC'  },
  { key: 'band_lr',  label: 'LR',  titleKey: 'criteriaLR'  },
  { key: 'band_gra', label: 'GRA', titleKey: 'criteriaGRA' },
]

const VALID_BANDS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9]

function roundToHalf(n: number): number {
  return Math.round(n * 2) / 2
}

function calcOverall(vals: BandValues): string {
  const scores = [vals.band_ta, vals.band_cc, vals.band_lr, vals.band_gra]
    .map(v => parseFloat(v))
    .filter(v => !isNaN(v))
  if (scores.length < 4) return ''
  const avg = scores.reduce((a, b) => a + b, 0) / 4
  return String(roundToHalf(avg))
}

function toStr(n: number | null | undefined): string {
  return n != null ? String(n) : ''
}

// ── BandInput ─────────────────────────────────────────────────────────────────

function BandInput({
  id, label, title, value, onChange, disabled,
}: {
  id:       string
  label:    string
  title:    string
  value:    string
  onChange: (v: string) => void
  disabled: boolean
}) {
  const t = useTranslations('teacherReview')
  const invalid = value !== '' && !VALID_BANDS.includes(parseFloat(value))
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
        <span title={title}>{label}</span>
      </label>
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={invalid}
        className={[
          'w-full rounded-xl border px-3 py-2 text-sm font-semibold bg-white transition-colors',
          invalid
            ? 'border-red-400 text-red-600 focus:ring-red-300'
            : 'border-slate-300 text-slate-800 focus:border-teal-400 focus:ring-teal-100',
          'focus:outline-none focus:ring-2',
          disabled ? 'opacity-60 cursor-not-allowed' : '',
        ].join(' ')}
      >
        <option value="">{t('selectBand')}</option>
        {VALID_BANDS.map(b => (
          <option key={b} value={String(b)}>{b.toFixed(1)}</option>
        ))}
      </select>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TeacherReviewForm({
  submissionId,
  aiFeedback,
  existingTeacherFeedback,
  isReviewed,
}: Props) {
  const router   = useRouter()
  const formId   = useId()
  const t        = useTranslations('teacherReview')

  const CRITERIA = CRITERIA_KEYS.map(c => ({ ...c, title: t(c.titleKey as Parameters<typeof t>[0]) }))

  const prefill = existingTeacherFeedback ?? aiFeedback

  const [bands, setBands] = useState<BandValues>({
    band_ta:      toStr(prefill?.band_ta),
    band_cc:      toStr(prefill?.band_cc),
    band_lr:      toStr(prefill?.band_lr),
    band_gra:     toStr(prefill?.band_gra),
    band_overall: toStr(prefill?.band_overall),
  })

  const [feedbackEn,  setFeedbackEn]  = useState(prefill?.feedback_en  ?? '')
  const [feedbackVi,  setFeedbackVi]  = useState(prefill?.feedback_vi  ?? '')
  const [activeLang,  setActiveLang]  = useState<'en' | 'vi'>('en')
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [submitted,   setSubmitted]   = useState(false)

  const disabled = isReviewed || submitting || submitted

  // Auto-calculate overall when criteria change
  function handleBandChange(key: keyof BandValues, value: string) {
    const next = { ...bands, [key]: value }
    if (key !== 'band_overall') {
      next.band_overall = calcOverall(next)
    }
    setBands(next)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Validate all bands filled
    const bandNums = {
      band_ta:      parseFloat(bands.band_ta),
      band_cc:      parseFloat(bands.band_cc),
      band_lr:      parseFloat(bands.band_lr),
      band_gra:     parseFloat(bands.band_gra),
      band_overall: parseFloat(bands.band_overall),
    }
    if (Object.values(bandNums).some(isNaN)) {
      setError(t('allBandsRequired'))
      return
    }
    if (!feedbackEn.trim()) {
      setError(t('enFeedbackRequired'))
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch(`/api/submissions/${submissionId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bandNums,
          feedback_en: feedbackEn.trim(),
          feedback_vi: feedbackVi.trim() || null,
        }),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'Failed to submit review.')
      }

      setSubmitted(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl px-6 py-10 text-center space-y-3">
        <CheckCircle size={36} className="mx-auto text-green-500" aria-hidden />
        <p className="text-base font-semibold text-green-800">{t('reviewSubmitted')}</p>
        <p className="text-sm text-green-600">{t('learnerNotified')}</p>
      </div>
    )
  }

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-6" noValidate>

      {/* ── AI Feedback (read-only reference) ── */}
      {aiFeedback && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            {t('aiFeedbackRef')}
          </p>
          <FeedbackCard
            feedback={aiFeedback}
            preferredLang="en"
          />
        </div>
      )}

      {/* ── Band score inputs ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <p className="text-sm font-semibold text-slate-700">{t('bandScores')}</p>
        <div className="grid grid-cols-2 gap-3">
          {CRITERIA.map(({ key, label, title }) => (
            <BandInput
              key={key}
              id={`${formId}-${key}`}
              label={label}
              title={title}
              value={bands[key]}
              onChange={v => handleBandChange(key, v)}
              disabled={disabled}
            />
          ))}
        </div>

        {/* Overall — auto-calculated, still editable */}
        <div className="pt-1 border-t border-slate-100">
          <BandInput
            id={`${formId}-band_overall`}
            label={t('overall')}
            title={t('overallTitle')}
            value={bands.band_overall}
            onChange={v => handleBandChange('band_overall', v)}
            disabled={disabled}
          />
          <p className="mt-1 text-xs text-slate-400">
            {t('overallHint')}
          </p>
        </div>
      </div>

      {/* ── Feedback text — EN / VI tabs ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">{t('feedback')}</p>
          <div
            className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium"
            role="group"
            aria-label={t('feedbackLangGroup')}
          >
            {(['en', 'vi'] as const).map(l => (
              <button
                key={l}
                type="button"
                onClick={() => setActiveLang(l)}
                aria-pressed={activeLang === l}
                className={[
                  'px-3 py-1.5 transition-colors',
                  activeLang === l
                    ? 'bg-teal-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50',
                ].join(' ')}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* EN textarea */}
        <div className={activeLang === 'en' ? 'block' : 'hidden'}>
          <label htmlFor={`${formId}-feedback_en`} className="sr-only">
            {t('enFeedbackLabel')}
          </label>
          <textarea
            id={`${formId}-feedback_en`}
            value={feedbackEn}
            onChange={e => setFeedbackEn(e.target.value)}
            disabled={disabled}
            placeholder={t('enPlaceholder')}
            rows={12}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 placeholder-slate-300 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 focus:outline-none resize-y disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-slate-400 text-right">
            {t('chars', { count: feedbackEn.length })}
          </p>
        </div>

        {/* VI textarea */}
        <div className={activeLang === 'vi' ? 'block' : 'hidden'}>
          <label htmlFor={`${formId}-feedback_vi`} className="sr-only">
            {t('viFeedbackLabel')}
          </label>
          <textarea
            id={`${formId}-feedback_vi`}
            value={feedbackVi}
            onChange={e => setFeedbackVi(e.target.value)}
            disabled={disabled}
            placeholder="Nhận xét bằng tiếng Việt… (hỗ trợ Markdown)"
            rows={12}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 placeholder-slate-300 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 focus:outline-none resize-y disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-slate-400 text-right">
            {t('chars', { count: feedbackVi.length })}
          </p>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" aria-hidden />
          {error}
        </div>
      )}

      {/* ── Submit ── */}
      {!isReviewed && (
        <button
          type="submit"
          form={formId}
          disabled={disabled}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting
            ? <><Loader2 size={16} className="animate-spin" aria-hidden /> {t('submitting')}</>
            : t('returnToLearner')}
        </button>
      )}

      {isReviewed && existingTeacherFeedback && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 flex items-center gap-2">
          <CheckCircle size={15} aria-hidden />
          {t('alreadyReviewed')}
        </div>
      )}
    </form>
  )
}
