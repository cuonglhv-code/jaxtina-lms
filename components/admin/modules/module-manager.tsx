'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus, Pencil, Trash2, Check, X, Loader2, BookOpen, GripVertical,
} from 'lucide-react'
import { revalidateModulesPage } from '@/lib/actions/module-actions'
import type { Module } from '@/lib/validations/module'

interface ModuleManagerProps {
  courseId:       string
  courseName:     string
  initialModules: Module[]
}

type EditState = { id: string; title: string; title_vi: string }

// ── Component ────────────────────────────────────────────────────────────────

export function ModuleManager({ courseId, initialModules }: ModuleManagerProps) {
  const router   = useRouter()
  const [modules, setModules]           = useState<Module[]>(initialModules)
  const [editing, setEditing]           = useState<EditState | null>(null)
  const [editError, setEditError]       = useState<string | null>(null)
  const [savingEdit, setSavingEdit]     = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting]         = useState(false)
  const [showAdd, setShowAdd]           = useState(false)

  async function revalidate() {
    await revalidateModulesPage(courseId)
    router.refresh()
  }

  // ── Inline edit ──────────────────────────────────────────────────────────

  function startEdit(mod: Module) {
    setEditing({ id: mod.id, title: mod.title, title_vi: mod.title_vi ?? '' })
    setEditError(null)
  }

  function cancelEdit() {
    setEditing(null)
    setEditError(null)
  }

  async function saveEdit() {
    if (!editing) return
    if (!editing.title.trim()) {
      setEditError('Title is required.')
      return
    }
    setSavingEdit(true)
    setEditError(null)

    const res = await fetch(`/api/modules/${editing.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        title:    editing.title.trim(),
        title_vi: editing.title_vi.trim() || null,
      }),
    })

    const json = await res.json()
    setSavingEdit(false)

    if (!json.success) {
      setEditError(
        typeof json.error === 'string' ? json.error : 'Failed to save. Try again.'
      )
      return
    }

    setModules(prev =>
      prev.map(m => m.id === editing.id ? (json.data as Module) : m)
    )
    setEditing(null)
    await revalidate()
  }

  // ── Delete ───────────────────────────────────────────────────────────────

  async function confirmDelete() {
    if (!confirmDeleteId) return
    setDeleting(true)

    const res = await fetch(`/api/modules/${confirmDeleteId}`, { method: 'DELETE' })
    setDeleting(false)
    setConfirmDeleteId(null)

    if (res.ok) {
      setModules(prev => prev.filter(m => m.id !== confirmDeleteId))
      await revalidate()
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Add button ────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          aria-label="Add module"
        >
          <Plus size={16} aria-hidden="true" />
          Add module
        </button>
      </div>

      {/* ── Module list ───────────────────────────────────────────────── */}
      {modules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-slate-500">
          <p className="text-sm">No modules yet.</p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-3 text-sm font-medium text-indigo-600 hover:underline"
          >
            Add your first module →
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
          {modules.map((mod, idx) => (
            <ModuleRow
              key={mod.id}
              mod={mod}
              index={idx}
              courseId={courseId}
              isEditing={editing?.id === mod.id}
              editState={editing?.id === mod.id ? editing : null}
              editError={editing?.id === mod.id ? editError : null}
              savingEdit={savingEdit}
              onStartEdit={() => startEdit(mod)}
              onCancelEdit={cancelEdit}
              onSaveEdit={saveEdit}
              onEditChange={(field, value) =>
                setEditing(prev => prev ? { ...prev, [field]: value } : prev)
              }
              onDeleteRequest={() => setConfirmDeleteId(mod.id)}
            />
          ))}
        </div>
      )}

      {/* ── Delete confirmation dialog ────────────────────────────────── */}
      {confirmDeleteId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 id="delete-title" className="text-base font-semibold text-slate-900">
              Delete module?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              All lessons inside this module will also be permanently deleted.
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
                onClick={confirmDelete}
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

      {/* ── Add module modal ──────────────────────────────────────────── */}
      {showAdd && (
        <AddModuleModal
          courseId={courseId}
          nextPosition={modules.length}
          onClose={() => setShowAdd(false)}
          onAdded={(newMod) => {
            setModules(prev => [...prev, newMod])
            setShowAdd(false)
            revalidate()
          }}
        />
      )}
    </>
  )
}

// ── ModuleRow ────────────────────────────────────────────────────────────────

interface ModuleRowProps {
  mod:          Module
  index:        number
  courseId:     string
  isEditing:    boolean
  editState:    EditState | null
  editError:    string | null
  savingEdit:   boolean
  onStartEdit:  () => void
  onCancelEdit: () => void
  onSaveEdit:   () => void
  onEditChange: (field: 'title' | 'title_vi', value: string) => void
  onDeleteRequest: () => void
}

function ModuleRow({
  mod, index, courseId,
  isEditing, editState, editError, savingEdit,
  onStartEdit, onCancelEdit, onSaveEdit, onEditChange, onDeleteRequest,
}: ModuleRowProps) {
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) titleRef.current?.focus()
  }, [isEditing])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); onSaveEdit() }
    if (e.key === 'Escape') onCancelEdit()
  }

  return (
    <div className="flex items-start gap-3 px-4 py-4 group">
      {/* Position handle + number */}
      <div className="flex items-center gap-1.5 pt-0.5 text-slate-400 select-none shrink-0">
        <GripVertical size={16} aria-hidden="true" />
        <span className="w-5 text-center text-xs font-mono">{index + 1}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isEditing && editState ? (
          <div className="space-y-2">
            <input
              ref={titleRef}
              type="text"
              value={editState.title}
              onChange={e => onEditChange('title', e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Module title (English)"
              aria-label="Module title (English)"
              className={`w-full rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                editError ? 'border-red-400 bg-red-50' : 'border-slate-300'
              }`}
            />
            <input
              type="text"
              value={editState.title_vi}
              onChange={e => onEditChange('title_vi', e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tên module (Tiếng Việt)"
              aria-label="Module title (Vietnamese)"
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {editError && (
              <p role="alert" className="text-xs text-red-600">{editError}</p>
            )}
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-slate-900">{mod.title}</p>
            {mod.title_vi && (
              <p className="text-xs text-slate-500 mt-0.5">{mod.title_vi}</p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {isEditing ? (
          <>
            <button
              onClick={onSaveEdit}
              disabled={savingEdit}
              aria-label="Save module"
              className="rounded-md p-1.5 text-green-600 hover:bg-green-50 disabled:opacity-60 transition-colors"
            >
              {savingEdit
                ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                : <Check size={16} aria-hidden="true" />
              }
            </button>
            <button
              onClick={onCancelEdit}
              disabled={savingEdit}
              aria-label="Cancel editing"
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-60 transition-colors"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </>
        ) : (
          <>
            <Link
              href={`/admin/courses/${courseId}/modules/${mod.id}/lessons`}
              aria-label={`Manage lessons for ${mod.title}`}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
            >
              <BookOpen size={16} aria-hidden="true" />
            </Link>
            <button
              onClick={onStartEdit}
              aria-label={`Edit ${mod.title}`}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <Pencil size={16} aria-hidden="true" />
            </button>
            <button
              onClick={onDeleteRequest}
              aria-label={`Delete ${mod.title}`}
              className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── AddModuleModal ────────────────────────────────────────────────────────────

interface AddModuleModalProps {
  courseId:     string
  nextPosition: number
  onClose:      () => void
  onAdded:      (mod: Module) => void
}

function AddModuleModal({ courseId, nextPosition, onClose, onAdded }: AddModuleModalProps) {
  const [title, setTitle]       = useState('')
  const [titleVi, setTitleVi]   = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => { titleRef.current?.focus() }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required.'); return }
    setSaving(true)
    setError(null)

    const res = await fetch(`/api/courses/${courseId}/modules`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        title:    title.trim(),
        title_vi: titleVi.trim() || null,
        position: nextPosition,
      }),
    })

    const json = await res.json()
    setSaving(false)

    if (!json.success) {
      const msg = json.error?.fieldErrors?.title?.[0]
        ?? (typeof json.error === 'string' ? json.error : 'Failed to create module.')
      setError(msg)
      return
    }

    onAdded(json.data as Module)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 id="add-modal-title" className="text-base font-semibold text-slate-900 mb-4">
          Add module
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title EN */}
          <div className="space-y-1.5">
            <label htmlFor="mod-title" className="block text-sm font-medium text-slate-700">
              Title (English)<span className="ml-1 text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              ref={titleRef}
              id="mod-title"
              type="text"
              value={title}
              onChange={e => { setTitle(e.target.value); setError(null) }}
              placeholder="e.g. Introduction to IELTS Writing"
              className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                error ? 'border-red-400 bg-red-50' : 'border-slate-300'
              }`}
            />
            {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
          </div>

          {/* Title VI */}
          <div className="space-y-1.5">
            <label htmlFor="mod-title-vi" className="block text-sm font-medium text-slate-700">
              Title (Tiếng Việt)
            </label>
            <input
              id="mod-title-vi"
              type="text"
              value={titleVi}
              onChange={e => setTitleVi(e.target.value)}
              placeholder="Tên module"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {saving && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              Add module
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
