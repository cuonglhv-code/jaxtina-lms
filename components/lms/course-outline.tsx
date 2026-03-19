'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ChevronDown, PlayCircle, BookOpen, PenLine, Video, FileText,
  CheckCircle, Clock,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LessonRow {
  id: string
  title: string
  lesson_type: string
  duration_mins: number | null
  position: number
  is_preview: boolean
  learner_progress: { completed: boolean; progress_pct: number }[]
}

export interface ModuleRow {
  id: string
  title: string
  position: number
  lessons: LessonRow[]
}

interface CourseOutlineProps {
  courseId: string
  modules: ModuleRow[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const LESSON_ICONS: Record<string, React.ElementType> = {
  video:         PlayCircle,
  reading:       BookOpen,
  exercise:      PenLine,
  live:          Video,
  ielts_writing: FileText,
}

const LESSON_TYPE_LABELS: Record<string, string> = {
  video:         'Video',
  reading:       'Reading',
  exercise:      'Exercise',
  live:          'Live',
  ielts_writing: 'Writing',
}

function fmtDuration(mins: number | null) {
  if (!mins) return null
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}min` : `${h}h`
}

// ── Module section ────────────────────────────────────────────────────────────

function ModuleSection({
  mod,
  courseId,
}: {
  mod: ModuleRow
  courseId: string
}) {
  const [open, setOpen] = useState(true)
  const t = useTranslations('outline')

  const completedCount = mod.lessons.filter(
    l => l.learner_progress[0]?.completed
  ).length
  const total = mod.lessons.length

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      {/* Module header */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-gray-800 truncate">
            {mod.title}
          </h3>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {t('lessonsCompleted', { completed: completedCount, total })}
          </p>
        </div>
        <ChevronDown
          size={16}
          className={[
            'flex-shrink-0 text-gray-400 transition-transform',
            open ? 'rotate-180' : '',
          ].join(' ')}
          aria-hidden
        />
      </button>

      {/* Lesson list */}
      {open && (
        <ul className="divide-y divide-gray-50">
          {mod.lessons
            .slice()
            .sort((a, b) => a.position - b.position)
            .map(lesson => {
              const Icon = LESSON_ICONS[lesson.lesson_type] ?? PlayCircle
              const progress = lesson.learner_progress[0]
              const isCompleted = progress?.completed ?? false
              const duration = fmtDuration(lesson.duration_mins)

              return (
                <li key={lesson.id}>
                  <Link
                    href={`/courses/${courseId}/lessons/${lesson.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-teal-light transition-colors group"
                  >
                    {/* Completion status / type icon */}
                    {isCompleted ? (
                      <CheckCircle
                        size={18}
                        className="flex-shrink-0 text-teal"
                        aria-label="Completed"
                      />
                    ) : (
                      <Icon
                        size={18}
                        className="flex-shrink-0 text-gray-400 group-hover:text-teal transition-colors"
                        aria-hidden
                      />
                    )}

                    <span className="flex-1 min-w-0 text-[13px] text-gray-700 group-hover:text-navy truncate">
                      {lesson.title}
                    </span>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Type badge */}
                      <span className="hidden sm:inline text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                        {LESSON_TYPE_LABELS[lesson.lesson_type] ?? lesson.lesson_type}
                      </span>

                      {/* Duration */}
                      {duration && (
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                          <Clock size={12} aria-hidden />
                          {duration}
                        </span>
                      )}

                      {/* In-progress indicator */}
                      {!isCompleted && (progress?.progress_pct ?? 0) > 0 && (
                        <span className="text-[10px] font-medium text-teal">
                          {progress!.progress_pct}%
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              )
            })}

          {mod.lessons.length === 0 && (
            <li className="px-5 py-4 text-sm text-gray-400 italic">
              {t('noLessons')}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

// ── CourseOutline ─────────────────────────────────────────────────────────────

export function CourseOutline({ courseId, modules }: CourseOutlineProps) {
  const t = useTranslations('outline')

  if (modules.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic py-6 text-center">
        {t('noModules')}
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {modules
        .slice()
        .sort((a, b) => a.position - b.position)
        .map(mod => (
          <ModuleSection key={mod.id} mod={mod} courseId={courseId} />
        ))}
    </div>
  )
}
