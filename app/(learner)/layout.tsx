import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LearnerNav } from '@/components/lms/learner-nav'

export default async function LearnerLayout({
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
    .select('full_name, preferred_lang')
    .eq('id', user.id)
    .single()

  if (error || !profileRaw) {
    redirect('/login')
  }

  const profile = profileRaw as { full_name: string | null; preferred_lang: string | null }

  return (
    <div className="min-h-screen bg-slate-50">
      <LearnerNav
        fullName={profile.full_name ?? ''}
        preferredLang={profile.preferred_lang as 'en' | 'vi'}
        userId={user.id}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="main-content">
        {children}
      </main>
    </div>
  )
}
