'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Badge }       from '@/components/ui/Badge'
import { Card }        from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'

interface CourseProgressCardProps {
  title:         string        // course title
  className:     string        // cohort/class name e.g. "IELTS Batch 2026-A"
  completionPct: number
  continueHref:  string
  level?:        string | null
  thumbnailUrl?: string | null // reserved, unused in current design
}

export function CourseProgressCard({
  title,
  className: cohortName,
  completionPct,
  continueHref,
  level,
}: CourseProgressCardProps) {
  // Animate ProgressBar from 0 → completionPct on mount
  const [animatedPct, setAnimatedPct] = useState(0)

  useEffect(() => {
    const id = setTimeout(() => {
      setAnimatedPct(Math.min(100, Math.max(0, completionPct)))
    }, 100)
    return () => clearTimeout(id)
  }, [completionPct])

  const pct = Math.round(completionPct)
  const label = pct === 0 ? 'Start' : pct >= 100 ? 'Review' : 'Continue →'

  return (
    <Card padding="md" className="flex flex-col gap-0">
      {/* Level badge */}
      {level && <Badge variant="teal">{level}</Badge>}

      {/* Title */}
      <h3 className={['text-[13px] font-medium text-gray-900 leading-snug', level ? 'mt-2' : ''].join(' ')}>
        {title}
      </h3>

      {/* Class name */}
      <p className="text-[11px] text-gray-400 mt-0.5">{cohortName}</p>

      {/* Progress */}
      <ProgressBar value={animatedPct} size="sm" className="mt-3 mb-2" />

      {/* Pct label */}
      <p className="text-[11px] text-gray-500">{pct}% complete</p>

      {/* CTA */}
      <Link
        href={continueHref}
        className="mt-3 flex w-full items-center justify-center rounded-md bg-navy px-3 py-1.5 text-xs font-medium text-white hover:bg-navy-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/30"
      >
        {label}
      </Link>
    </Card>
  )
}
