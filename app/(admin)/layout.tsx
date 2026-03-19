import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/admin/sidebar-nav'

const ADMIN_ROLES = ['centre_admin', 'super_admin'] as const

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileRaw, error } = await supabase
    .from('user_profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  const profile = profileRaw as { role: string; full_name: string | null } | null

  if (error || !profile || !ADMIN_ROLES.includes(profile.role as typeof ADMIN_ROLES[number])) {
    redirect('/unauthorized')
  }

  return (
    <div className="min-h-screen">
      <AdminSidebar fullName={profile.full_name ?? ''} role={profile.role} />
      <main
        id="main-content"
        className="ml-0 md:ml-[200px] min-h-screen bg-gray-50 p-6 md:p-7 pb-20 md:pb-7"
      >
        {children}
      </main>
    </div>
  )
}
