-- =============================================================================
-- Migration: 20260318170000_create_v_submission_queue.sql
-- Creates v_submission_queue — teacher-facing submission queue view.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- v_submission_queue
-- One row per submission, scoped to the teacher of the class the learner is
-- enrolled in.  Used for:
--   • Dashboard: status counts per teacher
--   • Submissions queue page: full list with learner + assignment context
--
-- Security: queried by authenticated teachers. The underlying submissions
-- RLS policy "teacher: read submissions in own classes" already restricts
-- rows to the teacher's courses.  The teacher_id column allows an
-- additional .eq('teacher_id', uid) filter for clarity and index use.
-- ---------------------------------------------------------------------------
create or replace view public.v_submission_queue as
select
  -- Teacher context
  cl.teacher_id,
  cl.id          as class_id,
  cl.name        as class_name,

  -- Submission
  s.id           as submission_id,
  s.learner_id,
  s.status,
  s.word_count,
  s.submitted_at,

  -- Assignment + lesson context
  a.id           as assignment_id,
  a.title        as assignment_title,
  l.id           as lesson_id,
  l.ielts_task_type,

  -- Course
  co.id          as course_id,
  co.title       as course_title,

  -- Learner
  up.full_name   as learner_name,
  up.email       as learner_email,

  -- Latest feedback (ai or teacher), NULL if none yet
  fb.id          as feedback_id,
  fb.source      as feedback_source,
  fb.band_overall

from public.submissions s
join public.assignments   a   on a.id = s.assignment_id
join public.lessons       l   on l.id = a.lesson_id
join public.modules       m   on m.id = l.module_id
join public.courses       co  on co.id = m.course_id
join public.classes       cl  on cl.course_id = co.id
join public.enrolments    e   on e.class_id = cl.id
                              and e.learner_id = s.learner_id
join public.user_profiles up  on up.id = s.learner_id
left join lateral (
  select id, source, band_overall
  from public.feedback f
  where f.submission_id = s.id
  order by
    case when f.source = 'teacher' then 0 else 1 end,
    f.created_at desc
  limit 1
) fb on true
where cl.is_active = true;

-- Grant SELECT to authenticated role; RLS on base tables governs row visibility
grant select on public.v_submission_queue to authenticated;
