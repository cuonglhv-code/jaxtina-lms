import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ClassDetail } from '@/components/admin/classes/class-detail'
import type { ClassRow } from '@/lib/validations/class'
import type { Enrolment } from '@/lib/validations/enrolment'
import type { Metadata } from 'next'

type PageProps = { params: Promise<{ id: string }> }

const CLASS_SELECT = `
  id, name, course_id, branch_id, teacher_id,
  starts_on, ends_on, max_learners, is_active, created_at, updated_at,
  course:courses!course_id(id, title),
  branch:branches!branch_id(id, name, city),
  teacher:user_profiles!teacher_id(id, full_name),
  enrolments(count)
` as const

const ENROLMENT_SELECT = `
  id, class_id, learner_id, status, enrolled_at, updated_at,
  learner:user_profiles!learner_id(id, full_name, email)
` as const

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('classes')
    .select('name')
    .eq('id', id)
    .single()
  const row = data as { name: string } | null
  return { title: row ? `${row.name} — Jaxtina Admin` : 'Class Detail — Jaxtina Admin' }
}

export default async function ClassDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: cls, error: classError }, { data: enrolments, error: enrolError }] =
    await Promise.all([
      supabase.from('classes').select(CLASS_SELECT).eq('id', id).single(),
      supabase
        .from('enrolments')
        .select(ENROLMENT_SELECT)
        .eq('class_id', id)
        .order('enrolled_at', { ascending: false }),
    ])

  if (classError || !cls) notFound()

  const clsRow = cls as ClassRow

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-slate-500">
        <Link href="/admin/classes" className="hover:text-slate-800 transition-colors">
          Classes
        </Link>
        <ChevronRight size={14} className="flex-shrink-0" />
        <span className="text-slate-800 font-medium truncate">{clsRow.name}</span>
      </nav>

      {/* Detail + enrolments */}
      <ClassDetail
        initialClass={clsRow}
        initialEnrolments={(enrolments ?? []) as Enrolment[]}
      />

      {enrolError && (
        <p
          role="alert"
          className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          Could not load enrolments: {enrolError.message}
        </p>
      )}
    </div>
  )
}
