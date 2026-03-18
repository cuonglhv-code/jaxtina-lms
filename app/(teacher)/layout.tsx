import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TeacherNav } from '@/components/lms/teacher-nav'

// Secondary role guard — middleware is the primary gate.
// This prevents accidental access if middleware is misconfigured.
const TEACHER_ROLES = ['teacher', 'academic_admin', 'centre_admin', 'super_admin'] as const

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profileRaw, error } = await supabase
    .from('user_profiles')
    .select('full_name, role, preferred_lang')
    .eq('id', user.id)
    .single()

  const profile = profileRaw as { full_name: string | null; role: string; preferred_lang: string | null } | null

  if (error || !profile || !TEACHER_ROLES.includes(profile.role as typeof TEACHER_ROLES[number])) {
    redirect('/unauthorized')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <TeacherNav
        fullName={profile.full_name ?? ''}
        userId={user.id}
        preferredLang={(profile.preferred_lang as 'en' | 'vi') ?? 'en'}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="main-content">
        {children}
      </main>
    </div>
  )
}
