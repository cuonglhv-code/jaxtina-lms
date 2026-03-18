'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import type { Course, CourseInput } from '@/lib/validations/course'

interface CourseFormProps {
  /** When provided the form is in edit mode and PATCHes the course. */
  course?: Course
}

const LEVEL_OPTIONS = [
  'A1', 'A2', 'B1', 'B2', 'C1', 'C2',
  'IELTS 4.0', 'IELTS 4.5', 'IELTS 5.0', 'IELTS 5.5',
  'IELTS 6.0', 'IELTS 6.5', 'IELTS 7.0', 'IELTS 7.5', 'IELTS 8.0+',
]

type FieldError = Record<string, string[]>

export function CourseForm({ course }: CourseFormProps) {
  const router = useRouter()
  const isEdit = !!course

  const [form, setForm] = useState<CourseInput>({
    title:          course?.title          ?? '',
    title_vi:       course?.title_vi       ?? '',
    description:    course?.description    ?? '',
    description_vi: course?.description_vi ?? '',
    level:          course?.level          ?? '',
    is_published:   course?.is_published   ?? false,
    thumbnail_url:  course?.thumbnail_url  ?? '',
  })

  const [fieldErrors, setFieldErrors] = useState<FieldError>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function set<K extends keyof CourseInput>(key: K, value: CourseInput[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    setFieldErrors(prev => ({ ...prev, [key]: [] }))
  }

  // Sanitise: convert empty strings to null for nullable fields
  function sanitise(raw: CourseInput) {
    return {
      ...raw,
      title_vi:       raw.title_vi       || null,
      description:    raw.description    || null,
      description_vi: raw.description_vi || null,
      level:          raw.level          || null,
      thumbnail_url:  raw.thumbnail_url  || null,
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setServerError(null)
    setFieldErrors({})

    const url    = isEdit ? `/api/courses/${course!.id}` : '/api/courses'
    const method = isEdit ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitise(form)),
    })

    const json = await res.json()
    setSaving(false)

    if (!json.success) {
      // Zod flatten shape: { formErrors: string[], fieldErrors: Record<string, string[]> }
      if (json.error?.fieldErrors) {
        setFieldErrors(json.error.fieldErrors as FieldError)
      } else {
        setServerError(typeof json.error === 'string' ? json.error : 'Something went wrong.')
      }
      return
    }

    router.push('/admin/courses')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {serverError && (
        <div role="alert" className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* Title (EN) */}
      <Field label="Title (English)" error={fieldErrors.title?.[0]} required>
        <input
          type="text"
          value={form.title as string}
          onChange={e => set('title', e.target.value)}
          placeholder="e.g. IELTS 6.5 Pathway"
          className={inputCn(!!fieldErrors.title?.[0])}
          aria-required
        />
      </Field>

      {/* Title (VI) */}
      <Field label="Title (Tiếng Việt)" error={fieldErrors.title_vi?.[0]}>
        <input
          type="text"
          value={(form.title_vi as string) ?? ''}
          onChange={e => set('title_vi', e.target.value)}
          placeholder="Tiêu đề khóa học"
          className={inputCn(!!fieldErrors.title_vi?.[0])}
        />
      </Field>

      {/* Description (EN) */}
      <Field label="Description (English)" error={fieldErrors.description?.[0]}>
        <textarea
          rows={4}
          value={(form.description as string) ?? ''}
          onChange={e => set('description', e.target.value)}
          placeholder="Course overview..."
          className={inputCn(!!fieldErrors.description?.[0])}
        />
      </Field>

      {/* Description (VI) */}
      <Field label="Description (Tiếng Việt)" error={fieldErrors.description_vi?.[0]}>
        <textarea
          rows={4}
          value={(form.description_vi as string) ?? ''}
          onChange={e => set('description_vi', e.target.value)}
          placeholder="Mô tả khóa học..."
          className={inputCn(!!fieldErrors.description_vi?.[0])}
        />
      </Field>

      {/* Level */}
      <Field label="Level" error={fieldErrors.level?.[0]}>
        <input
          type="text"
          list="level-options"
          value={(form.level as string) ?? ''}
          onChange={e => set('level', e.target.value)}
          placeholder="e.g. IELTS 6.5 or B2"
          className={inputCn(!!fieldErrors.level?.[0])}
        />
        <datalist id="level-options">
          {LEVEL_OPTIONS.map(l => <option key={l} value={l} />)}
        </datalist>
      </Field>

      {/* Thumbnail URL */}
      <Field label="Thumbnail URL" error={fieldErrors.thumbnail_url?.[0]}>
        <input
          type="url"
          value={(form.thumbnail_url as string) ?? ''}
          onChange={e => set('thumbnail_url', e.target.value)}
          placeholder="https://..."
          className={inputCn(!!fieldErrors.thumbnail_url?.[0])}
        />
      </Field>

      {/* Published toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={form.is_published}
          onClick={() => set('is_published', !form.is_published)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
            form.is_published ? 'bg-indigo-600' : 'bg-slate-200'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              form.is_published ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-sm font-medium text-slate-700">
          {form.is_published ? 'Published' : 'Draft'}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        >
          {saving && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {isEdit ? 'Save changes' : 'Create course'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function inputCn(hasError: boolean) {
  return [
    'w-full rounded-lg border px-3 py-2 text-sm shadow-sm',
    'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
    hasError
      ? 'border-red-400 bg-red-50'
      : 'border-slate-300 bg-white',
  ].join(' ')
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string
  error?: string
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
      {error && (
        <p role="alert" className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}
