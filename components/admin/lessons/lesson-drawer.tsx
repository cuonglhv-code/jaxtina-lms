'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Loader2 } from 'lucide-react'
import {
  LESSON_TYPES,
  LESSON_TYPE_LABELS,
  IELTS_TASKS,
  IELTS_TASK_LABELS,
  type Lesson,
  type LessonInput,
  type LessonType,
  type IeltsTask,
} from '@/lib/validations/lesson'

interface LessonDrawerProps {
  moduleId:     string
  lesson?:      Lesson          // undefined = add mode, defined = edit mode
  nextPosition: number
  onClose:      () => void
  onSaved:      (lesson: Lesson) => void
}

type FieldErrors = Record<string, string[]>

// ── Helpers ──────────────────────────────────────────────────────────────────

function emptyForm(lesson?: Lesson): Omit<LessonInput, 'ielts_task_type'> & { ielts_task_type: IeltsTask | '' } {
  return {
    title:           lesson?.title           ?? '',
    title_vi:        lesson?.title_vi        ?? '',
    lesson_type:     lesson?.lesson_type     ?? 'video',
    content_url:     lesson?.content_url     ?? '',
    content_body:    lesson?.content_body    ?? '',
    duration_mins:   lesson?.duration_mins   ?? null,
    position:        lesson?.position        ?? 0,
    is_preview:      lesson?.is_preview      ?? false,
    ielts_task_type: (lesson?.ielts_task_type ?? '') as IeltsTask | '',  // '' used as empty sentinel
  }
}

function sanitise(raw: ReturnType<typeof emptyForm>, nextPosition: number, isEdit: boolean) {
  return {
    title:           raw.title.trim(),
    title_vi:        raw.title_vi?.trim()    || null,
    lesson_type:     raw.lesson_type,
    content_url:     raw.content_url?.trim() || null,
    content_body:    raw.content_body?.trim() || null,
    duration_mins:   raw.duration_mins ?? null,
    position:        isEdit ? raw.position : nextPosition,
    is_preview:      raw.is_preview,
    ielts_task_type: raw.ielts_task_type || null,
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function LessonDrawer({
  moduleId,
  lesson,
  nextPosition,
  onClose,
  onSaved,
}: LessonDrawerProps) {
  const isEdit   = !!lesson
  const titleRef = useRef<HTMLInputElement>(null)

  const [form, setForm]             = useState(() => emptyForm(lesson))
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving]           = useState(false)

  useEffect(() => { titleRef.current?.focus() }, [])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // ── Derived visibility ───────────────────────────────────────────────────
  const lessonType: LessonType     = form.lesson_type
  const ieltsTask:  IeltsTask | '' = form.ielts_task_type

  const showContentUrl  = lessonType === 'video' || lessonType === 'live'
  const showContentBody = lessonType === 'reading' || lessonType === 'exercise'
  const showIeltsFields = lessonType === 'ielts_writing'
  const showImageUrl    = showIeltsFields && ieltsTask === 'task1'

  const contentUrlLabel =
    lessonType === 'live' ? 'Session / Meeting URL' : 'Video URL'

  // ── Setters ──────────────────────────────────────────────────────────────

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    setFieldErrors(prev => ({ ...prev, [key]: [] }))
  }

  // Tab → 2 spaces in textarea
  function handleContentBodyKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Tab') return
    e.preventDefault()
    const el    = e.currentTarget
    const start = el.selectionStart
    const end   = el.selectionEnd
    const next  = el.value.slice(0, start) + '  ' + el.value.slice(end)
    set('content_body', next)
    requestAnimationFrame(() => {
      el.selectionStart = start + 2
      el.selectionEnd   = start + 2
    })
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setServerError(null)
    setFieldErrors({})

    const url    = isEdit ? `/api/lessons/${lesson!.id}` : `/api/modules/${moduleId}/lessons`
    const method = isEdit ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(sanitise(form, nextPosition, isEdit)),
    })

    const json = await res.json()
    setSaving(false)

    if (!json.success) {
      if (json.error?.fieldErrors) {
        setFieldErrors(json.error.fieldErrors as FieldErrors)
      } else {
        setServerError(typeof json.error === 'string' ? json.error : 'Something went wrong.')
      }
      return
    }

    onSaved(json.data as Lesson)
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl sm:w-[520px]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 shrink-0">
          <h2 id="drawer-title" className="text-base font-semibold text-slate-900">
            {isEdit ? 'Edit lesson' : 'Add lesson'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close drawer"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable form body */}
        <form
          id="lesson-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
        >
          {serverError && (
            <div role="alert" className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          {/* Title EN */}
          <Field label="Title (English)" error={fieldErrors.title?.[0]} required>
            <input
              ref={titleRef}
              type="text"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Introduction to Task 2 Essays"
              className={inputCn(!!fieldErrors.title?.[0])}
              aria-required
            />
          </Field>

          {/* Title VI */}
          <Field label="Title (Tiếng Việt)" error={fieldErrors.title_vi?.[0]}>
            <input
              type="text"
              value={form.title_vi ?? ''}
              onChange={e => set('title_vi', e.target.value)}
              placeholder="Tên bài học"
              className={inputCn(!!fieldErrors.title_vi?.[0])}
            />
          </Field>

          {/* Lesson type */}
          <Field label="Lesson type" error={fieldErrors.lesson_type?.[0]} required>
            <select
              value={form.lesson_type}
              onChange={e => set('lesson_type', e.target.value as LessonType)}
              className={selectCn(!!fieldErrors.lesson_type?.[0])}
              aria-required
            >
              {LESSON_TYPES.map(t => (
                <option key={t} value={t}>{LESSON_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </Field>

          {/* ── Conditional: Video / Live URL ─────────────────────────── */}
          {showContentUrl && (
            <Field label={contentUrlLabel} error={fieldErrors.content_url?.[0]}>
              <input
                type="url"
                value={form.content_url ?? ''}
                onChange={e => set('content_url', e.target.value)}
                placeholder="https://"
                className={inputCn(!!fieldErrors.content_url?.[0])}
              />
            </Field>
          )}

          {/* ── Conditional: Reading / Exercise body ─────────────────── */}
          {showContentBody && (
            <Field label="Content (Markdown)" error={fieldErrors.content_body?.[0]}>
              <textarea
                rows={10}
                value={form.content_body ?? ''}
                onChange={e => set('content_body', e.target.value)}
                onKeyDown={handleContentBodyKeyDown}
                placeholder="Write content here... (Tab inserts 2 spaces)"
                spellCheck={false}
                className={[
                  inputCn(!!fieldErrors.content_body?.[0]),
                  'font-mono text-xs resize-y',
                ].join(' ')}
              />
            </Field>
          )}

          {/* ── Conditional: IELTS Writing ───────────────────────────── */}
          {showIeltsFields && (
            <>
              <Field label="IELTS Task" error={fieldErrors.ielts_task_type?.[0]} required>
                <select
                  value={form.ielts_task_type}
                  onChange={e => set('ielts_task_type', e.target.value as IeltsTask | '')}
                  className={selectCn(!!fieldErrors.ielts_task_type?.[0])}
                  aria-required
                >
                  <option value="">Select task…</option>
                  {IELTS_TASKS.map(t => (
                    <option key={t} value={t}>{IELTS_TASK_LABELS[t]}</option>
                  ))}
                </select>
              </Field>

              {/* Task 1 only: image URL */}
              {showImageUrl && (
                <Field
                  label="Task 1 Image URL"
                  error={fieldErrors.content_url?.[0]}
                  hint="Upload to Supabase Storage and paste the public URL"
                >
                  <input
                    type="url"
                    value={form.content_url ?? ''}
                    onChange={e => set('content_url', e.target.value)}
                    placeholder="https://..."
                    className={inputCn(!!fieldErrors.content_url?.[0])}
                  />
                </Field>
              )}
            </>
          )}

          {/* Duration */}
          <Field label="Duration (minutes)" error={fieldErrors.duration_mins?.[0]}>
            <input
              type="number"
              min={1}
              value={form.duration_mins ?? ''}
              onChange={e => set('duration_mins', e.target.value ? Number(e.target.value) : null)}
              placeholder="e.g. 20"
              className={inputCn(!!fieldErrors.duration_mins?.[0])}
            />
          </Field>

          {/* is_preview toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={form.is_preview}
              onClick={() => set('is_preview', !form.is_preview)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                form.is_preview ? 'bg-indigo-600' : 'bg-slate-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  form.is_preview ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <div>
              <p className="text-sm font-medium text-slate-700">Free preview</p>
              <p className="text-xs text-slate-500">Learners can access without enrolling</p>
            </div>
          </div>
        </form>

        {/* Sticky footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="lesson-form"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {saving && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
            {isEdit ? 'Save changes' : 'Add lesson'}
          </button>
        </div>
      </aside>
    </>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Field({
  label, error, hint, required, children,
}: {
  label:    string
  error?:   string
  hint?:    string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint  && !error && <p className="text-xs text-slate-400">{hint}</p>}
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

function inputCn(hasError: boolean) {
  return [
    'w-full rounded-lg border px-3 py-2 text-sm shadow-sm',
    'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
    hasError ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white',
  ].join(' ')
}

function selectCn(hasError: boolean) {
  return [
    'w-full rounded-lg border px-3 py-2 text-sm shadow-sm appearance-none',
    'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
    hasError ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white',
  ].join(' ')
}
