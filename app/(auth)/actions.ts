'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  redirectTo: z.string().optional(),
})

const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuthActionState = {
  error: string | null
  fieldErrors?: Partial<Record<string, string[]>>
}

const ROLE_DASHBOARD: Record<string, string> = {
  learner: '/dashboard',
  teacher: '/teacher/dashboard',
  academic_admin: '/admin/dashboard',
  centre_admin: '/admin/dashboard',
  super_admin: '/admin/dashboard',
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export async function loginAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    redirectTo: formData.get('redirectTo') ?? undefined,
  })

  if (!parsed.success) {
    return { error: null, fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const { email, password, redirectTo } = parsed.data
  const supabase = await createClient()

  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (error.message.toLowerCase().includes('invalid')) {
      return { error: 'Incorrect email or password.' }
    }
    return { error: error.message }
  }

  // FIX: Explicitly check if a session was created. If not, they must confirm their email.
  if (!authData.session) {
    return { error: 'Please check your email and verify your account before logging in.' }
  }

  const { data: profile } = (await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', authData.user.id)
    .single()) as { data: { role: string } | null; error: unknown }

  const destination =
    (redirectTo && redirectTo !== '/login' ? redirectTo : undefined) ??
    (profile?.role ? ROLE_DASHBOARD[profile.role] : undefined) ??
    '/dashboard'

  redirect(destination)
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

export async function registerAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!parsed.success) {
    return { error: null, fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const { fullName, email, password } = parsed.data
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  })

  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      return { error: 'An account with this email already exists.' }
    }
    return { error: error.message }
  }

  // FIX: If Supabase has "Confirm Email" enabled, the session will be null. 
  // We must stop the redirect and tell the user to check their email.
  if (!data.session) {
    return { error: 'Account created! Please check your email inbox to confirm your account before logging in.' }
  }

  redirect('/dashboard')
}
