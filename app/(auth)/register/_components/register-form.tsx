'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { registerAction, type AuthActionState } from '../../actions'

const initialState: AuthActionState = { error: null }

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(registerAction, initialState)

  return (
    <form action={formAction} noValidate className="space-y-5">
      {/* Global error */}
      {state.error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </div>
      )}

      {/* Full name */}
      <div className="space-y-1.5">
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
          Full name
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          aria-describedby={state.fieldErrors?.fullName ? 'fullName-error' : undefined}
          className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
          placeholder="Nguyen Van A"
          disabled={isPending}
        />
        {state.fieldErrors?.fullName && (
          <p id="fullName-error" className="text-xs text-red-600">
            {state.fieldErrors.fullName[0]}
          </p>
        )}
      </div>

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
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          aria-describedby="password-hint password-error"
          className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
          placeholder="••••••••"
          disabled={isPending}
        />
        <p id="password-hint" className="text-xs text-gray-400">
          At least 8 characters, one uppercase letter, and one number.
        </p>
        {state.fieldErrors?.password && (
          <p id="password-error" className="text-xs text-red-600">
            {state.fieldErrors.password[0]}
          </p>
        )}
      </div>

      {/* Confirm password */}
      <div className="space-y-1.5">
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          aria-describedby={
            state.fieldErrors?.confirmPassword ? 'confirmPassword-error' : undefined
          }
          className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
          placeholder="••••••••"
          disabled={isPending}
        />
        {state.fieldErrors?.confirmPassword && (
          <p id="confirmPassword-error" className="text-xs text-red-600">
            {state.fieldErrors.confirmPassword[0]}
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
            Creating account…
          </>
        ) : (
          'Create account'
        )}
      </button>

      {/* Login link */}
      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-medium text-indigo-600 hover:text-indigo-500 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  )
}
