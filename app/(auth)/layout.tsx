import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: {
    template: '%s — Jaxtina EduOS',
    default:  'Jaxtina EduOS',
  },
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">

      {/* ── Left panel — navy, desktop only ── */}
      <div className="hidden lg:flex lg:w-[40%] bg-navy flex-col justify-between px-12 py-10">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 11L3 6h10L8 11z" fill="white" />
            </svg>
          </div>
          <div>
            <p className="font-display text-white text-lg leading-none">Jaxtina</p>
            <p className="text-[10px] uppercase tracking-widest text-teal mt-0.5">
              English Centre
            </p>
          </div>
        </div>

        {/* Middle: tagline + stats */}
        <div className="space-y-8">
          <p className="text-white/70 font-light leading-relaxed text-lg max-w-xs">
            Your personalised path to IELTS success — powered by expert teachers
            and AI-assisted feedback.
          </p>

          <div className="space-y-5">
            <div className="border-l-2 border-teal pl-3">
              <p className="font-display text-white text-2xl leading-none">4.8</p>
              <p className="text-white/50 text-xs mt-1 uppercase tracking-wide">
                Avg band gain
              </p>
            </div>
            <div className="border-l-2 border-teal pl-3">
              <p className="font-display text-white text-2xl leading-none">2,000+</p>
              <p className="text-white/50 text-xs mt-1 uppercase tracking-wide">
                Active learners
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-white/30 text-xs">Hanoi · Ho Chi Minh City</p>
      </div>

      {/* ── Right panel — white, content ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 bg-white">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 11L3 6h10L8 11z" fill="white" />
            </svg>
          </div>
          <span className="font-display text-navy text-lg">Jaxtina</span>
        </div>

        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>

    </div>
  )
}
