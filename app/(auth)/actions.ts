'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
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

  // FIX: Extract authData directly from the sign-in response
  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Surface auth errors without leaking implementation details
    if (error.message.toLowerCase().includes('invalid')) {
      return { error: 'Incorrect email or password.' }
    }
    return { error: error.message }
  }

  // FIX: Use authData.user instead of making a second round-trip request
  if (!authData.user) {
    return { error: 'Sign-in succeeded but session could not be established. Please try again.' }
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

  // FIX: Force Next.js to drop its cached state so the middleware picks up the session properly
  revalidatePath('/', 'layout')
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

  const { error } = await supabase.auth.signUp({
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

  // FIX: Revalidate layout cache on register as well
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
