'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BookOpen, Pencil, Trash2, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { Course } from '@/lib/validations/course'

interface CourseTableProps {
  courses: Course[]
}

export function CourseTable({ courses }: CourseTableProps) {
  const router = useRouter()
  const [deleting,  setDeleting]  = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeleting(id)
    const res = await fetch(`/api/courses/${id}`, { method: 'DELETE' })
    setDeleting(null)
    setConfirmId(null)
    if (res.ok) router.refresh()
  }

  if (courses.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-white py-12 text-center">
        <BookOpen size={32} className="mx-auto text-gray-300 mb-3" aria-hidden />
        <p className="text-sm font-medium text-gray-500">Nothing here yet</p>
        <p className="text-[13px] text-gray-400 mt-1">No courses have been created.</p>
        <Link
          href="/admin/courses/new"
          className="mt-3 inline-block text-[13px] font-medium text-teal hover:text-teal-text transition-colors"
        >
          Create your first course →
        </Link>
      </div>
    )
  }

  return (
    <>
      {/* ── Delete confirmation dialog ── */}
      {confirmId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        >
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl border border-gray-100">
            <h2 id="confirm-title" className="text-[15px] font-medium text-gray-900">
              Delete course?
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              This action cannot be undone. Associated modules and lessons will also be removed.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmId(null)}
                className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmId)}
                disabled={!!deleting}
                className="inline-flex items-center gap-2 rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 transition-opacity"
              >
                {deleting === confirmId && (
                  <Loader2 size={14} className="animate-spin" aria-hidden />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              {['Title', 'Level', 'Status', 'Modules', 'Actions'].map((h, i) => (
                <th
                  key={h}
                  scope="col"
                  className={[
                    'px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-gray-400',
                    i === 4 ? 'text-right' : 'text-left',
                    h === 'Level' ? 'hidden sm:table-cell' : '',
                  ].join(' ')}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {courses.map(course => (
              <tr
                key={course.id}
                className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors"
              >
                {/* Title */}
                <td className="px-5 py-4">
                  <p className="font-medium text-gray-900 text-sm line-clamp-1">{course.title}</p>
                  {course.title_vi && (
                    <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{course.title_vi}</p>
                  )}
                </td>

                {/* Level */}
                <td className="hidden sm:table-cell px-5 py-4">
                  {course.level
                    ? <Badge variant="gray">{course.level}</Badge>
                    : <span className="text-gray-300">—</span>}
                </td>

                {/* Status */}
                <td className="px-5 py-4">
                  {course.is_published
                    ? <Badge variant="teal">Published</Badge>
                    : <Badge variant="gray">Draft</Badge>}
                </td>

                {/* Modules */}
                <td className="px-5 py-4">
                  <span className="text-[13px] text-gray-400">—</span>
                </td>

                {/* Actions */}
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/admin/courses/${course.id}/edit`}
                      aria-label={`Edit ${course.title}`}
                      className="rounded-md p-1.5 text-gray-400 hover:text-navy hover:bg-gray-100 transition-colors"
                    >
                      <Pencil size={15} aria-hidden />
                    </Link>
                    <button
                      onClick={() => setConfirmId(course.id)}
                      aria-label={`Delete ${course.title}`}
                      className="rounded-md p-1.5 text-gray-400 hover:text-brand-red hover:bg-brand-red-light transition-colors"
                    >
                      <Trash2 size={15} aria-hidden />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
