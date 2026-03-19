'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BookOpen, Pencil, Bell, Menu, X } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard',      label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/courses',        label: 'My Courses',    icon: BookOpen },
  { href: '/writing',        label: 'Practice',      icon: Pencil },
  { href: '/notifications',  label: 'Notifications', icon: Bell },
] as const

interface LearnerSidebarProps {
  fullName: string
  role:     string
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function LearnerSidebar({ fullName, role }: LearnerSidebarProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const initials = getInitials(fullName) || '?'

  const nav = (
    <nav className="flex-1 py-4" aria-label="Main navigation">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            aria-current={isActive ? 'page' : undefined}
            className={[
              'flex items-center gap-2.5 px-5 py-2.5 text-[13px]',
              'border-l-2 transition-colors',
              isActive
                ? 'text-white border-l-teal bg-white/5'
                : 'text-white/50 hover:text-white/80 border-transparent',
            ].join(' ')}
          >
            <Icon size={15} aria-hidden />
            {label}
          </Link>
        )
      })}
    </nav>
  )

  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.08]">
        <p className="font-display text-white text-base leading-none">Jaxtina</p>
        <p className="text-[10px] text-white/30 tracking-wide mt-1">EduOS</p>
      </div>

      {nav}

      {/* User footer */}
      <div className="border-t border-white/[0.08] p-4 flex items-center gap-3 min-w-0">
        <div
          aria-hidden
          className="w-8 h-8 bg-teal rounded-full flex items-center justify-center text-white text-[11px] font-medium flex-shrink-0"
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-[12px] text-white/80 font-medium truncate">{fullName || 'Learner'}</p>
          <p className="text-[10px] text-white/35 capitalize">{role.replace('_', ' ')}</p>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* ── Desktop sidebar — fixed ── */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-[200px] bg-navy z-30 flex-col">
        {sidebar}
      </aside>

      {/* ── Mobile: hamburger trigger (drawer only) ── */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        className="md:hidden fixed top-3 left-3 z-40 w-9 h-9 rounded-lg bg-navy flex items-center justify-center text-white shadow-lg"
      >
        {open ? <X size={17} aria-hidden /> : <Menu size={17} aria-hidden />}
      </button>

      {/* ── Mobile: backdrop + drawer ── */}
      {open && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-30"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <aside className="md:hidden fixed left-0 top-0 bottom-0 w-[200px] bg-navy z-40 flex flex-col">
            {sidebar}
          </aside>
        </>
      )}

      {/* ── Mobile: fixed bottom nav bar ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-navy z-30 flex items-center justify-around border-t border-white/[0.08] px-1 py-1.5"
        aria-label="Bottom navigation"
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={[
                'flex flex-col items-center gap-0.5 px-3 py-1 rounded-md transition-colors min-w-0',
                isActive ? 'text-white' : 'text-white/40 hover:text-white/70',
              ].join(' ')}
            >
              <Icon size={19} aria-hidden />
              <span className="text-[9px] tracking-wide leading-none">{label.split(' ')[0]}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
