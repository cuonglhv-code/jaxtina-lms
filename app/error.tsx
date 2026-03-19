'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to your console so you can actually see what broke
    console.error('Application crashed:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 text-center">
      <h2 className="font-display text-2xl text-gray-900 mb-2">Something went wrong!</h2>
      <p className="text-sm text-red-600 mb-6 bg-red-50 p-4 rounded-lg max-w-lg border border-red-100 overflow-auto">
        {error.message || "An unexpected server error occurred."}
      </p>
      <button
        onClick={() => reset()}
        className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-500 transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
