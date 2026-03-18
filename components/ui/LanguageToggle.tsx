'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface LanguageToggleProps {
  currentLang: 'en' | 'vi'
  /** Tailwind active-state color class. E.g. 'bg-indigo-600' or 'bg-teal-600' */
  activeClass?: string
}

export function LanguageToggle({
  currentLang,
  activeClass = 'bg-indigo-600',
}: LanguageToggleProps) {
  const router  = useRouter()
  const [busy, setBusy] = useState(false)

  async function handleToggle(next: 'en' | 'vi') {
    if (next === currentLang || busy) return
    setBusy(true)

    // 1. Set NEXT_LOCALE cookie (1 year expiry)
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000; SameSite=Lax`

    // 2. Persist to user_profiles (fire-and-forget — non-critical)
    void fetch('/api/profile/lang', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferred_lang: next }),
    }).catch(() => {})

    // 3. Re-render with new locale
    router.refresh()
    setBusy(false)
  }

  return (
    <div
      className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium"
      role="group"
      aria-label="App language"
    >
      {(['en', 'vi'] as const).map(lang => (
        <button
          key={lang}
          type="button"
          onClick={() => handleToggle(lang)}
          aria-pressed={currentLang === lang}
          disabled={busy}
          className={[
            'px-2.5 py-1.5 transition-colors',
            currentLang === lang
              ? `${activeClass} text-white`
              : 'bg-white text-slate-600 hover:bg-slate-50',
            busy ? 'opacity-60 cursor-wait' : '',
          ].join(' ')}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
