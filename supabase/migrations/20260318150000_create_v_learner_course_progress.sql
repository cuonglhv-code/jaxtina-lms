-- =============================================================================
-- Migration: 20260318150000_create_v_learner_course_progress.sql
-- Creates the v_learner_course_progress view and adds 'under_review' to
-- the submission_status enum if it does not already exist.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Add 'under_review' to submission_status if not yet present
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on t.oid = e.enumtypid
    where t.typname = 'submission_status'
    and e.enumlabel = 'under_review'
  ) then
    alter type public.submission_status add value 'under_review' after 'submitted';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- v_learner_course_progress
-- Per-enrolment completion stats for a learner.
-- Security: underlying table RLS policies govern row visibility.
--   • enrolments    → learner_id = auth.uid()
--   • learner_progress → learner_id = auth.uid()
--   • lessons / modules / courses / classes → published / active guards
-- ---------------------------------------------------------------------------
create or replace view public.v_learner_course_progress as
select
  e.learner_id,
  e.id                                                                    as enrolment_id,
  e.class_id,
  e.status                                                                as enrolment_status,
  cl.name                                                                 as class_name,
  cl.starts_on,
  cl.ends_on,
  c.id                                                                    as course_id,
  c.title                                                                 as course_title,
  c.title_vi                                                              as course_title_vi,
  c.thumbnail_url,
  c.level,
  count(distinct l.id)                                                    as total_lessons,
  count(distinct lp.lesson_id) filter (where lp.completed = true)        as completed_lessons,
  case
    when count(distinct l.id) = 0 then 0
    else round(
      count(distinct lp.lesson_id) filter (where lp.completed = true)::numeric
      / count(distinct l.id)::numeric * 100
    )::integer
  end                                                                     as completion_pct
from public.enrolments e
join public.classes              cl  on cl.id = e.class_id
join public.courses               c  on c.id  = cl.course_id
join public.modules               m  on m.course_id = c.id
join public.lessons               l  on l.module_id = m.id
                                     and l.is_published = true
left join public.learner_progress lp on lp.lesson_id = l.id
                                     and lp.learner_id = e.learner_id
group by
  e.learner_id, e.id, e.class_id, e.status,
  cl.name, cl.starts_on, cl.ends_on,
  c.id, c.title, c.title_vi, c.thumbnail_url, c.level;

-- Grant SELECT to authenticated role (RLS on base tables still applies)
grant select on public.v_learner_course_progress to authenticated;
