import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import type { Database } from '@/types/database'

// ---------------------------------------------------------------------------
// Route classification
// ---------------------------------------------------------------------------

/** Authenticated users are redirected away from these to their dashboard. */
const AUTH_ONLY_ROUTES = ['/login', '/register', '/reset-password']

/**
 * Routes that are always accessible without a session.
 * Lesson preview: /courses/[id]/lessons/[id]?preview=true is handled inline.
 */
const PUBLIC_ROUTES = ['/', ...AUTH_ONLY_ROUTES]

/** Any path starting with these prefixes requires a valid session. */
const PROTECTED_PREFIXES = [
  '/dashboard',   // (learner)
  '/courses',     // (learner) — catalog + lesson player
  '/writing',     // (learner)
  '/teacher',     // (teacher)
  '/admin',       // (admin)
]

/** Role requirements per URL prefix. Uncovered prefixes need auth only. */
const ROLE_REQUIREMENTS: Array<{
  prefix: string
  roles: string[]
  redirectTo: string
}> = [
  {
    prefix: '/teacher',
    roles: ['teacher', 'academic_admin', 'centre_admin', 'super_admin'],
    redirectTo: '/dashboard',
  },
  {
    prefix: '/admin',
    roles: ['academic_admin', 'centre_admin', 'super_admin'],
    redirectTo: '/dashboard',
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  )
}

function isAuthOnly(pathname: string): boolean {
  return AUTH_ONLY_ROUTES.some((route) => pathname === route)
}

function isLessonPreview(pathname: string, searchParams: URLSearchParams): boolean {
  // /courses/[courseId]/lessons/[lessonId]?preview=true
  // DB-level preview flag enforcement happens in the Server Component — middleware
  // only checks the param to avoid a DB round-trip on every request.
  return (
    /^\/courses\/[^/]+\/lessons\/[^/]+$/.test(pathname) &&
    searchParams.get('preview') === 'true'
  )
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export async function proxy(request: NextRequest) {
  // 1. Always refresh the session first so cookies stay alive.
  const response = await updateSession(request)

  const { pathname, searchParams } = request.nextUrl

  // 2. Skip protection for public assets (belt-and-suspenders; matcher handles this too).
  if (!isProtected(pathname) && !isAuthOnly(pathname)) {
    return response
  }

  // 3. Allow lesson previews through without auth.
  if (isLessonPreview(pathname, searchParams)) {
    return response
  }

  // 4. Resolve the current user from the refreshed session.
  //    We create a lightweight client here (no cookie writes needed — updateSession
  //    already handled that above and returned the response with fresh cookies).
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {
          // No-op: cookie writes were handled by updateSession.
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 5. Unauthenticated — redirect to login, preserving the intended destination.
  if (!user && isProtected(pathname)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 6. Already authenticated — redirect away from login/register/reset.
  if (user && isAuthOnly(pathname)) {
    const homeUrl = request.nextUrl.clone()
    homeUrl.pathname = '/dashboard'
    homeUrl.search = ''
    return NextResponse.redirect(homeUrl)
  }

  // 7. Role-based access control for /teacher/* and /admin/*.
  if (user) {
    const roleRule = ROLE_REQUIREMENTS.find(
      (rule) =>
        pathname === rule.prefix || pathname.startsWith(rule.prefix + '/')
    )

    if (roleRule) {
      // Fetch the user's role from user_profiles.
      // This is a single indexed lookup — acceptable in Edge middleware.
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single() as { data: { role: string } | null; error: unknown }

      const userRole = profile?.role

      if (!userRole || !roleRule.roles.includes(userRole)) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = roleRule.redirectTo
        redirectUrl.search = ''
        return NextResponse.redirect(redirectUrl)
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - favicon.ico
     * - Public assets (svg, png, jpg, …)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
