-- =============================================================================
-- Migration: 20260318160000_feedback_bilingual_and_assignment_image.sql
-- Adds bilingual feedback text, token tracking, and image support.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- feedback: bilingual text + AI call tracking
-- ---------------------------------------------------------------------------
alter table public.feedback
  add column if not exists feedback_en     text,          -- EN markdown feedback
  add column if not exists feedback_vi     text,          -- VI markdown feedback
  add column if not exists model_used      text,          -- e.g. 'claude-sonnet-4-20250514'
  add column if not exists prompt_tokens   integer,
  add column if not exists completion_tokens integer;

-- ---------------------------------------------------------------------------
-- assignments: task image for Task 1 visual prompts
-- ---------------------------------------------------------------------------
alter table public.assignments
  add column if not exists image_url text;               -- URL to Task 1 chart/diagram image

-- ---------------------------------------------------------------------------
-- notifications: bilingual title
-- ---------------------------------------------------------------------------
alter table public.notifications
  add column if not exists title_vi text;
