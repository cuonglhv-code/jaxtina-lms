'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Loader2, Eye, EyeOff } from 'lucide-react'
import { revalidateLessonsPage } from '@/lib/actions/lesson-actions'
import { LessonDrawer } from './lesson-drawer'
import {
  LESSON_TYPE_LABELS,
  type Lesson,
  type LessonType,
} from '@/lib/validations/lesson'

interface LessonListProps {
  courseId:       string
  moduleId:       string
  initialLessons: Lesson[]
}

// ── Badge config ─────────────────────────────────────────────────────────────

const TYPE_BADGE: Record<LessonType, string> = {
  video:         'bg-blue-100 text-blue-700',
  reading:       'bg-purple-100 text-purple-700',
  exercise:      'bg-orange-100 text-orange-700',
  live:          'bg-green-100 text-green-700',
  ielts_writing: 'bg-indigo-100 text-indigo-700',
}

// ── Component ────────────────────────────────────────────────────────────────

export function LessonList({ courseId, moduleId, initialLessons }: LessonListProps) {
  const router = useRouter()

  const [lessons, setLessons]           = useState<Lesson[]>(initialLessons)
  const [drawerOpen, setDrawerOpen]     = useState(false)
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting]         = useState(false)
  const [togglingId, setTogglingId]     = useState<string | null>(null)

  async function revalidate() {
    await revalidateLessonsPage(courseId, moduleId)
    router.refresh()
  }

  function openAdd() {
    setEditingLesson(null)
    setDrawerOpen(true)
  }

  function openEdit(lesson: Lesson) {
    setEditingLesson(lesson)
    setDrawerOpen(true)
  }

  function handleSaved(saved: Lesson) {
    setLessons(prev => {
      const exists = prev.some(l => l.id === saved.id)
      return exists
        ? prev.map(l => l.id === saved.id ? saved : l)
        : [...prev, saved]
    })
    setDrawerOpen(false)
    revalidate()
  }

  // Optimistic is_preview toggle
  async function handleTogglePreview(lesson: Lesson) {
    const optimistic = !lesson.is_preview
    setLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, is_preview: optimistic } : l))
    setTogglingId(lesson.id)

    const res = await fetch(`/api/lessons/${lesson.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ is_preview: optimistic }),
    })

    setTogglingId(null)
    if (!res.ok) {
      // Revert
      setLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, is_preview: lesson.is_preview } : l))
    }
  }

  async function handleDelete() {
    if (!confirmDeleteId) return
    setDeleting(true)

    const res = await fetch(`/api/lessons/${confirmDeleteId}`, { method: 'DELETE' })
    setDeleting(false)
    setConfirmDeleteId(null)

    if (res.ok) {
      setLessons(prev => prev.filter(l => l.id !== confirmDeleteId))
      await revalidate()
    }
  }

  return (
    <>
      {/* ── Add button ────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <button
          onClick={openAdd}
          aria-label="Add lesson"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} aria-hidden="true" />
          Add lesson
        </button>
      </div>

      {/* ── Empty state ────────────────────────────────────────────────── */}
      {lessons.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-slate-500">
          <p className="text-sm">No lessons in this module yet.</p>
          <button
            onClick={openAdd}
            className="mt-3 text-sm font-medium text-indigo-600 hover:underline"
          >
            Add your first lesson →
          </button>
        </div>
      ) : (
        /* ── Lesson table ───────────────────────────────────────────── */
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {/* Column header */}
          <div className="hidden sm:grid grid-cols-[2rem_1fr_8rem_5rem_4rem_4rem] gap-x-4 items-center px-4 py-2.5 bg-slate-50 border-b border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">#</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Title</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Duration</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Preview</span>
            <span />
          </div>

          <div className="divide-y divide-slate-100">
            {lessons.map((lesson, idx) => (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                index={idx}
                togglingId={togglingId}
                onEdit={() => openEdit(lesson)}
                onDeleteRequest={() => setConfirmDeleteId(lesson.id)}
                onTogglePreview={() => handleTogglePreview(lesson)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Delete confirmation ────────────────────────────────────────── */}
      {confirmDeleteId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-lesson-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 id="delete-lesson-title" className="text-base font-semibold text-slate-900">
              Delete lesson?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Any assignments attached to this lesson will also be permanently deleted.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={deleting}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Drawer ──────────────────────────────────────────── */}
      {drawerOpen && (
        <LessonDrawer
          moduleId={moduleId}
          lesson={editingLesson ?? undefined}
          nextPosition={lessons.length}
          onClose={() => setDrawerOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}

// ── LessonRow ────────────────────────────────────────────────────────────────

interface LessonRowProps {
  lesson:           Lesson
  index:            number
  togglingId:       string | null
  onEdit:           () => void
  onDeleteRequest:  () => void
  onTogglePreview:  () => void
}

function LessonRow({ lesson, index, togglingId, onEdit, onDeleteRequest, onTogglePreview }: LessonRowProps) {
  const isToggling = togglingId === lesson.id

  return (
    <div className="grid grid-cols-[2rem_1fr] sm:grid-cols-[2rem_1fr_8rem_5rem_4rem_4rem] gap-x-4 items-center px-4 py-3 hover:bg-slate-50 transition-colors">
      {/* Position */}
      <span className="text-xs font-mono text-slate-400 text-center">{index + 1}</span>

      {/* Title */}
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{lesson.title}</p>
        {lesson.title_vi && (
          <p className="text-xs text-slate-500 truncate mt-0.5">{lesson.title_vi}</p>
        )}
        {/* Mobile-only type badge */}
        <span className={`mt-1 inline-flex sm:hidden items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[lesson.lesson_type]}`}>
          {LESSON_TYPE_LABELS[lesson.lesson_type]}
        </span>
      </div>

      {/* Type badge (desktop) */}
      <span className={`hidden sm:inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_BADGE[lesson.lesson_type]}`}>
        {LESSON_TYPE_LABELS[lesson.lesson_type]}
      </span>

      {/* Duration */}
      <span className="hidden sm:block text-sm text-slate-500">
        {lesson.duration_mins ? `${lesson.duration_mins} min` : <span className="text-slate-300">—</span>}
      </span>

      {/* Preview toggle */}
      <div className="hidden sm:flex justify-center">
        <button
          onClick={onTogglePreview}
          disabled={isToggling}
          aria-label={lesson.is_preview ? 'Disable free preview' : 'Enable free preview'}
          aria-pressed={lesson.is_preview}
          className="rounded-md p-1 transition-colors disabled:opacity-50"
        >
          {isToggling ? (
            <Loader2 size={16} className="animate-spin text-slate-400" aria-hidden="true" />
          ) : lesson.is_preview ? (
            <Eye size={16} className="text-indigo-600" aria-hidden="true" />
          ) : (
            <EyeOff size={16} className="text-slate-300 hover:text-slate-500" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1">
        <button
          onClick={onEdit}
          aria-label={`Edit ${lesson.title}`}
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <Pencil size={15} aria-hidden="true" />
        </button>
        <button
          onClick={onDeleteRequest}
          aria-label={`Delete ${lesson.title}`}
          className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
