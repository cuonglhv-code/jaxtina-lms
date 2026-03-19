'use client'

import { useState, useId } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Card, Button } from '@/components/ui'
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
      <label htmlFor={id} className="block text-[11px] text-gray-400 mb-1">
        <span title={title}>{label}</span>
      </label>
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={invalid}
        className={[
          'w-full border rounded-md px-3 py-2 text-sm text-center focus:outline-none focus:ring-1 transition-colors',
          invalid
            ? 'border-brand-red text-brand-red focus:ring-brand-red'
            : 'border-gray-200 text-gray-700 focus:border-teal focus:ring-teal',
          disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'bg-white',
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
      <Card padding="md">
        <div className="py-6 text-center space-y-2">
          <CheckCircle size={32} className="mx-auto text-teal" aria-hidden />
          <p className="text-sm font-medium text-gray-900">{t('reviewSubmitted')}</p>
          <p className="text-[13px] text-gray-400">{t('learnerNotified')}</p>
        </div>
      </Card>
    )
  }

  return (
    <Card padding="md">
      <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400 mb-4">
        {t('teacherReview')}
      </p>

      <form id={formId} onSubmit={handleSubmit} className="space-y-4" noValidate>

        {/* ── Band score inputs ── */}
        <div className="space-y-3">
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
          <div className="pt-2 border-t border-gray-100">
            <BandInput
              id={`${formId}-band_overall`}
              label={t('overall')}
              title={t('overallTitle')}
              value={bands.band_overall}
              onChange={v => handleBandChange('band_overall', v)}
              disabled={disabled}
            />
            <p className="mt-1 text-[11px] text-gray-400">
              {t('overallHint')}
            </p>
          </div>
        </div>

        {/* ── Feedback text — EN / VI tabs ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400">
              {t('feedback')}
            </p>
            <div
              className="inline-flex gap-1"
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
                    'px-3 py-1 rounded-md text-[12px] font-medium transition-colors',
                    activeLang === l
                      ? 'bg-navy text-white'
                      : 'border border-gray-200 text-gray-500 hover:border-gray-300',
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
              className="w-full min-h-[200px] bg-gray-50 border border-gray-200 rounded-lg p-3 text-[13px] leading-relaxed text-gray-700 placeholder-gray-300 focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none resize-y disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <p className="mt-1 text-[11px] text-gray-400 text-right">
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
              className="w-full min-h-[200px] bg-gray-50 border border-gray-200 rounded-lg p-3 text-[13px] leading-relaxed text-gray-700 placeholder-gray-300 focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none resize-y disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <p className="mt-1 text-[11px] text-gray-400 text-right">
              {t('chars', { count: feedbackVi.length })}
            </p>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-brand-red/20 bg-brand-red-light px-4 py-3 text-[13px] text-brand-red"
          >
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" aria-hidden />
            {error}
          </div>
        )}

        {/* ── Submit ── */}
        {!isReviewed && (
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={disabled}
            isLoading={submitting}
          >
            {submitting ? t('submitting') : t('returnToLearner')}
          </Button>
        )}

        {isReviewed && existingTeacherFeedback && (
          <div className="flex items-center gap-2 rounded-lg bg-teal-light border border-teal/20 px-4 py-3 text-[13px] text-teal-text">
            <CheckCircle size={14} aria-hidden />
            {t('alreadyReviewed')}
          </div>
        )}

      </form>
    </Card>
  )
}
