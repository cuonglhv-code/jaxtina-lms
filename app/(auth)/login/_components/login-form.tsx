'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { loginAction, type AuthActionState } from '../../actions'

const initialState: AuthActionState = { error: null }

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction, isPending] = useActionState(loginAction, initialState)

  return (
    <form action={formAction} noValidate className="space-y-5">
      {/* Preserve redirectTo through the form submission */}
      {redirectTo && (
        <input type="hidden" name="redirectTo" value={redirectTo} />
      )}

      {/* Global error */}
      {state.error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </div>
      )}

      {/* Email */}
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-describedby={state.fieldErrors?.email ? 'email-error' : undefined}
          className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
          placeholder="you@example.com"
          disabled={isPending}
        />
        {state.fieldErrors?.email && (
          <p id="email-error" className="text-xs text-red-600">
            {state.fieldErrors.email[0]}
          </p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <Link
            href="/reset-password"
            className="text-xs text-indigo-600 hover:text-indigo-500 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-describedby={state.fieldErrors?.password ? 'password-error' : undefined}
          className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
          placeholder="••••••••"
          disabled={isPending}
        />
        {state.fieldErrors?.password && (
          <p id="password-error" className="text-xs text-red-600">
            {state.fieldErrors.password[0]}
          </p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? (
          <>
            <svg
              aria-hidden="true"
              className="mr-2 h-4 w-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Signing in…
          </>
        ) : (
          'Sign in'
        )}
      </button>

      {/* Register link */}
      <p className="text-center text-sm text-gray-500">
        Don&apos;t have an account?{' '}
        <Link
          href="/register"
          className="font-medium text-indigo-600 hover:text-indigo-500 hover:underline"
        >
          Create one
        </Link>
      </p>
    </form>
  )
}
