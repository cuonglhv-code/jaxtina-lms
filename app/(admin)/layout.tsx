import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SidebarNav } from '@/components/admin/sidebar-nav'

const ADMIN_ROLES = ['centre_admin', 'super_admin'] as const

export default async function AdminLayout({
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
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  const profile = profileRaw as { role: string; full_name: string | null } | null

  if (error || !profile || !ADMIN_ROLES.includes(profile.role as typeof ADMIN_ROLES[number])) {
    redirect('/unauthorized')
  }

  const displayName = profile.full_name ?? user.email ?? 'Admin'

  return (
    <div className="flex min-h-screen bg-slate-50">
      <SidebarNav userName={displayName} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop top bar */}
        <header className="hidden md:flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
          <h1 className="text-sm font-medium text-slate-500">Admin Dashboard</h1>
          <span className="text-sm text-slate-700 font-medium">{displayName}</span>
        </header>

        {/* Page content — add bottom padding on mobile for the fixed nav bar */}
        <main className="flex-1 p-6 pb-20 md:pb-6" id="main-content">
          {children}
        </main>
      </div>
    </div>
  )
}
