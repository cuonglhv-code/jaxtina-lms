-- =============================================================================
-- Extend lesson_type enum with 'ielts_writing'
-- Add is_preview and ielts_task_type columns to lessons
-- =============================================================================

-- Postgres requires ADD VALUE outside a transaction block; Supabase migrations
-- run each file in its own transaction, so we use a DO block to safely skip if
-- the value already exists (idempotent deploys).
do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'ielts_writing'
      and enumtypid = 'public.lesson_type'::regtype
  ) then
    alter type public.lesson_type add value 'ielts_writing';
  end if;
end
$$;

-- is_preview: lesson is accessible without enrolment (free preview)
alter table public.lessons
  add column if not exists is_preview boolean not null default false;

-- ielts_task_type: 'task1' | 'task2' — only set when lesson_type = 'ielts_writing'
alter table public.lessons
  add column if not exists ielts_task_type text
    check (ielts_task_type in ('task1', 'task2'));

create index if not exists idx_lessons_preview on public.lessons(is_preview);
