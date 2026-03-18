'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Loader2 } from 'lucide-react'
import type { Course } from '@/lib/validations/course'

interface CourseTableProps {
  courses: Course[]
}

export function CourseTable({ courses }: CourseTableProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeleting(id)
    const res = await fetch(`/api/courses/${id}`, { method: 'DELETE' })
    setDeleting(null)
    setConfirmId(null)

    if (res.ok) {
      router.refresh()
    }
  }

  if (courses.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-slate-500">
        <p className="text-sm">No courses yet.</p>
        <Link
          href="/admin/courses/new"
          className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline"
        >
          Create your first course →
        </Link>
      </div>
    )
  }

  return (
    <>
      {/* Delete confirmation dialog */}
      {confirmId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 id="confirm-title" className="text-base font-semibold text-slate-900">
              Delete course?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              This action cannot be undone. Associated modules and lessons will also be removed.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirmId(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmId)}
                disabled={!!deleting}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting === confirmId && (
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left font-semibold text-slate-600">
                Title
              </th>
              <th scope="col" className="hidden px-6 py-3 text-left font-semibold text-slate-600 sm:table-cell">
                Level
              </th>
              <th scope="col" className="px-6 py-3 text-left font-semibold text-slate-600">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-right font-semibold text-slate-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {courses.map(course => (
              <tr key={course.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-medium text-slate-900 line-clamp-1">{course.title}</p>
                  {course.title_vi && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{course.title_vi}</p>
                  )}
                </td>
                <td className="hidden px-6 py-4 text-slate-600 sm:table-cell">
                  {course.level ?? <span className="text-slate-400">—</span>}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge published={course.is_published} />
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/courses/${course.id}/edit`}
                      aria-label={`Edit ${course.title}`}
                      className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </Link>
                    <button
                      onClick={() => setConfirmId(course.id)}
                      aria-label={`Delete ${course.title}`}
                      className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={16} aria-hidden="true" />
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

function StatusBadge({ published }: { published: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        published
          ? 'bg-green-100 text-green-700'
          : 'bg-amber-100 text-amber-700'
      }`}
    >
      {published ? 'Published' : 'Draft'}
    </span>
  )
}
