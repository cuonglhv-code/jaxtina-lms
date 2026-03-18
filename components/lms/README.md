# /components/lms

Domain-specific components with awareness of LMS concepts (courses, lessons, submissions).

## Planned components
- `CourseCard` — course thumbnail, title, progress indicator
- `LessonPlayer` — video player wrapper with progress tracking
- `ModuleAccordion` — expandable module/lesson list
- `SubmissionForm` — IELTS writing submission with word count
- `FeedbackCard` — display AI or teacher feedback with band scores
- `ProgressBar` — lesson/course completion bar
- `EnrolmentBadge` — class enrolment status chip
- `ClassRoster` — teacher view of enrolled learners

## Rules
- May import from `components/ui` but not the reverse
- All user-facing strings via `next-intl` translation keys
- No direct Supabase calls — receive data via props or Server Component parents
