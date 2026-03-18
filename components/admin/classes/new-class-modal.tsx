'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Loader2 } from 'lucide-react'
import type { ClassInput, ClassRow } from '@/lib/validations/class'

interface SelectUser   { id: string; full_name: string }
interface SelectCourse { id: string; title: string }
interface SelectBranch { id: string; name: string; city: string }

interface NewClassModalProps {
  onClose:   () => void
  onCreated: (row: ClassRow) => void
}

type FieldErrors = Record<string, string[]>

const EMPTY: ClassInput = {
  name:         '',
  course_id:    '',
  branch_id:    null,
  teacher_id:   null,
  starts_on:    '',
  ends_on:      null,
  max_learners: null,
}

export function NewClassModal({ onClose, onCreated }: NewClassModalProps) {
  const nameRef = useRef<HTMLInputElement>(null)

  // ── Select-data state ──────────────────────────────────────────────────
  const [courses,  setCourses]  = useState<SelectCourse[]>([])
  const [branches, setBranches] = useState<SelectBranch[]>([])
  const [teachers, setTeachers] = useState<SelectUser[]>([])
  const [loadingSelects, setLoadingSelects] = useState(true)

  // ── Form state ──────────────────────────────────────────────────────────
  const [form, setForm]               = useState<ClassInput>(EMPTY)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving]           = useState(false)

  // ── Load select options on mount ────────────────────────────────────────
  useEffect(() => {
    nameRef.current?.focus()

    async function load() {
      const [coursesRes, branchesRes, teachersRes] = await Promise.all([
        fetch('/api/courses?published=true').then(r => r.json()),
        fetch('/api/branches').then(r => r.json()),
        fetch('/api/users?role=teacher').then(r => r.json()),
      ])
      if (coursesRes.success)  setCourses(coursesRes.data  ?? [])
      if (branchesRes.success) setBranches(branchesRes.data ?? [])
      if (teachersRes.success) setTeachers(teachersRes.data ?? [])
      setLoadingSelects(false)
    }

    load()
  }, [])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function set<K extends keyof ClassInput>(key: K, value: ClassInput[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    setFieldErrors(prev => ({ ...prev, [key]: [] }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setServerError(null)
    setFieldErrors({})

    const payload = {
      ...form,
      branch_id:    form.branch_id    || null,
      teacher_id:   form.teacher_id   || null,
      ends_on:      form.ends_on      || null,
      max_learners: form.max_learners ?? null,
    }

    const res = await fetch('/api/classes', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
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

    onCreated(json.data as ClassRow)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-class-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
            <h2 id="new-class-title" className="text-base font-semibold text-slate-900">
              Create class
            </h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          {/* Body */}
          <form
            id="new-class-form"
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
          >
            {serverError && (
              <div role="alert" className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {serverError}
              </div>
            )}

            {/* Class name */}
            <Field label="Class name" error={fieldErrors.name?.[0]} required>
              <input
                ref={nameRef}
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. IELTS 6.5 — Hanoi — Jan 2026"
                className={inputCn(!!fieldErrors.name?.[0])}
                aria-required
              />
            </Field>

            {/* Course */}
            <Field label="Course" error={fieldErrors.course_id?.[0]} required>
              <select
                value={form.course_id}
                onChange={e => set('course_id', e.target.value)}
                disabled={loadingSelects}
                className={selectCn(!!fieldErrors.course_id?.[0])}
                aria-required
              >
                <option value="">
                  {loadingSelects ? 'Loading courses…' : 'Select a course'}
                </option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </Field>

            {/* Branch */}
            <Field label="Branch" error={fieldErrors.branch_id?.[0]}>
              <select
                value={form.branch_id ?? ''}
                onChange={e => set('branch_id', e.target.value || null)}
                disabled={loadingSelects}
                className={selectCn(!!fieldErrors.branch_id?.[0])}
              >
                <option value="">
                  {loadingSelects ? 'Loading branches…' : 'No branch (online)'}
                </option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name} · {b.city}</option>
                ))}
              </select>
            </Field>

            {/* Teacher */}
            <Field label="Teacher" error={fieldErrors.teacher_id?.[0]}>
              <select
                value={form.teacher_id ?? ''}
                onChange={e => set('teacher_id', e.target.value || null)}
                disabled={loadingSelects}
                className={selectCn(!!fieldErrors.teacher_id?.[0])}
              >
                <option value="">
                  {loadingSelects ? 'Loading teachers…' : 'Unassigned'}
                </option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>
            </Field>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start date" error={fieldErrors.starts_on?.[0]} required>
                <input
                  type="date"
                  value={form.starts_on}
                  onChange={e => set('starts_on', e.target.value)}
                  className={inputCn(!!fieldErrors.starts_on?.[0])}
                  aria-required
                />
              </Field>
              <Field label="End date" error={fieldErrors.ends_on?.[0]}>
                <input
                  type="date"
                  value={form.ends_on ?? ''}
                  onChange={e => set('ends_on', e.target.value || null)}
                  className={inputCn(!!fieldErrors.ends_on?.[0])}
                />
              </Field>
            </div>

            {/* Max learners */}
            <Field label="Max learners" error={fieldErrors.max_learners?.[0]}>
              <input
                type="number"
                min={1}
                value={form.max_learners ?? ''}
                onChange={e => set('max_learners', e.target.value ? Number(e.target.value) : null)}
                placeholder="No limit"
                className={inputCn(!!fieldErrors.max_learners?.[0])}
              />
            </Field>
          </form>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 shrink-0">
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
              form="new-class-form"
              disabled={saving || loadingSelects}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {saving && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
              Create class
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function Field({
  label, error, required, children,
}: {
  label:    string
  error?:   string
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
    'disabled:bg-slate-50 disabled:text-slate-400',
  ].join(' ')
}
