'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input }  from '@/components/ui/Input'

export default function LoginPage() {
  const router = useRouter()

  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [error,     setError]     = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const supabase = createClient()

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError('Invalid email or password. Please try again.')
        return
      }

      // Fetch role to redirect to the correct dashboard
      const { data: { user } } = await supabase.auth.getUser()

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user!.id)
        .single() as { data: { role: string } | null; error: unknown }

      const role = profile?.role ?? 'learner'

      if (role === 'teacher') {
        router.push('/teacher/dashboard')
      } else if (role === 'academic_admin' || role === 'centre_admin' || role === 'super_admin') {
        router.push('/admin/courses')
      } else {
        router.push('/dashboard')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center w-full px-4">
      <div className="w-full max-w-sm">
      {/* Heading */}
      <h1 className="font-display text-2xl text-gray-900">Welcome back</h1>
      <p className="text-sm text-gray-400 mt-1.5 mb-8">
        Sign in to continue your learning journey
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={isLoading}
        />

        <div className="space-y-1">
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={isLoading}
          />
          <div className="text-right">
            <Link
              href="/reset-password"
              className="text-[11px] text-gray-400 hover:text-navy transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
          className="w-full mt-2"
        >
          Sign in
        </Button>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="bg-red-50 border border-red-100 rounded-md p-3 text-sm text-red-600"
          >
            {error}
          </div>
        )}
      </form>

      {/* Divider */}
      <div className="my-6 flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs text-gray-400">or</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      {/* Register link */}
      <p className="text-center text-sm text-gray-500">
        New to Jaxtina?{' '}
        <Link
          href="/register"
          className="font-medium text-navy hover:text-navy-hover transition-colors"
        >
          Create account
        </Link>
      </p>
      </div>
    </div>
  )
}
