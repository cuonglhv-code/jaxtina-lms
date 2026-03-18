-- =============================================================================
-- Jaxtina EduOS — Initial LMS Schema
-- Migration: 20260318120000_initial_lms_schema.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type user_role as enum (
  'learner',
  'teacher',
  'academic_admin',
  'centre_admin',
  'super_admin'
);

create type lesson_type as enum (
  'video',
  'reading',
  'exercise',
  'live'
);

create type submission_status as enum (
  'draft',
  'submitted',
  'under_review',
  'reviewed'
);

create type feedback_source as enum (
  'ai',
  'teacher'
);

create type enrolment_status as enum (
  'active',
  'paused',
  'completed',
  'withdrawn'
);

create type notification_type as enum (
  'assignment_due',
  'feedback_ready',
  'class_update',
  'general'
);

-- ---------------------------------------------------------------------------
-- user_profiles
-- Extends Supabase Auth users with role and profile data.
-- ---------------------------------------------------------------------------
create table public.user_profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  role            user_role    not null default 'learner',
  full_name       text         not null,
  display_name    text,
  avatar_url      text,
  phone           text,
  preferred_lang  text         not null default 'en' check (preferred_lang in ('en', 'vi')),
  created_at      timestamptz  not null default now(),
  updated_at      timestamptz  not null default now()
);

create index idx_user_profiles_role on public.user_profiles(role);

alter table public.user_profiles enable row level security;

-- Users can read their own profile; admins can read all.
create policy "users: read own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "admins: read all profiles"
  on public.user_profiles for select
  using (
    exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid()
        and up.role in ('academic_admin', 'centre_admin', 'super_admin')
    )
  );

create policy "teachers: read learner profiles"
  on public.user_profiles for select
  using (
    exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid()
        and up.role = 'teacher'
    )
    and role = 'learner'
  );

create policy "users: update own profile"
  on public.user_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "admins: insert profiles"
  on public.user_profiles for insert
  with check (
    exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid()
        and up.role in ('centre_admin', 'super_admin')
    )
  );

-- Allow the trigger below to create a profile on signup
create policy "service: insert own profile on signup"
  on public.user_profiles for insert
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Trigger: auto-create user_profile on auth.users insert
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- organisations
-- ---------------------------------------------------------------------------
create table public.organisations (
  id          uuid         primary key default uuid_generate_v4(),
  name        text         not null,
  slug        text         not null unique,
  logo_url    text,
  created_at  timestamptz  not null default now()
);

alter table public.organisations enable row level security;

create policy "authenticated: read organisations"
  on public.organisations for select
  using (auth.role() = 'authenticated');

create policy "super_admin: manage organisations"
  on public.organisations for all
  using (
    exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid() and up.role = 'super_admin'
    )
  );

-- ---------------------------------------------------------------------------
-- branches
-- ---------------------------------------------------------------------------
create table public.branches (
  id               uuid         primary key default uuid_generate_v4(),
  organisation_id  uuid         not null references public.organisations(id) on delete cascade,
  name             text         not null,
  city             text         not null,
  address          text,
  created_at       timestamptz  not null default now()
);

create index idx_branches_organisation on public.branches(organisation_id);

alter table public.branches enable row level security;

create policy "authenticated: read branches"
  on public.branches for select
  using (auth.role() = 'authenticated');

create policy "centre_admin+: manage branches"
  on public.branches for all
  using (
    exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid()
        and up.role in ('centre_admin', 'super_admin')
    )
  );

-- ---------------------------------------------------------------------------
-- courses
-- ---------------------------------------------------------------------------
create table public.courses (
  id           uuid         primary key default uuid_generate_v4(),
  title        text         not null,
  title_vi     text,
  description  text,
  description_vi text,
  thumbnail_url text,
  level        text,                          -- e.g. 'IELTS 5.5', 'A2'
  is_published boolean      not null default false,
  created_by   uuid         references public.user_profiles(id) on delete set null,
  created_at   timestamptz  not null default now(),
  updated_at   timestamptz  not null default now()
);

create index idx_courses_published on public.courses(is_published);
create index idx_courses_created_by on public.courses(created_by);

alter table public.courses enable row level security;

create policy "published courses: read by authenticated"
  on public.courses for select
  using (auth.role() = 'authenticated' and is_published = true);

create policy "academic_admin+: read all courses"
  on public.courses for select
  using (
    exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid()
        and up.role in ('academic_admin', 'centre_admin', 'super_admin')
    )
  );

create policy "academic_admin+: manage courses"
  on public.courses for all
  using (
    exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid()
        and up.role in ('academic_admin', 'centre_admin', 'super_admin')
    )
  );

-- ---------------------------------------------------------------------------
-- modules
-- ---------------------------------------------------------------------------
create table public.modules (
  id          uuid         primary key default uuid_generate_v4(),
  course_id   uuid         not null references public.courses(id) on delete cascade,
  title       text         not null,
  title_vi    text,
  position    integer      not null default 0,
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now()
);

create index idx_modules_course on public.modules(course_id, position);

alter table public.modules enable row level security;

create policy "authenticated: read modules of published courses"
  on public.modules for select
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from public.courses c
      where c.id = course_id and c.is_published = true
    )
  );

create policy "academic_admin+: manage modules"
  on public.modules for all
  using (
    exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid()
        and up.role in ('academic_admin', 'centre_admin', 'super_admin')
    )
  );

-- ---------------------------------------------------------------------------
-- lessons
-- ---------------------------------------------------------------------------
create table public.lessons (
  id            uuid         primary key default uuid_generate_v4(),
  module_id     uuid         not null references public.modules(id) on delete cascade,
  title         text         not null,
  title_vi      text,
  lesson_type   lesson_type  not null default 'video',
  content_url   text,                        -- video URL or external link
  content_body  text,                        -- markdown for reading/exercise
  duration_mins integer,
  position      integer      not null default 0,
  is_published  boolean      not null default false,
  created_at    timestamptz  not null default now(),
  updated_at    timestamptz  not null default now()
);

create index idx_lessons_module on public.lessons(module_id, position);
create index idx_lessons_published on public.lessons(is_published);

alter table public.lessons enable row level security;

create policy "authenticated: read published lessons"
  on public.lessons for select
  using (auth.role() = 'authenticated' and is_published = true);

create policy "academic_admin+: manage lessons"
  on public.lessons for all
  using (
    exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid()
        and up.role in ('academic_admin', 'centre_admin', 'super_admin')
    )
  );

create policy "teacher: read all lessons"
  on public.lessons for select
  using (
    exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid() and up.role = 'teacher'
    )
  );

-- ---------------------------------------------------------------------------
-- assignments
-- ---------------------------------------------------------------------------
create table public.assignments (
  id           uuid         primary key default uuid_generate_v4(),
  lesson_id    uuid         not null references public.lessons(id) on delete cascade,
  title        text         not null,
  title_vi     text,
  instructions text,
  instructions_vi text,
  task_type    text,                          -- 'ielts_writing_task1', 'ielts_writing_task2', 'free_writing', etc.
  max_words    integer,
  due_offset_days integer,                   -- days after enrolment start
  created_at   timestamptz  not null default now(),
  updated_at   timestamptz  not null default now()
);

create index idx_assignments_lesson on public.assignments(lesson_id);

alter table public.assignments enable row level security;

create policy "authenticated: read assignments"
  on public.assignments for select
  using (auth.role() = 'authenticated');

create policy "academic_admin+: manage assignments"
  on public.assignments for all
  using (
    exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid()
        and up.role in ('academic_admin', 'centre_admin', 'super_admin')
    )
  );

-- ---------------------------------------------------------------------------
-- classes  (scheduled cohort instances of a course)
-- ---------------------------------------------------------------------------
create table public.classes (
  id           uuid         primary key default uuid_generate_v4(),
  course_id    uuid         not null references public.courses(id) on delete restrict,
  branch_id    uuid         references public.branches(id) on delete set null,
  teacher_id   uuid         references public.user_profiles(id) on delete set null,
  name         text         not null,
  starts_on    date         not null,
  ends_on      date,
  max_learners integer,
  is_active    boolean      not null default true,
  created_at   timestamptz  not null default now(),
  updated_at   timestamptz  not null default now()
);

create index idx_classes_course on public.classes(course_id);
create index idx_classes_branch on public.classes(branch_id);
create index idx_classes_teacher on public.classes(teacher_id);
create index idx_classes_active on public.classes(is_active);

alter table public.classes enable row level security;

create policy "authenticated: read active classes"
  on public.classes for select
  using (auth.role() = 'authenticated' and is_active = true);

create policy "teacher: read own classes"
  on public.classes for select
  using (teacher_id = auth.uid());

create policy "centre_admin+: manage classes"
  on public.classes for all
  using (
    exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid()
        and up.role in ('centre_admin', 'super_admin')
    )
  );

-- ---------------------------------------------------------------------------
-- enrolments
-- ---------------------------------------------------------------------------
create table public.enrolments (
  id          uuid              primary key default uuid_generate_v4(),
  class_id    uuid              not null references public.classes(id) on delete cascade,
  learner_id  uuid              not null references public.user_profiles(id) on delete cascade,
  status      enrolment_status  not null default 'active',
  enrolled_at timestamptz       not null default now(),
  updated_at  timestamptz       not null default now(),
  unique (class_id, learner_id)
);

create index idx_enrolments_class on public.enrolments(class_id);
create index idx_enrolments_learner on public.enrolments(learner_id);

alter table public.enrolments enable row level security;

create policy "learner: read own enrolments"
  on public.enrolments for select
  using (learner_id = auth.uid());

create policy "teacher: read enrolments in own classes"
  on public.enrolments for select
  using (
    exists (
      select 1 from public.classes c
      where c.id = class_id and c.teacher_id = auth.uid()
    )
  );

create policy "centre_admin+: manage enrolments"
  on public.enrolments for all
  using (
    exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid()
        and up.role in ('centre_admin', 'super_admin')
    )
  );

-- ---------------------------------------------------------------------------
-- learner_progress
-- ---------------------------------------------------------------------------
create table public.learner_progress (
  id             uuid         primary key default uuid_generate_v4(),
  learner_id     uuid         not null references public.user_profiles(id) on delete cascade,
  lesson_id      uuid         not null references public.lessons(id) on delete cascade,
  completed      boolean      not null default false,
  completed_at   timestamptz,
  last_viewed_at timestamptz  not null default now(),
  progress_pct   smallint     not null default 0 check (progress_pct between 0 and 100),
  unique (learner_id, lesson_id)
);

create index idx_learner_progress_learner on public.learner_progress(learner_id);
create index idx_learner_progress_lesson on public.learner_progress(lesson_id);

alter table public.learner_progress enable row level security;

create policy "learner: read own progress"
  on public.learner_progress for select
  using (learner_id = auth.uid());

create policy "learner: upsert own progress"
  on public.learner_progress for insert
  with check (learner_id = auth.uid());

create policy "learner: update own progress"
  on public.learner_progress for update
  using (learner_id = auth.uid())
  with check (learner_id = auth.uid());

create policy "teacher: read learner progress in own classes"
  on public.learner_progress for select
  using (
    exists (
      select 1
      from public.enrolments e
      join public.classes c on c.id = e.class_id
      where e.learner_id = learner_id
        and c.teacher_id = auth.uid()
    )
  );

create policy "academic_admin+: read all progress"
  on public.learner_progress for select
  using (
    exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid()
        and up.role in ('academic_admin', 'centre_admin', 'super_admin')
    )
  );

-- ---------------------------------------------------------------------------
-- submissions
-- ---------------------------------------------------------------------------
create table public.submissions (
  id             uuid               primary key default uuid_generate_v4(),
  assignment_id  uuid               not null references public.assignments(id) on delete cascade,
  learner_id     uuid               not null references public.user_profiles(id) on delete cascade,
  content        text               not null,
  word_count     integer,
  status         submission_status  not null default 'draft',
  submitted_at   timestamptz,
  created_at     timestamptz        not null default now(),
  updated_at     timestamptz        not null default now()
);

create index idx_submissions_assignment on public.submissions(assignment_id);
create index idx_submissions_learner on public.submissions(learner_id);
create index idx_submissions_status on public.submissions(status);

alter table public.submissions enable row level security;

create policy "learner: read own submissions"
  on public.submissions for select
  using (learner_id = auth.uid());

create policy "learner: create own submissions"
  on public.submissions for insert
  with check (learner_id = auth.uid());

create policy "learner: update own draft submissions"
  on public.submissions for update
  using (learner_id = auth.uid() and status = 'draft')
  with check (learner_id = auth.uid());

create policy "teacher: read submissions in own classes"
  on public.submissions for select
  using (
    exists (
      select 1
      from public.assignments a
      join public.lessons l on l.id = a.lesson_id
      join public.modules m on m.id = l.module_id
      join public.courses co on co.id = m.course_id
      join public.classes cl on cl.course_id = co.id
      where a.id = assignment_id
        and cl.teacher_id = auth.uid()
    )
  );

create policy "academic_admin+: read all submissions"
  on public.submissions for select
  using (
    exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid()
        and up.role in ('academic_admin', 'centre_admin', 'super_admin')
    )
  );

-- ---------------------------------------------------------------------------
-- feedback
-- ---------------------------------------------------------------------------
create table public.feedback (
  id              uuid             primary key default uuid_generate_v4(),
  submission_id   uuid             not null references public.submissions(id) on delete cascade,
  source          feedback_source  not null,
  author_id       uuid             references public.user_profiles(id) on delete set null,  -- null for AI
  -- IELTS Writing band scores (nullable for non-IELTS tasks)
  band_overall    numeric(3,1),
  band_ta         numeric(3,1),    -- Task Achievement / Task Response
  band_cc         numeric(3,1),    -- Coherence & Cohesion
  band_lr         numeric(3,1),    -- Lexical Resource
  band_gra        numeric(3,1),    -- Grammatical Range & Accuracy
  -- Qualitative feedback
  strengths       text,
  improvements    text,
  detailed_notes  text,
  created_at      timestamptz      not null default now()
);

create index idx_feedback_submission on public.feedback(submission_id);
create index idx_feedback_author on public.feedback(author_id);

alter table public.feedback enable row level security;

create policy "learner: read feedback on own submissions"
  on public.feedback for select
  using (
    exists (
      select 1 from public.submissions s
      where s.id = submission_id and s.learner_id = auth.uid()
    )
  );

create policy "teacher: insert feedback"
  on public.feedback for insert
  with check (
    source = 'teacher'
    and author_id = auth.uid()
    and exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid() and up.role = 'teacher'
    )
  );

create policy "teacher: read feedback in own classes"
  on public.feedback for select
  using (
    exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid() and up.role = 'teacher'
    )
  );

-- AI feedback is inserted server-side via service role key (bypasses RLS).
-- Teacher overrides create a new feedback row with source='teacher'.

create policy "academic_admin+: read all feedback"
  on public.feedback for select
  using (
    exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid()
        and up.role in ('academic_admin', 'centre_admin', 'super_admin')
    )
  );

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table public.notifications (
  id           uuid               primary key default uuid_generate_v4(),
  user_id      uuid               not null references public.user_profiles(id) on delete cascade,
  type         notification_type  not null default 'general',
  title        text               not null,
  body         text,
  is_read      boolean            not null default false,
  action_url   text,
  created_at   timestamptz        not null default now()
);

create index idx_notifications_user on public.notifications(user_id, is_read);

alter table public.notifications enable row level security;

create policy "users: read own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "users: mark own notifications read"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Notifications are created server-side via service role.

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute procedure public.set_updated_at();

create trigger trg_courses_updated_at
  before update on public.courses
  for each row execute procedure public.set_updated_at();

create trigger trg_modules_updated_at
  before update on public.modules
  for each row execute procedure public.set_updated_at();

create trigger trg_lessons_updated_at
  before update on public.lessons
  for each row execute procedure public.set_updated_at();

create trigger trg_assignments_updated_at
  before update on public.assignments
  for each row execute procedure public.set_updated_at();

create trigger trg_classes_updated_at
  before update on public.classes
  for each row execute procedure public.set_updated_at();

create trigger trg_enrolments_updated_at
  before update on public.enrolments
  for each row execute procedure public.set_updated_at();

create trigger trg_submissions_updated_at
  before update on public.submissions
  for each row execute procedure public.set_updated_at();
