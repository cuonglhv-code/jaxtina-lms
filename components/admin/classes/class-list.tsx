'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { NewClassModal } from './new-class-modal'
import type { ClassRow } from '@/lib/validations/class'

interface ClassListProps {
  initialClasses: ClassRow[]
}

// ── Date formatting ──────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function enrolCount(row: ClassRow): number {
  return row.enrolments?.[0]?.count ?? 0
}

// ── Component ────────────────────────────────────────────────────────────────

export function ClassList({ initialClasses }: ClassListProps) {
  const router = useRouter()
  const [classes, setClasses]     = useState<ClassRow[]>(initialClasses)
  const [showModal, setShowModal] = useState(false)

  function handleCreated(row: ClassRow) {
    setClasses(prev => [row, ...prev])
    setShowModal(false)
    router.refresh()
  }

  function handleRowClick(id: string) {
    router.push(`/admin/classes/${id}`)
  }

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Classes</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {classes.length} class{classes.length !== 1 ? 'es' : ''} total
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          aria-label="Create new class"
        >
          <Plus size={16} aria-hidden="true" />
          New class
        </button>
      </div>

      {/* ── Table ───────────────────────────────────────────────────── */}
      {classes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-slate-500">
          <p className="text-sm">No classes yet.</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-3 text-sm font-medium text-indigo-600 hover:underline"
          >
            Create your first class →
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Name', 'Course', 'Branch', 'Teacher', 'Learners', 'Dates', 'Status'].map(h => (
                  <th
                    key={h}
                    scope="col"
                    className={`px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide ${
                      ['Branch', 'Teacher', 'Dates'].includes(h) ? 'hidden md:table-cell' : ''
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classes.map(cls => (
                <ClassRow
                  key={cls.id}
                  cls={cls}
                  onClick={() => handleRowClick(cls.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal ───────────────────────────────────────────────────── */}
      {showModal && (
        <NewClassModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  )
}

// ── ClassRow ─────────────────────────────────────────────────────────────────

function ClassRow({ cls, onClick }: { cls: ClassRow; onClick: () => void }) {
  const count = enrolCount(cls)

  return (
    <tr
      onClick={onClick}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick()}
      tabIndex={0}
      role="button"
      aria-label={`View class ${cls.name}`}
      className="hover:bg-slate-50 cursor-pointer transition-colors focus:outline-none focus:bg-slate-50"
    >
      {/* Name */}
      <td className="px-4 py-3.5">
        <p className="font-medium text-slate-900">{cls.name}</p>
      </td>

      {/* Course */}
      <td className="px-4 py-3.5">
        <p className="text-slate-700 line-clamp-1">
          {cls.course?.title ?? <span className="text-slate-400">—</span>}
        </p>
      </td>

      {/* Branch (hidden on mobile) */}
      <td className="hidden md:table-cell px-4 py-3.5 text-slate-600">
        {cls.branch ? `${cls.branch.name} · ${cls.branch.city}` : <span className="text-slate-400">Online</span>}
      </td>

      {/* Teacher (hidden on mobile) */}
      <td className="hidden md:table-cell px-4 py-3.5 text-slate-600">
        {cls.teacher?.full_name ?? <span className="text-slate-400">Unassigned</span>}
      </td>

      {/* Learners */}
      <td className="px-4 py-3.5">
        <span className="text-slate-700 tabular-nums">
          {count}
          {cls.max_learners != null && (
            <span className="text-slate-400"> / {cls.max_learners}</span>
          )}
        </span>
        {cls.max_learners != null && count >= cls.max_learners && (
          <span className="ml-1.5 inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
            Full
          </span>
        )}
      </td>

      {/* Date range (hidden on mobile) */}
      <td className="hidden md:table-cell px-4 py-3.5 text-slate-600 whitespace-nowrap">
        {fmtDate(cls.starts_on)}
        {cls.ends_on && <> — {fmtDate(cls.ends_on)}</>}
      </td>

      {/* Status badge */}
      <td className="px-4 py-3.5">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            cls.is_active
              ? 'bg-green-100 text-green-700'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          {cls.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
    </tr>
  )
}
