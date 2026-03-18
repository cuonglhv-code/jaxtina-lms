'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BookOpen, LayoutDashboard, PenLine,
  ChevronDown, LogOut, User, Menu, X,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { NotificationBell } from '@/components/ui/NotificationBell'
import { LanguageToggle } from '@/components/ui/LanguageToggle'

// ── Types ─────────────────────────────────────────────────────────────────────

interface LearnerNavProps {
  fullName:      string
  preferredLang: 'en' | 'vi'
  userId:        string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LearnerNav({ fullName, preferredLang, userId }: LearnerNavProps) {
  const pathname              = usePathname()
  const router                = useRouter()
  const t                     = useTranslations('nav')

  const NAV_LINKS = [
    { href: '/learner/dashboard', label: t('dashboard'),  icon: LayoutDashboard },
    { href: '/learner/courses',   label: t('myCourses'),  icon: BookOpen },
    { href: '/learner/writing',   label: t('practice'),   icon: PenLine },
  ] as const
  const [menuOpen, setMenuOpen]     = useState(false)
  const [dropdownOpen, setDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close user dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdown(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false) }, [pathname])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = fullName
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link
            href="/learner/dashboard"
            className="flex items-center gap-2 flex-shrink-0 select-none"
          >
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white text-xs font-bold tracking-tight">
              J
            </span>
            <span className="hidden sm:block text-sm font-semibold text-slate-800 leading-tight">
              Jaxtina<br />
              <span className="text-xs font-normal text-slate-500">EduOS</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={[
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive(href)
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                ].join(' ')}
              >
                <Icon size={16} aria-hidden />
                {label}
              </Link>
            ))}
          </nav>

          {/* Right — bell + user */}
          <div className="flex items-center gap-2">
            <NotificationBell userId={userId} preferredLang={preferredLang} />

            {/* User dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                aria-label="User menu"
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
                onClick={() => setDropdown(o => !o)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                {/* Avatar */}
                <span
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold flex-shrink-0"
                  aria-hidden
                >
                  {initials}
                </span>
                <span className="hidden sm:block text-sm font-medium text-slate-700 max-w-[120px] truncate">
                  {fullName}
                </span>
                <ChevronDown
                  size={14}
                  className={[
                    'text-slate-400 transition-transform',
                    dropdownOpen ? 'rotate-180' : '',
                  ].join(' ')}
                  aria-hidden
                />
              </button>

              {/* Dropdown menu */}
              {dropdownOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50"
                >
                  <Link
                    href="/learner/profile"
                    role="menuitem"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    onClick={() => setDropdown(false)}
                  >
                    <User size={15} aria-hidden />
                    {t('profile')}
                  </Link>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    role="menuitem"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={15} aria-hidden />
                    {t('logOut')}
                  </button>
                </div>
              )}
            </div>

            <LanguageToggle currentLang={preferredLang} activeClass="bg-indigo-600" />

            {/* Mobile hamburger */}
            <button
              aria-label={menuOpen ? t('closeMenu') : t('openMenu')}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(o => !o)}
              className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            >
              {menuOpen ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav menu */}
      {menuOpen && (
        <nav
          aria-label="Mobile navigation"
          className="md:hidden border-t border-slate-200 bg-white px-4 pb-3 pt-2 space-y-1"
        >
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={[
                'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive(href)
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-100',
              ].join(' ')}
            >
              <Icon size={16} aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
