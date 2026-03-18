# /app/api

Route Handlers for the Jaxtina EduOS API.

## Conventions
- Edge-compatible where possible (`export const runtime = 'edge'`)
- Validate input with `zod` before any DB operation
- Return `{ success: boolean, data?: T, error?: string }`
- Use correct HTTP status codes: 201 for creation, 422 for validation errors

## Planned routes
- `POST /api/submissions` — create or update a submission
- `POST /api/feedback/generate` — trigger AI feedback via Anthropic
- `POST /api/enrolments` — enrol a learner in a class
- `GET  /api/progress/[learnerId]` — fetch learner progress summary
