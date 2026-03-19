-- =============================================================================
-- Seed: Sample IELTS 6.5 Pathway course + class + enrolment
-- Depends on: 01_admin_user.sql (admin + branch UUIDs must exist)
-- Run with: supabase db execute --file supabase/seed/02_sample_course.sql
-- =============================================================================

do $$
declare
  -- From seed 01
  v_admin_id    uuid := 'a0000000-0000-0000-0000-000000000001';
  v_teacher_id  uuid := 'a0000000-0000-0000-0000-000000000002';
  v_branch_hn   uuid := 'c0000000-0000-0000-0000-000000000001';

  -- Course hierarchy
  v_course_id   uuid := 'd0000000-0000-0000-0000-000000000001';
  v_mod1_id     uuid := 'e0000000-0000-0000-0000-000000000001';
  v_mod2_id     uuid := 'e0000000-0000-0000-0000-000000000002';

  -- Lessons
  v_lesson_vid  uuid := 'f0000000-0000-0000-0000-000000000001';
  v_lesson_read uuid := 'f0000000-0000-0000-0000-000000000002';
  v_lesson_t1   uuid := 'f0000000-0000-0000-0000-000000000003';
  v_lesson_t2   uuid := 'f0000000-0000-0000-0000-000000000004';

  -- Assignments
  v_assign_t1   uuid := '00000000-a550-0000-0000-000000000001';
  v_assign_t2   uuid := '00000000-a550-0000-0000-000000000002';

  -- Class
  v_class_id    uuid := '00000000-c1a5-0000-0000-000000000001';

begin

  -- ── Course ─────────────────────────────────────────────────────────────────

  insert into public.courses (
    id, title, title_vi, description, description_vi,
    level, is_published, created_by
  ) values (
    v_course_id,
    'IELTS 6.5 Pathway',
    'Lộ trình IELTS 6.5',
    'A comprehensive 12-week course covering all four IELTS skills, targeting Band 6.5.',
    'Khóa học 12 tuần toàn diện bao gồm 4 kỹ năng IELTS, mục tiêu Band 6.5.',
    'IELTS 6.5',
    true,
    v_admin_id
  )
  on conflict (id) do nothing;

  -- ── Module 1: IELTS Writing Fundamentals ──────────────────────────────────

  insert into public.modules (id, course_id, title, title_vi, position)
  values
    (v_mod1_id, v_course_id, 'IELTS Writing Fundamentals', 'Nền tảng IELTS Writing', 1),
    (v_mod2_id, v_course_id, 'Advanced Writing Strategies', 'Chiến lược Writing nâng cao', 2)
  on conflict (id) do nothing;

  -- ── Lessons ────────────────────────────────────────────────────────────────

  insert into public.lessons (
    id, module_id, title, title_vi, lesson_type,
    content_url, duration_mins, position, is_published, is_preview
  ) values (
    v_lesson_vid,
    v_mod1_id,
    'Introduction to IELTS Writing',
    'Giới thiệu IELTS Writing',
    'video',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    20, 1, true, true   -- free preview
  )
  on conflict (id) do nothing;

  insert into public.lessons (
    id, module_id, title, title_vi, lesson_type,
    content_body, duration_mins, position, is_published
  ) values (
    v_lesson_read,
    v_mod1_id,
    'Understanding Band Descriptors',
    'Hiểu tiêu chí chấm điểm IELTS',
    'reading',
    E'## IELTS Writing Band Descriptors\n\nIELTS Writing is marked on four equally-weighted criteria:\n\n### Task Achievement (Task 1) / Task Response (Task 2)\nHow well you address the task requirements.\n\n### Coherence and Cohesion\nHow logically your ideas are organised and linked.\n\n### Lexical Resource\nThe range and accuracy of your vocabulary.\n\n### Grammatical Range and Accuracy\nThe range and accuracy of your grammar structures.',
    30, 2, true
  )
  on conflict (id) do nothing;

  insert into public.lessons (
    id, module_id, title, title_vi, lesson_type,
    ielts_task_type, duration_mins, position, is_published
  ) values (
    v_lesson_t1,
    v_mod1_id,
    'Task 1 Practice: Bar Charts',
    'Luyện tập Task 1: Biểu đồ cột',
    'ielts_writing',
    'task1',
    40, 3, true
  ),
  (
    v_lesson_t2,
    v_mod2_id,
    'Task 2 Practice: Opinion Essay',
    'Luyện tập Task 2: Bài viết quan điểm',
    'ielts_writing',
    'task2',
    60, 1, true
  )
  on conflict (id) do nothing;

  -- ── Assignments ────────────────────────────────────────────────────────────

  insert into public.assignments (
    id, lesson_id, title, title_vi,
    instructions, instructions_vi,
    task_type, max_words
  ) values
  (
    v_assign_t1,
    v_lesson_t1,
    'Describe the bar chart',
    'Mô tả biểu đồ cột',
    'The bar chart below shows the percentage of students who passed their driving test on the first attempt in five different countries in 2010 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
    'Biểu đồ cột dưới đây cho thấy tỷ lệ học sinh đậu bài thi lái xe ngay lần đầu ở năm quốc gia khác nhau vào năm 2010 và 2020. Hãy tóm tắt thông tin bằng cách chọn và mô tả các đặc điểm chính, và so sánh khi cần thiết. Viết ít nhất 150 từ.',
    'ielts_writing_task1',
    200
  ),
  (
    v_assign_t2,
    v_lesson_t2,
    'Opinion essay: Technology and education',
    'Bài luận quan điểm: Công nghệ và giáo dục',
    'Some people believe that technology has made it easier for students to learn, while others think it has created more distractions. Discuss both views and give your own opinion. Write at least 250 words.',
    'Một số người cho rằng công nghệ giúp học sinh học tập dễ dàng hơn, trong khi người khác nghĩ rằng nó tạo ra nhiều sự xao nhãng hơn. Thảo luận cả hai quan điểm và đưa ra ý kiến của bạn. Viết ít nhất 250 từ.',
    'ielts_writing_task2',
    400
  )
  on conflict (id) do nothing;

  -- ── Class ──────────────────────────────────────────────────────────────────

  insert into public.classes (
    id, course_id, branch_id, teacher_id,
    name, starts_on, ends_on, max_learners, is_active
  ) values (
    v_class_id,
    v_course_id,
    v_branch_hn,
    v_teacher_id,
    'IELTS 6.5 — Hanoi Spring 2026',
    '2026-03-24',
    '2026-06-16',
    20,
    true
  )
  on conflict (id) do nothing;

  raise notice 'Seed 02 complete — course, modules, lessons, assignments, class created.';
end
$$;
