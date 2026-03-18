import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s — Jaxtina EduOS',
    default: 'Jaxtina EduOS',
  },
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col items-center justify-center p-4">
      {/* Card */}
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="mb-8 flex flex-col items-center">
          {/* Logo mark */}
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 shadow-lg">
            <span className="text-xl font-black text-white" aria-hidden="true">J</span>
          </div>
          <span className="text-lg font-bold tracking-tight text-gray-900">
            Jaxtina EduOS
          </span>
          <span className="text-xs text-gray-400 mt-0.5">
            Jaxtina English Centre
          </span>
        </div>

        {/* Form card */}
        <div className="rounded-2xl bg-white px-8 py-8 shadow-xl shadow-indigo-900/5 ring-1 ring-gray-900/5">
          {children}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} Jaxtina English Centre. All rights reserved.
        </p>
      </div>
    </div>
  )
}
