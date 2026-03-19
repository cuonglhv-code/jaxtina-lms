'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Circle, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface LessonCompleteButtonProps {
  lessonId: string
  initialCompleted: boolean
}

export function LessonCompleteButton({
  lessonId,
  initialCompleted,
}: LessonCompleteButtonProps) {
  const t = useTranslations('lessonComplete')
  const [completed, setCompleted] = useState(initialCompleted)
  const [loading, setLoading] = useState(false)

  // On mount: if not already completed, mark as in-progress (50%)
  useEffect(() => {
    if (!initialCompleted) {
      fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_id: lessonId,
          completed: false,
          progress_pct: 50,
        }),
      }).catch(() => {
        // Non-critical — silently ignore if network fails
      })
    }
    // Only run once on mount, based on initial value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId])

  async function handleMarkComplete() {
    if (completed || loading) return

    setCompleted(true) // optimistic
    setLoading(true)

    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_id: lessonId,
          completed: true,
          progress_pct: 100,
        }),
      })
      if (!res.ok) {
        setCompleted(false) // revert on failure
      }
    } catch {
      setCompleted(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleMarkComplete}
      disabled={completed || loading}
      aria-label={completed ? t('completed') : t('markComplete')}
      className={[
        'inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        completed
          ? 'bg-teal-light text-teal-text border border-teal cursor-default focus-visible:ring-teal'
          : 'bg-navy text-white hover:bg-navy-hover focus-visible:ring-navy',
        loading ? 'opacity-70 cursor-wait' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" aria-hidden />
      ) : completed ? (
        <CheckCircle size={16} aria-hidden />
      ) : (
        <Circle size={16} aria-hidden />
      )}
      {completed ? t('completed') : loading ? t('saving') : t('markComplete')}
    </button>
  )
}
