'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Users } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
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
  const [classes,   setClasses]   = useState<ClassRow[]>(initialClasses)
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
      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h1 className="font-display text-2xl text-gray-900">Classes</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {classes.length} class{classes.length !== 1 ? 'es' : ''} total
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-hover transition-colors"
          aria-label="Create new class"
        >
          <Plus size={15} aria-hidden />
          New Class
        </button>
      </div>

      {/* ── Table ── */}
      {classes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white py-12 text-center">
          <Users size={32} className="mx-auto text-gray-300 mb-3" aria-hidden />
          <p className="text-sm font-medium text-gray-500">Nothing here yet</p>
          <p className="text-[13px] text-gray-400 mt-1">No classes have been created.</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-3 text-[13px] font-medium text-teal hover:text-teal-text transition-colors"
          >
            Create your first class →
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                {[
                  { label: 'Name',    hide: false },
                  { label: 'Course',  hide: false },
                  { label: 'Branch',  hide: true  },
                  { label: 'Teacher', hide: true  },
                  { label: 'Learners',hide: false },
                  { label: 'Dates',   hide: true  },
                  { label: 'Status',  hide: false },
                ].map(({ label, hide }) => (
                  <th
                    key={label}
                    scope="col"
                    className={[
                      'px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-gray-400',
                      hide ? 'hidden md:table-cell' : '',
                    ].join(' ')}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {classes.map(cls => (
                <ClassRowItem
                  key={cls.id}
                  cls={cls}
                  onClick={() => handleRowClick(cls.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <NewClassModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  )
}

// ── ClassRowItem ──────────────────────────────────────────────────────────────

function ClassRowItem({ cls, onClick }: { cls: ClassRow; onClick: () => void }) {
  const count = enrolCount(cls)

  return (
    <tr
      onClick={onClick}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick()}
      tabIndex={0}
      role="button"
      aria-label={`View class ${cls.name}`}
      className="border-t border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors focus:outline-none focus:bg-gray-50"
    >
      {/* Name */}
      <td className="px-5 py-4">
        <p className="font-medium text-gray-900 text-sm">{cls.name}</p>
      </td>

      {/* Course */}
      <td className="px-5 py-4">
        <p className="text-[13px] text-gray-600 line-clamp-1">
          {cls.course?.title ?? <span className="text-gray-300">—</span>}
        </p>
      </td>

      {/* Branch */}
      <td className="hidden md:table-cell px-5 py-4 text-[13px] text-gray-500">
        {cls.branch
          ? `${cls.branch.name} · ${cls.branch.city}`
          : <span className="text-gray-300">Online</span>}
      </td>

      {/* Teacher */}
      <td className="hidden md:table-cell px-5 py-4 text-[13px] text-gray-500">
        {cls.teacher?.full_name ?? <span className="text-gray-300">Unassigned</span>}
      </td>

      {/* Learners */}
      <td className="px-5 py-4">
        <span className="text-[13px] text-gray-700 tabular-nums">
          {count}
          {cls.max_learners != null && (
            <span className="text-gray-400"> / {cls.max_learners}</span>
          )}
        </span>
        {cls.max_learners != null && count >= cls.max_learners && (
          <Badge variant="red" className="ml-1.5">Full</Badge>
        )}
      </td>

      {/* Dates */}
      <td className="hidden md:table-cell px-5 py-4 text-[13px] text-gray-500 whitespace-nowrap">
        {fmtDate(cls.starts_on)}
        {cls.ends_on && <> — {fmtDate(cls.ends_on)}</>}
      </td>

      {/* Status */}
      <td className="px-5 py-4">
        {cls.is_active
          ? <Badge variant="teal">Active</Badge>
          : <Badge variant="gray">Inactive</Badge>}
      </td>
    </tr>
  )
}
