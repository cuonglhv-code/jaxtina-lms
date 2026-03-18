# Jaxtina EduOS — LMS Project Context for Claude Code

## Project Identity

**Product:** Jaxtina EduOS — a full-stack LMS for Jaxtina English Centre  
**Primary use case:** Internal learner management, IELTS preparation, teacher-facing tools, and B2B/B2C course delivery  
**Operator:** Jaxtina English Centre (Hanoi + Ho Chi Minh City, Vietnam)  
**Languages:** English (UI default), Vietnamese (bilingual support required throughout)  
**Target users:** Learners, teachers, academic admin, centre admin, and super-admin  

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, RSC-first) |
| Database | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| ORM | Supabase JS client (`@supabase/supabase-js`) — no Prisma |
| AI | Anthropic API (`claude-sonnet-4-20250514`) |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Deployment | Vercel |
| Package manager | pnpm |

**No NeonDB. No Prisma. Supabase is the single data layer.**

---

## Repository Structure

```
/app                    # Next.js App Router
  /(auth)               # Login, register, reset flows
  /(learner)            # Learner-facing pages
  /(teacher)            # Teacher-facing pages
  /(admin)              # Admin dashboard
  /api                  # Route handlers (Edge-compatible preferred)
/components             # Shared UI components
  /ui                   # Primitives (buttons, inputs, modals)
  /lms                  # Domain-specific (CourseCard, LessonPlayer, etc.)
/lib
  /supabase             # Client + server Supabase instances
  /anthropic            # AI utility wrappers
  /utils                # General helpers
/types                  # Shared TypeScript interfaces (generated from DB schema)
/supabase
  /migrations           # SQL migration files (sequential, timestamped)
  /seed                 # Seed data scripts
```

---

## Coding Conventions

### General
- TypeScript strict mode throughout — no `any`, no `@ts-ignore`
- Server Components by default; add `"use client"` only when necessary
- Prefer `async/await` over `.then()` chains
- Named exports only (no default exports except `page.tsx` and `layout.tsx`)
- All user-facing strings must support i18n via `next-intl` (EN + VI)

### Supabase
- Use `createServerClient` (from `@supabase/ssr`) in Server Components and Route Handlers
- Use `createBrowserClient` in Client Components only
- Always handle `{ data, error }` destructuring — never assume success
- Row Level Security (RLS) is **always enabled**; write policies alongside every table migration
- Never call `supabase.auth.admin` from client-side code

### API Routes
- Validate input with `zod` before any DB operation
- Return consistent shape: `{ success: boolean, data?: T, error?: string }`
- Use HTTP status codes correctly (201 for creation, 422 for validation errors)

### AI (Anthropic)
- Model: `claude-sonnet-4-20250514` — do not substitute
- Max tokens: 1500 for feedback generation, 500 for short completions
- Always include a system prompt; never pass bare user input
- Wrap all AI calls in try/catch with graceful fallback UI

### Components
- No inline styles — Tailwind utility classes only
- Accessible: all interactive elements need `aria-label` or visible label
- Bilingual: every user-facing string via translation key, not hardcoded

---

## Domain Model Overview

### Core entities and relationships (simplified)

```
Organisation
  └── Branch (Hanoi / HCMC)
       └── Class (a scheduled cohort)
            └── Enrolment → User (learner)

Course
  └── Module
       └── Lesson (video | reading | exercise | live)
            └── Assignment
                 └── Submission → Feedback (AI or teacher)

User (Supabase Auth)
  ├── role: learner | teacher | academic_admin | centre_admin | super_admin
  ├── LearnerProgress (per lesson)
  └── Notification
```

### Key design decisions
- A `Course` is a product (e.g., "IELTS 6.5 Pathway"); a `Class` is a scheduled instance of it
- Learners enrol in a `Class`, which maps to a `Course`
- `LearnerProgress` tracks completion at lesson granularity
- `Assignment` belongs to a `Lesson`; a `Submission` belongs to an `Assignment` + a learner
- IELTS Writing submissions follow the existing two-call AI scoring architecture (Task 1 / Task 2)

---

## Feature Priorities (Phase 1 — Internal)

1. **Auth & Role Management** — Supabase Auth + custom `user_profiles` table with role ENUM
2. **Course & Content Management** — CRUD for Course → Module → Lesson hierarchy (admin)
3. **Class & Enrolment** — create classes, assign learners, track cohort membership
4. **Learner Dashboard** — progress overview, upcoming lessons, recent feedback
5. **IELTS Writing Practice** — submit Task 1/2, receive AI feedback (existing pipeline, integrate)
6. **Teacher Dashboard** — view class rosters, submission queues, manual feedback override
7. **Admin Analytics** — Recharts dashboards for enrolment, completion rates, branch performance

---

## Environment Variables

```bash
# Required — never hardcode
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # server-side only, never expose to client
ANTHROPIC_API_KEY=               # server-side only
NEXT_PUBLIC_APP_URL=
```

---

## What NOT to Do

- Do **not** install Prisma or any secondary ORM
- Do **not** use `pages/` directory — App Router only
- Do **not** call the Anthropic API from client components
- Do **not** write RLS-bypassing queries unless explicitly instructed and scoped to admin-only server routes
- Do **not** add placeholder/mock data to production code — use `/supabase/seed/` scripts
- Do **not** create new Supabase tables without a corresponding RLS policy in the same migration file
- Do **not** use `fetch` directly for Supabase operations — use the typed client

---

## Migration Naming Convention

```
/supabase/migrations/YYYYMMDDHHMMSS_description.sql
```

Example: `20260318120000_create_courses_and_modules.sql`

Every migration file must include:
1. `CREATE TABLE` statements
2. Indexes
3. RLS `ENABLE` statement
4. At least one `CREATE POLICY` per table per role that needs access

---

## Testing Approach

- Unit tests: `vitest` for utility functions and AI prompt logic
- Integration: Supabase local dev (`supabase start`) for DB layer tests
- E2E: deferred to Phase 2

---

## Contact / Repo Context

- Platform: Vercel (production) + Supabase cloud
- Existing prototype: `jaxtina-ielts-examiner.vercel.app`
- This LMS extends and supersedes the prototype
