import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronRight, ChevronLeft, ChevronRight as Next, ExternalLink,
  PlayCircle, BookOpen, PenLine, Video, FileText,
} from 'lucide-react'
import { marked } from 'marked'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { LessonCompleteButton } from '@/components/lms/lesson-complete-button'
import { IeltsWritingForm } from '@/components/lms/IeltsWritingForm'
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

  const t = await getTranslations()
  const isCompleted = progressRow?.completed ?? false
  const Icon = LESSON_ICONS[lesson.lesson_type] ?? PlayCircle

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
    <div className="max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-slate-500 flex-wrap">
        <Link href="/learner/dashboard" className="hover:text-slate-800 transition-colors">
          {t('lessons.breadcrumbDashboard')}
        </Link>
        <ChevronRight size={14} className="flex-shrink-0" />
        <Link href={`/learner/courses/${courseId}`} className="hover:text-slate-800 transition-colors truncate max-w-[140px]">
          {module_.course?.title ?? 'Course'}
        </Link>
        <ChevronRight size={14} className="flex-shrink-0" />
        <span className="text-slate-800 font-medium truncate">{lesson.title}</span>
      </nav>

      {/* Lesson header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Icon size={16} className="text-indigo-500" aria-hidden />
          <span className="text-xs font-medium text-indigo-600 uppercase tracking-wide">
            {module_.title}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{lesson.title}</h1>
      </div>

      {/* ── Content area ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <LessonContent
          lesson={lesson}
          contentHtml={contentHtml}
          ieltsAssignment={ieltsAssignment}
          ieltsSubmission={ieltsSubmission}
          preferredLang={preferredLang}
          t={t}
        />
      </div>

      {/* Assignments / submissions — not rendered for ielts_writing (handled inside IeltsWritingForm) */}
      {lesson.lesson_type !== 'ielts_writing' && (assignments ?? []).length > 0 && (
        <AssignmentsSection assignments={assignments ?? []} t={t} />
      )}

      {/* Mark as complete + Prev/Next navigation */}
      <footer className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200">
        {/* Prev */}
        <div className="flex-1">
          {prevLesson && (
            <Link
              href={`/learner/courses/${courseId}/lessons/${prevLesson.id}`}
              className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-indigo-600 transition-colors"
            >
              <ChevronLeft size={16} aria-hidden />
              <span className="truncate max-w-[160px]">{prevLesson.title}</span>
            </Link>
          )}
        </div>

        {/* Mark complete */}
        <LessonCompleteButton lessonId={lessonId} initialCompleted={isCompleted} />

        {/* Next */}
        <div className="flex-1 flex justify-end">
          {nextLesson && (
            <Link
              href={`/learner/courses/${courseId}/lessons/${nextLesson.id}`}
              className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-indigo-600 transition-colors"
            >
              <span className="truncate max-w-[160px]">{nextLesson.title}</span>
              <Next size={16} aria-hidden />
            </Link>
          )}
        </div>
      </footer>
    </div>
  )
}

// ── LessonContent — renders the right UI per lesson_type ─────────────────────

type TAll = Awaited<ReturnType<typeof getTranslations>>

function LessonContent({
  lesson,
  contentHtml,
  ieltsAssignment,
  ieltsSubmission,
  preferredLang,
  t,
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
  t: TAll
}) {
  switch (lesson.lesson_type) {
    case 'video': {
      if (!lesson.content_url) {
        return <EmptyContent message={t('lessons.noVideo')} />
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
            className="w-full rounded-none"
            aria-label="Lesson video"
          />
        )
      }
      // Fallback: link
      return (
        <div className="p-6">
          <a
            href={lesson.content_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline"
          >
            <ExternalLink size={15} aria-hidden />
            {t('lessons.openVideo')}
          </a>
        </div>
      )
    }

    case 'reading':
    case 'exercise': {
      if (!contentHtml) {
        return <EmptyContent message={t('lessons.noContent')} />
      }
      return (
        <article
          className="prose prose-slate max-w-none p-6 sm:p-8"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      )
    }

    case 'live': {
      return (
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">
            {t('lessons.liveSessionInfo')}
          </p>
          {lesson.content_url ? (
            <a
              href={lesson.content_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <ExternalLink size={15} aria-hidden />
              {t('lessons.joinSession')}
            </a>
          ) : (
            <p className="text-sm text-slate-400 italic">{t('lessons.noSessionLink')}</p>
          )}
          {lesson.duration_mins && (
            <p className="text-xs text-slate-500">{t('lessons.duration', { mins: lesson.duration_mins })}</p>
          )}
        </div>
      )
    }

    case 'ielts_writing': {
      if (!ieltsAssignment) {
        return <EmptyContent message={t('lessons.noAssignment')} />
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
      return <EmptyContent message={t('lessons.unsupportedType')} />
    }
  }
}

function EmptyContent({ message }: { message: string }) {
  return (
    <div className="p-6 text-sm text-slate-400 italic">{message}</div>
  )
}

// ── AssignmentsSection ────────────────────────────────────────────────────────

// Re-used from lib/validations/submission — duplicated locally to keep server component self-contained
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

function AssignmentsSection({ assignments, t }: { assignments: AssignmentRow[]; t: TAll }) {
  return (
    <section className="space-y-4" aria-label={t('lessons.assignments')}>
      <h2 className="text-base font-semibold text-slate-800">{t('lessons.assignments')}</h2>
      {assignments.map(a => {
        const submission: SubmissionRow | undefined = a.submissions[0]
        const feedback: LocalFeedbackRow | undefined = submission?.feedback[0]

        return (
          <div
            key={a.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3"
          >
            <div>
              <h3 className="text-sm font-semibold text-slate-800">{a.title}</h3>
              {a.instructions && (
                <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                  {a.instructions}
                </p>
              )}
              {a.max_words && (
                <p className="mt-1 text-xs text-slate-400">{t('lessons.maxWords', { max: a.max_words })}</p>
              )}
            </div>

            {/* Submission status */}
            {submission ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className={[
                      'inline-block text-xs font-medium px-2 py-0.5 rounded-full',
                      submission.status === 'reviewed'
                        ? 'bg-green-100 text-green-700'
                        : submission.status === 'submitted' || submission.status === 'ai_scored'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-500',
                    ].join(' ')}
                  >
                    {submission.status.replace('_', ' ')}
                  </span>
                  {submission.word_count && (
                    <span className="text-xs text-slate-400">{submission.word_count} words</span>
                  )}
                </div>

                {/* Feedback summary */}
                {feedback && (
                  <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-indigo-800 uppercase tracking-wide">
                        Feedback · {feedback.source}
                      </p>
                      {feedback.band_overall != null && (
                        <span className="text-lg font-bold text-indigo-700">
                          {t('feedback.bandLabel', { score: feedback.band_overall })}
                        </span>
                      )}
                    </div>
                    {feedback.strengths && (
                      <div>
                        <p className="text-xs font-medium text-slate-500">{t('lessons.strengths')}</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{feedback.strengths}</p>
                      </div>
                    )}
                    {feedback.improvements && (
                      <div>
                        <p className="text-xs font-medium text-slate-500">{t('lessons.areasToImprove')}</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{feedback.improvements}</p>
                      </div>
                    )}
                    {feedback.detailed_notes && (
                      <div>
                        <p className="text-xs font-medium text-slate-500">{t('lessons.detailedNotes')}</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{feedback.detailed_notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">{t('lessons.noSubmission')}</p>
            )}
          </div>
        )
      })}
    </section>
  )
}
