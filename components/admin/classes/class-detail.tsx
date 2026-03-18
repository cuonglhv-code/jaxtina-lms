'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Pencil, Check, X, Loader2, UserPlus, Trash2, ChevronDown,
} from 'lucide-react'
import type { ClassRow, ClassUpdateInput } from '@/lib/validations/class'
import {
  ENROLMENT_STATUSES, STATUS_LABELS, STATUS_BADGE,
  type Enrolment, type EnrolmentStatus,
} from '@/lib/validations/enrolment'

// ── Shared helpers ────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function inputCn(err?: boolean) {
  return [
    'w-full rounded-lg border px-3 py-2 text-sm shadow-sm',
    'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
    err ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white',
  ].join(' ')
}

// ── Types for select options ──────────────────────────────────────────────────

interface CourseOption  { id: string; title: string }
interface BranchOption  { id: string; name: string; city: string }
interface TeacherOption { id: string; full_name: string }
interface LearnerOption { id: string; full_name: string; email: string | null }

// ── Root component ────────────────────────────────────────────────────────────

export interface ClassDetailProps {
  initialClass:      ClassRow
  initialEnrolments: Enrolment[]
}

export function ClassDetail({ initialClass, initialEnrolments }: ClassDetailProps) {
  const router = useRouter()

  const [cls, setCls]             = useState<ClassRow>(initialClass)
  const [enrolments, setEnrolments] = useState<Enrolment[]>(initialEnrolments)

  const enrolCount = enrolments.length
  const atCapacity = cls.max_learners != null && enrolCount >= cls.max_learners

  // ── Enrolment handlers ────────────────────────────────────────────────────

  async function handleStatusChange(enrolmentId: string, newStatus: EnrolmentStatus) {
    const prev = enrolments.find(e => e.id === enrolmentId)
    if (!prev) return

    // Optimistic
    setEnrolments(es => es.map(e => e.id === enrolmentId ? { ...e, status: newStatus } : e))

    const res = await fetch(`/api/enrolments/${enrolmentId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: newStatus }),
    })
    if (!res.ok) {
      // Revert
      setEnrolments(es => es.map(e => e.id === enrolmentId ? { ...e, status: prev.status } : e))
    }
  }

  async function handleRemove(enrolmentId: string) {
    const res = await fetch(`/api/enrolments/${enrolmentId}`, { method: 'DELETE' })
    if (res.ok) {
      setEnrolments(es => es.filter(e => e.id !== enrolmentId))
      // Optimistically update the embedded count on the class object
      setCls(c => ({
        ...c,
        enrolments: [{ count: Math.max(0, (c.enrolments?.[0]?.count ?? 1) - 1) }],
      }))
    }
  }

  function handleEnrolled(enrolment: Enrolment) {
    setEnrolments(es => [enrolment, ...es])
    setCls(c => ({
      ...c,
      enrolments: [{ count: (c.enrolments?.[0]?.count ?? 0) + 1 }],
    }))
    router.refresh()
  }

  function handleClassSaved(updated: ClassRow) {
    setCls(updated)
    router.refresh()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
      {/* ── Left: class details ──────────────────────────────────── */}
      <DetailsPanel cls={cls} onSaved={handleClassSaved} />

      {/* ── Right: enrolments ────────────────────────────────────── */}
      <EnrolmentsPanel
        classId={cls.id}
        enrolments={enrolments}
        enrolCount={enrolCount}
        maxLearners={cls.max_learners}
        atCapacity={atCapacity}
        onEnrolled={handleEnrolled}
        onStatusChange={handleStatusChange}
        onRemove={handleRemove}
      />
    </div>
  )
}

// ── DetailsPanel ─────────────────────────────────────────────────────────────

interface DetailsPanelProps {
  cls:     ClassRow
  onSaved: (updated: ClassRow) => void
}

function DetailsPanel({ cls, onSaved }: DetailsPanelProps) {
  const [isEditing, setIsEditing]     = useState(false)
  const [loadingOpts, setLoadingOpts] = useState(false)
  const [saving, setSaving]           = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  const [form, setForm] = useState<ClassUpdateInput>({})

  const [courses,  setCourses]  = useState<CourseOption[]>([])
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [teachers, setTeachers] = useState<TeacherOption[]>([])

  function setField<K extends keyof ClassUpdateInput>(k: K, v: ClassUpdateInput[K]) {
    setForm(p => ({ ...p, [k]: v }))
    setFieldErrors(p => ({ ...p, [k]: [] }))
  }

  async function startEdit() {
    setForm({
      name:         cls.name,
      course_id:    cls.course_id,
      branch_id:    cls.branch_id,
      teacher_id:   cls.teacher_id,
      starts_on:    cls.starts_on,
      ends_on:      cls.ends_on,
      max_learners: cls.max_learners,
    })
    setIsEditing(true)
    setServerError(null)
    setFieldErrors({})

    setLoadingOpts(true)
    const [cRes, bRes, tRes] = await Promise.all([
      fetch('/api/courses?published=true').then(r => r.json()),
      fetch('/api/branches').then(r => r.json()),
      fetch('/api/users?role=teacher').then(r => r.json()),
    ])
    if (cRes.success)  setCourses(cRes.data  ?? [])
    if (bRes.success)  setBranches(bRes.data ?? [])
    if (tRes.success)  setTeachers(tRes.data ?? [])
    setLoadingOpts(false)
  }

  function cancelEdit() {
    setIsEditing(false)
    setServerError(null)
    setFieldErrors({})
  }

  async function saveEdit() {
    setSaving(true)
    setServerError(null)

    const res = await fetch(`/api/classes/${cls.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(form),
    })

    const json = await res.json()
    setSaving(false)

    if (!json.success) {
      if (json.error?.fieldErrors) setFieldErrors(json.error.fieldErrors)
      else setServerError(typeof json.error === 'string' ? json.error : 'Save failed.')
      return
    }

    setIsEditing(false)
    onSaved(json.data as ClassRow)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            {isEditing ? 'Edit details' : cls.name}
          </h2>
          {!isEditing && (
            <p className="text-xs text-slate-500 mt-0.5">
              {cls.is_active ? 'Active class' : 'Inactive class'}
            </p>
          )}
        </div>
        {!isEditing && (
          <button
            onClick={startEdit}
            aria-label="Edit class details"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Pencil size={13} aria-hidden="true" />
            Edit
          </button>
        )}
      </div>

      {serverError && (
        <div role="alert" className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {isEditing ? (
        /* ── Edit mode ── */
        <div className="space-y-4">
          {loadingOpts && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 size={13} className="animate-spin" aria-hidden="true" />
              Loading options…
            </div>
          )}

          <EditField label="Class name" error={fieldErrors.name?.[0]} required>
            <input
              type="text"
              value={(form.name ?? '') as string}
              onChange={e => setField('name', e.target.value)}
              className={inputCn(!!fieldErrors.name?.[0])}
            />
          </EditField>

          <EditField label="Course" error={fieldErrors.course_id?.[0]} required>
            <select
              value={(form.course_id ?? '') as string}
              onChange={e => setField('course_id', e.target.value)}
              disabled={loadingOpts}
              className={inputCn(!!fieldErrors.course_id?.[0])}
            >
              <option value="">Select course</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </EditField>

          <EditField label="Branch" error={fieldErrors.branch_id?.[0]}>
            <select
              value={(form.branch_id ?? '') as string}
              onChange={e => setField('branch_id', e.target.value || null)}
              disabled={loadingOpts}
              className={inputCn(!!fieldErrors.branch_id?.[0])}
            >
              <option value="">Online / no branch</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name} · {b.city}</option>)}
            </select>
          </EditField>

          <EditField label="Teacher" error={fieldErrors.teacher_id?.[0]}>
            <select
              value={(form.teacher_id ?? '') as string}
              onChange={e => setField('teacher_id', e.target.value || null)}
              disabled={loadingOpts}
              className={inputCn(!!fieldErrors.teacher_id?.[0])}
            >
              <option value="">Unassigned</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </EditField>

          <div className="grid grid-cols-2 gap-3">
            <EditField label="Start date" error={fieldErrors.starts_on?.[0]} required>
              <input
                type="date"
                value={(form.starts_on ?? '') as string}
                onChange={e => setField('starts_on', e.target.value)}
                className={inputCn(!!fieldErrors.starts_on?.[0])}
              />
            </EditField>
            <EditField label="End date" error={fieldErrors.ends_on?.[0]}>
              <input
                type="date"
                value={(form.ends_on ?? '') as string}
                onChange={e => setField('ends_on', e.target.value || null)}
                className={inputCn(!!fieldErrors.ends_on?.[0])}
              />
            </EditField>
          </div>

          <EditField label="Max learners" error={fieldErrors.max_learners?.[0]}>
            <input
              type="number"
              min={1}
              value={(form.max_learners ?? '') as string | number}
              onChange={e => setField('max_learners', e.target.value ? Number(e.target.value) : null)}
              placeholder="No limit"
              className={inputCn(!!fieldErrors.max_learners?.[0])}
            />
          </EditField>

          {/* Save / Cancel */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={saveEdit}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {saving
                ? <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                : <Check size={14} aria-hidden="true" />
              }
              Save
            </button>
            <button
              onClick={cancelEdit}
              disabled={saving}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition-colors"
            >
              <X size={14} className="inline mr-1" aria-hidden="true" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* ── Display mode ── */
        <dl className="space-y-3 text-sm">
          <DetailItem label="Course">{cls.course?.title ?? '—'}</DetailItem>
          <DetailItem label="Branch">
            {cls.branch ? `${cls.branch.name} · ${cls.branch.city}` : 'Online'}
          </DetailItem>
          <DetailItem label="Teacher">{cls.teacher?.full_name ?? 'Unassigned'}</DetailItem>
          <DetailItem label="Starts">{fmtDate(cls.starts_on)}</DetailItem>
          <DetailItem label="Ends">{fmtDate(cls.ends_on)}</DetailItem>
          <DetailItem label="Capacity">
            {cls.max_learners != null ? cls.max_learners : 'No limit'}
          </DetailItem>
        </dl>
      )}
    </div>
  )
}

function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500 shrink-0">{label}</dt>
      <dd className="text-slate-900 text-right">{children}</dd>
    </div>
  )
}

function EditField({
  label, error, required, children,
}: {
  label: string; error?: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-slate-600">
        {label}{required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}
      </label>
      {children}
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

// ── EnrolmentsPanel ───────────────────────────────────────────────────────────

interface EnrolmentsPanelProps {
  classId:       string
  enrolments:    Enrolment[]
  enrolCount:    number
  maxLearners:   number | null
  atCapacity:    boolean
  onEnrolled:    (e: Enrolment) => void
  onStatusChange:(id: string, status: EnrolmentStatus) => void
  onRemove:      (id: string) => void
}

function EnrolmentsPanel({
  classId, enrolments, enrolCount, maxLearners, atCapacity,
  onEnrolled, onStatusChange, onRemove,
}: EnrolmentsPanelProps) {
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [removing, setRemoving]               = useState(false)

  async function confirmRemove() {
    if (!confirmRemoveId) return
    setRemoving(true)
    await onRemove(confirmRemoveId)
    setRemoving(false)
    setConfirmRemoveId(null)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Enrolled learners</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            <span className="font-medium text-slate-700">{enrolCount}</span>
            {maxLearners != null && (
              <> / {maxLearners} enrolled{atCapacity && (
                <span className="ml-1.5 inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                  Full
                </span>
              )}</>
            )}
            {maxLearners == null && ' enrolled'}
          </p>
        </div>
      </div>

      {/* Learner search / add */}
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
        <LearnerSearch
          classId={classId}
          atCapacity={atCapacity}
          enrolledIds={new Set(enrolments.map(e => e.learner_id))}
          onEnrolled={onEnrolled}
        />
      </div>

      {/* Table */}
      {enrolments.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-500">
          No learners enrolled yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <tr>
                <th scope="col" className="px-5 py-3 text-left font-semibold">Learner</th>
                <th scope="col" className="hidden md:table-cell px-4 py-3 text-left font-semibold">Enrolled</th>
                <th scope="col" className="px-4 py-3 text-left font-semibold">Status</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enrolments.map(e => (
                <EnrolmentRow
                  key={e.id}
                  enrolment={e}
                  onStatusChange={onStatusChange}
                  onRemoveRequest={() => setConfirmRemoveId(e.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm remove dialog */}
      {confirmRemoveId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-enrolment-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 id="remove-enrolment-title" className="text-base font-semibold text-slate-900">
              Remove learner?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              The learner will lose access to this class. Their submissions and progress will be retained.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirmRemoveId(null)}
                disabled={removing}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemove}
                disabled={removing}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {removing && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── EnrolmentRow ──────────────────────────────────────────────────────────────

function EnrolmentRow({
  enrolment, onStatusChange, onRemoveRequest,
}: {
  enrolment:      Enrolment
  onStatusChange: (id: string, status: EnrolmentStatus) => void
  onRemoveRequest:() => void
}) {
  const [busy, setBusy] = useState(false)

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setBusy(true)
    await onStatusChange(enrolment.id, e.target.value as EnrolmentStatus)
    setBusy(false)
  }

  const fmtEnrolled = new Date(enrolment.enrolled_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-5 py-3.5">
        <p className="font-medium text-slate-900">{enrolment.learner?.full_name ?? '—'}</p>
        {enrolment.learner?.email && (
          <p className="text-xs text-slate-400 mt-0.5">{enrolment.learner.email}</p>
        )}
      </td>

      <td className="hidden md:table-cell px-4 py-3.5 text-slate-500 whitespace-nowrap">
        {fmtEnrolled}
      </td>

      <td className="px-4 py-3.5">
        <div className="relative flex items-center gap-1.5">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[enrolment.status]}`}
          >
            {STATUS_LABELS[enrolment.status]}
          </span>
          <div className="relative">
            <select
              value={enrolment.status}
              onChange={handleStatusChange}
              disabled={busy}
              aria-label={`Change status for ${enrolment.learner?.full_name ?? 'learner'}`}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            >
              {ENROLMENT_STATUSES.map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
            {busy
              ? <Loader2 size={13} className="animate-spin text-slate-400" aria-hidden="true" />
              : <ChevronDown size={13} className="text-slate-400 cursor-pointer" aria-hidden="true" />
            }
          </div>
        </div>
      </td>

      <td className="px-4 py-3.5 text-right">
        <button
          onClick={onRemoveRequest}
          aria-label={`Remove ${enrolment.learner?.full_name ?? 'learner'}`}
          className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </td>
    </tr>
  )
}

// ── LearnerSearch ─────────────────────────────────────────────────────────────

interface LearnerSearchProps {
  classId:     string
  atCapacity:  boolean
  enrolledIds: Set<string>
  onEnrolled:  (e: Enrolment) => void
}

function LearnerSearch({ classId, atCapacity, enrolledIds, onEnrolled }: LearnerSearchProps) {
  const [query, setQuery]         = useState('')
  const [results, setResults]     = useState<LearnerOption[]>([])
  const [searching, setSearching] = useState(false)
  const [enrolling, setEnrolling] = useState<string | null>(null)
  const [enrolError, setEnrolError] = useState<string | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setShowDropdown(false)
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      const res = await fetch(
        `/api/users?role=learner&q=${encodeURIComponent(query.trim())}`
      )
      const json = await res.json()
      setSearching(false)
      if (json.success) {
        // Exclude already-enrolled learners
        setResults(
          (json.data as LearnerOption[]).filter(l => !enrolledIds.has(l.id))
        )
        setShowDropdown(true)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, enrolledIds])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleEnrol(learner: LearnerOption) {
    setEnrolling(learner.id)
    setEnrolError(null)
    setShowDropdown(false)
    setQuery('')

    const res = await fetch(`/api/classes/${classId}/enrolments`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ learner_id: learner.id }),
    })

    const json = await res.json()
    setEnrolling(null)

    if (!json.success) {
      setEnrolError(
        typeof json.error === 'string'
          ? json.error
          : 'Failed to enrol learner. Please try again.'
      )
      return
    }

    onEnrolled(json.data as Enrolment)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <UserPlus
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            disabled={atCapacity}
            placeholder={atCapacity ? 'Class is at capacity' : 'Search learners to enrol…'}
            aria-label="Search learners to enrol"
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            className={[
              'w-full rounded-lg border px-3 py-2 pl-9 text-sm',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
              atCapacity
                ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'border-slate-300 bg-white',
            ].join(' ')}
          />
          {searching && (
            <Loader2
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
              aria-hidden="true"
            />
          )}
        </div>

        {enrolling && (
          <Loader2 size={16} className="animate-spin text-indigo-600 shrink-0" aria-hidden="true" />
        )}
      </div>

      {enrolError && (
        <p role="alert" className="mt-1.5 text-xs text-red-600">{enrolError}</p>
      )}

      {/* Results dropdown */}
      {showDropdown && results.length > 0 && (
        <ul
          role="listbox"
          aria-label="Learner search results"
          className="absolute z-30 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-56 overflow-y-auto"
        >
          {results.map(learner => (
            <li key={learner.id} role="option" aria-selected="false">
              <button
                type="button"
                onClick={() => handleEnrol(learner)}
                disabled={!!enrolling}
                className="flex w-full items-start gap-2 px-4 py-2.5 text-left hover:bg-indigo-50 transition-colors disabled:opacity-50"
              >
                <span className="font-medium text-slate-900 text-sm">{learner.full_name}</span>
                {learner.email && (
                  <span className="text-xs text-slate-400 mt-0.5">{learner.email}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {showDropdown && results.length === 0 && !searching && query.trim() && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg px-4 py-3 text-sm text-slate-500">
          No learners found for &quot;{query}&quot;
        </div>
      )}
    </div>
  )
}
