import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { LearnerSidebar } from './_components/LearnerSidebar'

export default async function LearnerLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileRaw, error } = await supabase
    .from('user_profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (error || !profileRaw) redirect('/login')

  const profile = profileRaw as { full_name: string | null; role: string }

  return (
    <div className="min-h-screen">
      <LearnerSidebar fullName={profile.full_name ?? ''} role={profile.role} />
      <main
        id="main-content"
        className="ml-0 md:ml-[200px] min-h-screen bg-gray-50 p-6 md:p-7 pb-20 md:pb-7"
      >
        {children}
      </main>
    </div>
  )
}
