import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronRight, ChevronLeft, ChevronRight as Next, ExternalLink,
  PlayCircle, BookOpen, PenLine, Video, FileText,
} from 'lucide-react'
import { marked } from 'marked'
import { createClient } from '@/lib/supabase/server'
import { LessonCompleteButton } from '@/components/lms/lesson-complete-button'
import { IeltsWritingForm } from '@/components/lms/IeltsWritingForm'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { Metadata } from 'next'
import type { FeedbackRow } from '@/lib/validations/submission'

type PageProps = {
  params: Promise<{ courseId: string; lessonId: string }>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const LESSON_ICONS: Record<string, React.ElementType> = {
  video:         PlayCircle,
  reading:       BookOpen,
  exercise:      PenLine,
  live:          Video,
  ielts_writing: FileText,
}

const LESSON_TYPE_BADGE: Record<string, 'blue' | 'teal' | 'amber' | 'green' | 'gray'> = {
  video:         'blue',
  reading:       'gray',
  exercise:      'amber',
  live:          'green',
  ielts_writing: 'teal',
}

/** Convert a YouTube / Vimeo watch URL to its embed URL. Returns null for other URLs. */
function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    // YouTube
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      const videoId =
        u.hostname === 'youtu.be'
          ? u.pathname.slice(1)
          : u.searchParams.get('v')
      if (videoId) return `https://www.youtube.com/embed/${videoId}`
    }
    // Vimeo
    if (u.hostname.includes('vimeo.com')) {
      const videoId = u.pathname.split('/').filter(Boolean)[0]
      if (videoId) return `https://player.vimeo.com/video/${videoId}`
    }
  } catch {
    // not a valid URL
  }
  return null
}

/** True if the URL points to a raw video file. */
function isVideoFile(url: string) {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lessonId } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('lessons')
    .select('title')
    .eq('id', lessonId)
    .single()
  const row = data as { title: string } | null
  return { title: row ? `${row.title} — Jaxtina EduOS` : 'Lesson — Jaxtina EduOS' }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function LessonPage({ params }: PageProps) {
  const { courseId, lessonId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) notFound()

  // Parallel fetch: lesson, progress, profile (for preferred_lang)
  const [
    { data: lessonRaw, error: lessonError },
    { data: progressRowRaw },
    { data: profileRaw },
  ] = await Promise.all([
    supabase
      .from('lessons')
      .select(`
        id, title, lesson_type, content_url, content_body,
        duration_mins, position, is_preview, ielts_task_type,
        module:modules!module_id(
          id, title,
          course:courses!course_id(id, title)
        )
      `)
      .eq('id', lessonId)
      .single(),

    supabase
      .from('learner_progress')
      .select('completed, progress_pct, completed_at')
      .eq('lesson_id', lessonId)
      .eq('learner_id', user.id)
      .maybeSingle(),

    supabase
      .from('user_profiles')
      .select('preferred_lang')
      .eq('id', user.id)
      .single(),
  ])

  if (lessonError || !lessonRaw) notFound()

  interface LessonDetail {
    id: string; title: string; lesson_type: string; content_url: string | null
    content_body: string | null; duration_mins: number | null; position: number
    is_preview: boolean; ielts_task_type: string | null
    module: { id: string; title: string; course: { id: string; title: string } | null } | null
  }

  const lesson      = lessonRaw      as LessonDetail
  const profile     = profileRaw     as { preferred_lang: string | null } | null
  const progressRow = progressRowRaw as { completed: boolean; progress_pct: number | null; completed_at: string | null } | null

  const module_ = lesson.module

  if (!module_ || module_.course?.id !== courseId) notFound()

  // Fetch sibling lessons for prev/next nav (same module, ordered by position)
  const { data: siblingsRaw } = await supabase
    .from('lessons')
    .select('id, title, position')
    .eq('module_id', module_.id)
    .eq('is_published', true)
    .order('position', { ascending: true })

  const siblings = siblingsRaw as { id: string; title: string; position: number }[] | null
  const preferredLang = (profile?.preferred_lang ?? 'en') as 'en' | 'vi'

  // Fetch assignments + submissions (RLS auto-filters submissions to this learner)
  const { data: assignmentsRaw } = await supabase
    .from('assignments')
    .select(`
      id, title, instructions, instructions_vi, task_type, max_words, image_url,
      submissions:submissions!assignment_id(
        id, status, content, word_count, submitted_at,
        feedback:feedback!submission_id(
          id, source, band_overall, band_ta, band_cc, band_lr, band_gra,
          strengths, improvements, detailed_notes,
          feedback_en, feedback_vi, model_used, created_at
        )
      )
    `)
    .eq('lesson_id', lessonId)

  type AssignmentWithSubmissions = {
    id: string; title: string; instructions: string | null; instructions_vi: string | null
    task_type: string | null; max_words: number | null; image_url: string | null
    submissions: { id: string; status: string; content: string; word_count: number | null; submitted_at: string; feedback: FeedbackRow[] }[]
  }
  const assignments = assignmentsRaw as AssignmentWithSubmissions[] | null

  // ── Prev / Next ───────────────────────────────────────────────────────────
  const allLessons = siblings ?? []
  const currentIdx = allLessons.findIndex(l => l.id === lessonId)
  const prevLesson = currentIdx > 0 ? allLessons[currentIdx - 1] : null
  const nextLesson = currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1] : null

  // ── Markdown rendering ────────────────────────────────────────────────────
  let contentHtml: string | null = null
  if (
    (lesson.lesson_type === 'reading' || lesson.lesson_type === 'exercise') &&
    lesson.content_body
  ) {
    contentHtml = await marked.parse(lesson.content_body)
  }

  const isCompleted = progressRow?.completed ?? false
  const Icon = LESSON_ICONS[lesson.lesson_type] ?? PlayCircle
  const typeBadgeVariant = LESSON_TYPE_BADGE[lesson.lesson_type] ?? 'gray'

  // Prepare IELTS form data when lesson_type = ielts_writing
  const ieltsAssignment = lesson.lesson_type === 'ielts_writing'
    ? (assignments ?? []).find(a =>
        a.task_type?.includes('task') || a.task_type?.includes('ielts')
      ) ?? (assignments ?? [])[0] ?? null
    : null

  const ieltsSubmission = ieltsAssignment
    ? (ieltsAssignment.submissions[0] ?? null)
    : null

  return (
    <div className="max-w-3xl space-y-5">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-gray-400 flex-wrap">
        <Link href="/dashboard" className="hover:text-gray-700 transition-colors">
          Dashboard
        </Link>
        <ChevronRight size={13} className="flex-shrink-0" />
        <Link href={`/courses/${courseId}`} className="hover:text-gray-700 transition-colors truncate max-w-[140px]">
          {module_.course?.title ?? 'Course'}
        </Link>
        <ChevronRight size={13} className="flex-shrink-0" />
        <span className="text-gray-700 truncate">{lesson.title}</span>
      </nav>

      {/* Lesson header */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Icon size={14} className="text-teal" aria-hidden />
          <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
            {module_.title}
          </span>
          <Badge variant={typeBadgeVariant}>{lesson.lesson_type.replace('_', ' ')}</Badge>
        </div>
        <h1 className="font-display text-xl text-gray-900">{lesson.title}</h1>
      </div>

      {/* ── Content area ── */}
      <Card padding="sm" className="!p-0 overflow-hidden">
        <LessonContent
          lesson={lesson}
          contentHtml={contentHtml}
          ieltsAssignment={ieltsAssignment}
          ieltsSubmission={ieltsSubmission}
          preferredLang={preferredLang}
        />
      </Card>

      {/* Assignments / submissions — not rendered for ielts_writing (handled inside IeltsWritingForm) */}
      {lesson.lesson_type !== 'ielts_writing' && (assignments ?? []).length > 0 && (
        <AssignmentsSection assignments={assignments ?? []} />
      )}

      {/* Mark as complete + Prev/Next navigation */}
      <footer className="pt-4 border-t border-gray-100 space-y-3">
        {/* Prev/Next — desktop only */}
        <div className="hidden sm:flex items-center justify-between gap-4">
          <div className="flex-1">
            {prevLesson && (
              <Link
                href={`/courses/${courseId}/lessons/${prevLesson.id}`}
                className="inline-flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-navy transition-colors"
              >
                <ChevronLeft size={15} aria-hidden />
                <span className="truncate max-w-[160px]">{prevLesson.title}</span>
              </Link>
            )}
          </div>

          {/* Mark complete */}
          <LessonCompleteButton lessonId={lessonId} initialCompleted={isCompleted} />

          <div className="flex-1 flex justify-end">
            {nextLesson && (
              <Link
                href={`/courses/${courseId}/lessons/${nextLesson.id}`}
                className="inline-flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-navy transition-colors"
              >
                <span className="truncate max-w-[160px]">{nextLesson.title}</span>
                <Next size={15} aria-hidden />
              </Link>
            )}
          </div>
        </div>

        {/* Mobile: mark complete + swipe hint */}
        <div className="sm:hidden flex flex-col items-center gap-2">
          <LessonCompleteButton lessonId={lessonId} initialCompleted={isCompleted} />
          {(prevLesson || nextLesson) && (
            <p className="text-[11px] text-gray-300">
              Swipe or use the course outline to navigate lessons
            </p>
          )}
        </div>
      </footer>
    </div>
  )
}

// ── LessonContent — renders the right UI per lesson_type ─────────────────────

function LessonContent({
  lesson,
  contentHtml,
  ieltsAssignment,
  ieltsSubmission,
  preferredLang,
}: {
  lesson: {
    lesson_type: string
    content_url: string | null
    content_body: string | null
    duration_mins: number | null
    ielts_task_type: string | null
  }
  contentHtml: string | null
  ieltsAssignment: {
    id: string; title: string; instructions: string | null; instructions_vi: string | null
    task_type: string | null; max_words: number | null; image_url: string | null
  } | null
  ieltsSubmission: { id: string; status: string; feedback: FeedbackRow[] } | null
  preferredLang: 'en' | 'vi'
}) {
  switch (lesson.lesson_type) {
    case 'video': {
      if (!lesson.content_url) {
        return <EmptyContent message="No video URL has been set for this lesson." />
      }
      const embedUrl = toEmbedUrl(lesson.content_url)
      if (embedUrl) {
        return (
          <div className="relative w-full aspect-video bg-black">
            <iframe
              src={embedUrl}
              title="Lesson video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
        )
      }
      if (isVideoFile(lesson.content_url)) {
        return (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            src={lesson.content_url}
            controls
            className="w-full"
            aria-label="Lesson video"
          />
        )
      }
      // Fallback: link
      return (
        <div className="p-5">
          <a
            href={lesson.content_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-teal hover:underline"
          >
            <ExternalLink size={15} aria-hidden />
            Open video
          </a>
        </div>
      )
    }

    case 'reading':
    case 'exercise': {
      if (!contentHtml) {
        return <EmptyContent message="No content has been added for this lesson." />
      }
      return (
        <article
          className="prose prose-slate max-w-none p-6"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      )
    }

    case 'live': {
      return (
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">
            This is a live session lesson. Join at the scheduled time using the link below.
          </p>
          {lesson.content_url ? (
            <a
              href={lesson.content_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy-hover transition-colors"
            >
              <ExternalLink size={15} aria-hidden />
              Join Session
            </a>
          ) : (
            <p className="text-sm text-gray-400 italic">No session link has been set yet.</p>
          )}
          {lesson.duration_mins && (
            <p className="text-[11px] text-gray-400">Duration: {lesson.duration_mins} minutes</p>
          )}
        </div>
      )
    }

    case 'ielts_writing': {
      if (!ieltsAssignment) {
        return <EmptyContent message="No assignment has been configured for this lesson." />
      }
      const rawTask = ieltsAssignment.task_type ?? ''
      const ieltsTask: 'task1' | 'task2' =
        rawTask.includes('task2') || lesson.ielts_task_type === 'task2' ? 'task2' : 'task1'

      const existingSub = ieltsSubmission
        ? {
            id:       ieltsSubmission.id,
            status:   ieltsSubmission.status,
            feedback: ieltsSubmission.feedback[0] as FeedbackRow | undefined,
          }
        : undefined

      return (
        <IeltsWritingForm
          assignment={{
            id:              ieltsAssignment.id,
            title:           ieltsAssignment.title,
            instructions:    ieltsAssignment.instructions,
            instructions_vi: ieltsAssignment.instructions_vi,
            ielts_task:      ieltsTask,
            image_url:       ieltsAssignment.image_url,
            word_limit:      ieltsAssignment.max_words,
          }}
          preferredLang={preferredLang}
          existingSubmission={existingSub}
        />
      )
    }

    default: {
      return <EmptyContent message="This lesson type is not yet supported." />
    }
  }
}

function EmptyContent({ message }: { message: string }) {
  return (
    <div className="p-5 text-sm text-gray-400 italic">{message}</div>
  )
}

// ── AssignmentsSection ────────────────────────────────────────────────────────

type LocalFeedbackRow = {
  id: string
  source: string
  band_overall: number | null
  strengths: string | null
  improvements: string | null
  detailed_notes: string | null
  feedback_en: string | null
  feedback_vi: string | null
  created_at: string
}

type SubmissionRow = {
  id: string
  status: string
  content: string
  word_count: number | null
  submitted_at: string | null
  feedback: LocalFeedbackRow[]
}

type AssignmentRow = {
  id: string
  title: string
  instructions: string | null
  task_type: string | null
  max_words: number | null
  image_url: string | null
  submissions: SubmissionRow[]
}

function AssignmentsSection({ assignments }: { assignments: AssignmentRow[] }) {
  return (
    <section className="space-y-3" aria-label="Assignments">
      <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400">Assignments</p>
      {assignments.map(a => {
        const submission: SubmissionRow | undefined = a.submissions[0]
        const feedback: LocalFeedbackRow | undefined = submission?.feedback[0]

        return (
          <div
            key={a.id}
            className="bg-white rounded-lg border border-gray-100 p-5 space-y-3"
          >
            <div>
              <h3 className="text-[13px] font-medium text-gray-800">{a.title}</h3>
              {a.instructions && (
                <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                  {a.instructions}
                </p>
              )}
              {a.max_words && (
                <p className="mt-1 text-[11px] text-gray-400">Max words: {a.max_words}</p>
              )}
            </div>

            {/* Submission status */}
            {submission ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className={[
                      'inline-block text-[10px] font-medium px-2 py-0.5 rounded-full',
                      submission.status === 'reviewed'
                        ? 'bg-brand-green-light text-brand-green'
                        : submission.status === 'submitted' || submission.status === 'under_review'
                        ? 'bg-amber-light text-amber'
                        : 'bg-gray-100 text-gray-500',
                    ].join(' ')}
                  >
                    {submission.status.replace('_', ' ')}
                  </span>
                  {submission.word_count && (
                    <span className="text-[11px] text-gray-400">{submission.word_count} words</span>
                  )}
                </div>

                {/* Feedback summary */}
                {feedback && (
                  <div className="rounded-lg bg-teal-light border border-teal/20 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-medium text-teal-text uppercase tracking-wide">
                        Feedback · {feedback.source}
                      </p>
                      {feedback.band_overall != null && (
                        <span className="font-display text-lg text-navy">
                          Band {feedback.band_overall}
                        </span>
                      )}
                    </div>
                    {feedback.strengths && (
                      <div>
                        <p className="text-[11px] font-medium text-gray-500">Strengths</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{feedback.strengths}</p>
                      </div>
                    )}
                    {feedback.improvements && (
                      <div>
                        <p className="text-[11px] font-medium text-gray-500">Areas to improve</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{feedback.improvements}</p>
                      </div>
                    )}
                    {feedback.detailed_notes && (
                      <div>
                        <p className="text-[11px] font-medium text-gray-500">Detailed notes</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{feedback.detailed_notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-gray-400 italic">No submission yet.</p>
            )}
          </div>
        )
      })}
    </section>
  )
}
