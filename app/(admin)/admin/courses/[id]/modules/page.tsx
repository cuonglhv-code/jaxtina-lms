import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ModuleManager } from '@/components/admin/modules/module-manager'
import type { Module } from '@/lib/validations/module'

interface ModulesPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ModulesPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('courses').select('title').eq('id', id).single()
  const row = data as { title: string } | null
  return {
    title: row ? `Modules — ${row.title} — Jaxtina Admin` : 'Modules — Jaxtina Admin',
  }
}

export default async function ModulesPage({ params }: ModulesPageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch course + modules in parallel
  const [{ data: courseRaw, error: courseError }, { data: modules, error: modulesError }] =
    await Promise.all([
      supabase.from('courses').select('id, title, title_vi').eq('id', id).single(),
      supabase.from('modules').select('*').eq('course_id', id).order('position', { ascending: true }),
    ])

  if (courseError || !courseRaw) {
    notFound()
  }

  const course = courseRaw as { id: string; title: string; title_vi: string | null }

  if (modulesError) {
    return (
      <div role="alert" className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
        Failed to load modules: {modulesError.message}
      </div>
    )
  }

  const moduleList = (modules ?? []) as Module[]

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link
          href="/admin/courses"
          className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors"
        >
          <ChevronLeft size={14} aria-hidden="true" />
          Courses
        </Link>
        <span>/</span>
        <Link
          href={`/admin/courses/${id}/edit`}
          className="hover:text-slate-700 transition-colors line-clamp-1 max-w-[200px]"
        >
          {course.title}
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">Modules</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Modules</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {moduleList.length} module{moduleList.length !== 1 ? 's' : ''} · click a module title to edit inline
        </p>
      </div>

      {/* Interactive manager (client) */}
      <ModuleManager
        courseId={id}
        courseName={course.title}
        initialModules={moduleList}
      />
    </div>
  )
}
