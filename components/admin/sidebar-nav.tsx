'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BookOpen,
  Users,
  GraduationCap,
  BarChart3,
  CalendarDays,
  LogOut,
  LayoutDashboard,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/courses',   label: 'Courses',   icon: BookOpen },
  { href: '/admin/classes',   label: 'Classes',   icon: CalendarDays },
  { href: '/admin/users',     label: 'Learners',  icon: GraduationCap },
  { href: '/admin/teachers',  label: 'Teachers',  icon: Users },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
]

interface SidebarNavProps {
  userName: string
}

export function SidebarNav({ userName }: SidebarNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:min-h-screen bg-slate-900 text-slate-100">
        {/* Brand */}
        <div className="px-6 py-5 border-b border-slate-700">
          <span className="text-lg font-bold tracking-tight text-white">
            Jaxtina EduOS
          </span>
          <p className="text-xs text-slate-400 mt-0.5">Admin Panel</p>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Admin navigation">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* User + logout */}
        <div className="px-4 py-4 border-t border-slate-700">
          <p className="text-xs text-slate-400 truncate mb-2">{userName}</p>
          <button
            onClick={handleLogout}
            aria-label="Log out"
            className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors"
          >
            <LogOut size={16} aria-hidden="true" />
            Log out
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ──────────────────────────────────── */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
        <span className="font-bold tracking-tight">Jaxtina EduOS</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-300 truncate max-w-[120px]">{userName}</span>
          <button
            onClick={handleLogout}
            aria-label="Log out"
            className="text-slate-300 hover:text-white"
          >
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* ── Mobile bottom nav ───────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-slate-900 border-t border-slate-700 flex justify-around"
        aria-label="Admin navigation"
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 text-[10px] font-medium transition-colors ${
                active ? 'text-indigo-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon size={20} aria-hidden="true" />
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
