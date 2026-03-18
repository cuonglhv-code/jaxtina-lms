# /types

Shared TypeScript interfaces and enums mirroring the Supabase database schema.

## Planned files
- `database.ts` — raw generated types from `supabase gen types typescript`
- `domain.ts` — enriched domain types (e.g. `CourseWithModules`, `SubmissionWithFeedback`)
- `api.ts` — request/response shapes for Route Handlers

## Workflow
Run `supabase gen types typescript --local > types/database.ts` after any schema migration
to keep types in sync with the DB.
