'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input }  from '@/components/ui/Input'

export default function RegisterPage() {
  const router = useRouter()

  const [fullName,        setFullName]        = useState('')
  const [email,           setEmail]           = useState('')
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error,           setError]           = useState<string | null>(null)
  const [passwordError,   setPasswordError]   = useState<string | undefined>()
  const [isLoading,       setIsLoading]       = useState(false)

  function validatePasswords(): boolean {
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters.')
      return false
    }
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return false
    }
    setPasswordError(undefined)
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!validatePasswords()) return

    setIsLoading(true)

    try {
      const supabase = createClient()

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      const userId = data.user?.id
      if (!userId) {
        setError('Registration failed. Please try again.')
        return
      }

      // Upsert user_profiles with learner role
      // (the trigger may already have created the row — upsert is safe)
      await supabase
        .from('user_profiles')
        .upsert({
          id:        userId,
          full_name: fullName,
          role:      'learner',
        } as never, { onConflict: 'id' })

      router.push('/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Heading */}
      <h1 className="font-display text-2xl text-gray-900">Create your account</h1>
      <p className="text-sm text-gray-400 mt-1.5 mb-8">
        Join Jaxtina EduOS to start your IELTS journey
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="Full name"
          type="text"
          autoComplete="name"
          required
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          placeholder="Nguyen Van A"
          disabled={isLoading}
        />

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

        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          onBlur={confirmPassword ? validatePasswords : undefined}
          placeholder="••••••••"
          disabled={isLoading}
        />

        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          onBlur={validatePasswords}
          placeholder="••••••••"
          disabled={isLoading}
          error={passwordError}
        />

        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
          className="w-full mt-2"
        >
          Create account
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

      {/* Login link */}
      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-medium text-navy hover:text-navy-hover transition-colors"
        >
          Sign in
        </Link>
      </p>
    </>
  )
}
