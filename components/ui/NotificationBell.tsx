'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, X, CheckCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────────

interface NotificationItem {
  id:         string
  type:       string
  title:      string
  title_vi:   string | null
  body:       string | null
  is_read:    boolean
  action_url: string | null
  created_at: string
}

interface Props {
  userId:        string
  preferredLang?: 'en' | 'vi'
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60)  return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60)  return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24)    return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days !== 1 ? 's' : ''} ago`
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NotificationBell({ userId, preferredLang = 'en' }: Props) {
  const router       = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)

  const [open,          setOpen]          = useState(false)
  const [loading,       setLoading]       = useState(true)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  const unreadCount = notifications.filter(n => !n.is_read).length

  // ── Initial fetch + Realtime subscription ──────────────────────────────────
  useEffect(() => {
    const supabase = createClient()

    // Fetch last 10 notifications
    supabase
      .from('notifications')
      .select('id, type, title, title_vi, body, is_read, action_url, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setNotifications((data as NotificationItem[]) ?? [])
        setLoading(false)
      })

    // Realtime: prepend new INSERT notifications
    const channel = supabase
      .channel(`notifications:user:${userId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `user_id=eq.${userId}`,
        },
        payload => {
          setNotifications(prev =>
            [payload.new as NotificationItem, ...prev].slice(0, 10)
          )
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [userId])

  // ── Outside-click closes dropdown ──────────────────────────────────────────
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // ── Actions ────────────────────────────────────────────────────────────────

  async function handleItemClick(n: NotificationItem) {
    // Optimistic mark-as-read
    if (!n.is_read) {
      setNotifications(prev =>
        prev.map(item => item.id === n.id ? { ...item, is_read: true } : item)
      )
      // Fire-and-forget PATCH; failure is non-critical
      void fetch(`/api/notifications/${n.id}/read`, { method: 'PATCH' })
    }
    setOpen(false)
    if (n.action_url) router.push(n.action_url)
  }

  async function handleMarkAllRead() {
    const supabase = createClient()
    await supabase
      .from('notifications')
      .update({ is_read: true } as never)
      .eq('user_id', userId)
      .eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  function displayTitle(n: NotificationItem): string {
    return (preferredLang === 'vi' && n.title_vi) ? n.title_vi : n.title
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="relative" ref={containerRef}>

      {/* ── Bell button ── */}
      <button
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
      >
        <Bell size={18} aria-hidden />
        {unreadCount > 0 && (
          <span
            aria-hidden
            className="absolute top-1 right-1 inline-flex items-center justify-center min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full mt-1 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden"
        >

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-800">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </span>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  <CheckCheck size={13} aria-hidden />
                  Mark all read
                </button>
              )}
              <button
                aria-label="Close notifications"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X size={14} aria-hidden />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <ul className="max-h-[22rem] overflow-y-auto divide-y divide-slate-50" role="list">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="px-4 py-3 animate-pulse flex items-start gap-3">
                  <div className="mt-1.5 w-2 h-2 rounded-full bg-slate-200 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-slate-200 rounded w-3/4" />
                    <div className="h-2 bg-slate-100 rounded w-1/2" />
                    <div className="h-2 bg-slate-100 rounded w-1/4" />
                  </div>
                </li>
              ))
            ) : notifications.length === 0 ? (
              <li className="px-4 py-10 text-center">
                <Bell size={24} className="mx-auto text-slate-200 mb-2" aria-hidden />
                <p className="text-sm text-slate-400">No notifications yet.</p>
              </li>
            ) : (
              notifications.map(n => (
                <li key={n.id}>
                  <button
                    onClick={() => handleItemClick(n)}
                    className={[
                      'w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-slate-50',
                      !n.is_read ? 'bg-indigo-50/50' : '',
                    ].join(' ')}
                  >
                    {/* Unread indicator dot */}
                    <span
                      aria-hidden
                      className={[
                        'mt-1.5 w-2 h-2 rounded-full flex-shrink-0 transition-colors',
                        !n.is_read ? 'bg-indigo-500' : 'bg-transparent',
                      ].join(' ')}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={[
                          'text-sm leading-snug',
                          !n.is_read ? 'font-semibold text-slate-900' : 'font-medium text-slate-700',
                        ].join(' ')}
                      >
                        {displayTitle(n)}
                      </p>
                      {n.body && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                          {n.body}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-1 tabular-nums">
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
