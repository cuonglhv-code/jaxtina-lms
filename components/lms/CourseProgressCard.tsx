'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'

// ── Types ─────────────────────────────────────────────────────────────────────

interface CourseProgressCardProps {
  title: string
  className: string   // the cohort/class name, e.g. "IELTS Batch 2026-A"
  completionPct: number
  continueHref: string
  thumbnailUrl?: string | null
  level?: string | null
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CourseProgressCard({
  title,
  className,
  completionPct,
  continueHref,
  level,
}: CourseProgressCardProps) {
  const t = useTranslations('progress')
  // Animate width from 0 → completionPct on mount
  const [barWidth, setBarWidth] = useState(0)

  useEffect(() => {
    // rAF ensures the 0-width starting state is painted before we transition
    const id = requestAnimationFrame(() => {
      setBarWidth(Math.min(100, Math.max(0, completionPct)))
    })
    return () => cancelAnimationFrame(id)
  }, [completionPct])

  const pct = Math.round(completionPct)

  return (
    <article className="flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Card header strip */}
      <div className="h-1.5 bg-slate-100">
        <div
          className="h-full bg-indigo-500 transition-[width] duration-700 ease-out rounded-full"
          style={{ width: `${barWidth}%` }}
          role="presentation"
          aria-hidden
        />
      </div>

      <div className="flex flex-col flex-1 p-5 gap-3">
        {/* Meta */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-slate-400 truncate">{className}</p>
            <h3 className="mt-0.5 text-base font-semibold text-slate-800 leading-snug line-clamp-2">
              {title}
            </h3>
          </div>
          {level && (
            <span className="flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
              {level}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500">{t('progress')}</span>
            <span className="text-xs font-semibold text-slate-700">{pct}%</span>
          </div>
          <div
            className="h-2 bg-slate-100 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${title} — ${pct}% complete`}
          >
            <div
              className="h-full bg-indigo-500 rounded-full transition-[width] duration-700 ease-out"
              style={{ width: `${barWidth}%` }}
            />
          </div>
        </div>

        {/* CTA */}
        <Link
          href={continueHref}
          className="mt-auto inline-flex items-center justify-center gap-1.5 w-full px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
        >
          {pct === 0 ? t('start') : pct >= 100 ? t('review') : t('continue')}
          <ArrowRight size={14} aria-hidden />
        </Link>
      </div>
    </article>
  )
}
