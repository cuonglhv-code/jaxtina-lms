import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'
import { TASK1_IMAGE_ANALYSIS_SYSTEM } from './prompts/task1ImageAnalysis'
import { EXAMINER_SYSTEM } from './prompts/examinerSystem'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScoreInput {
  submissionId: string
  content:      string
  ieltsTask:    'task1' | 'task2'
  instructions: string
  imageUrl?:    string
}

interface BandScores {
  band_ta:      number
  band_cc:      number
  band_lr:      number
  band_gra:     number
  band_overall: number
}

interface TokenUsage {
  prompt_tokens:     number
  completion_tokens: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MODEL = 'claude-sonnet-4-20250514'

/** Strip markdown fences Claude sometimes emits despite instructions. */
function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim()
}

/**
 * Sends a message and parses the response as JSON.
 * If parse fails, retries once with a clarification prompt.
 */
async function callAndParseJson<T>(
  client: Anthropic,
  params: Omit<Anthropic.MessageCreateParamsNonStreaming, 'model'>,
): Promise<{ data: T; usage: TokenUsage }> {
  const res = await client.messages.create({ ...params, model: MODEL })
  const rawText = (res.content[0] as Anthropic.TextBlock).text
  const usage: TokenUsage = {
    prompt_tokens:     res.usage.input_tokens,
    completion_tokens: res.usage.output_tokens,
  }

  try {
    return { data: JSON.parse(stripFences(rawText)) as T, usage }
  } catch {
    // One retry — append clarification as a new user turn
    const retryMessages: Anthropic.MessageParam[] = [
      ...(params.messages as Anthropic.MessageParam[]),
      { role: 'assistant', content: rawText },
      { role: 'user', content: 'Return ONLY the JSON object. No other text.' },
    ]
    const retry = await client.messages.create({
      ...params,
      model: MODEL,
      messages: retryMessages,
    })
    const retryText = (retry.content[0] as Anthropic.TextBlock).text
    return {
      data: JSON.parse(stripFences(retryText)) as T,
      usage: {
        prompt_tokens:     usage.prompt_tokens + retry.usage.input_tokens,
        completion_tokens: usage.completion_tokens + retry.usage.output_tokens,
      },
    }
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Fire-and-forget IELTS scoring pipeline.
 * Task 1: 3 API calls (image analysis → band scoring → bilingual feedback)
 * Task 2: 2 API calls (band scoring → bilingual feedback)
 *
 * On any error: reverts submission to 'submitted', logs to console.error,
 * and returns silently. Never throws.
 */
export async function scoreIeltsWriting({
  submissionId,
  content,
  ieltsTask,
  instructions,
  imageUrl,
}: ScoreInput): Promise<void> {
  const supabase = createAdminClient()
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  try {
    // Fetch submission to get learner_id for notifications
    const { data: submission } = await supabase
      .from('submissions')
      .select('learner_id')
      .eq('id', submissionId)
      .single()

    const learnerId = submission?.learner_id

    let totalUsage: TokenUsage = { prompt_tokens: 0, completion_tokens: 0 }

    // ── TASK 1 PIPELINE ─────────────────────────────────────────────────────

    let visualData: unknown = null

    if (ieltsTask === 'task1' && imageUrl) {
      // Call 0 — Visual extraction
      try {
        const imgRes = await fetch(imageUrl)
        if (!imgRes.ok) throw new Error(`Image fetch failed: ${imgRes.status}`)
        const imgBuffer = await imgRes.arrayBuffer()
        const base64 = Buffer.from(imgBuffer).toString('base64')
        const mediaType = (imgRes.headers.get('content-type') ?? 'image/jpeg') as
          | 'image/jpeg'
          | 'image/png'
          | 'image/gif'
          | 'image/webp'

        const { data, usage } = await callAndParseJson<unknown>(anthropic, {
          system: TASK1_IMAGE_ANALYSIS_SYSTEM,
          max_tokens: 1500,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: { type: 'base64', media_type: mediaType, data: base64 },
                },
                { type: 'text', text: 'Analyse this IELTS Task 1 image.' },
              ],
            },
          ],
        })

        if ((data as { error?: string }).error) {
          visualData = null
        } else {
          visualData = data
        }
        totalUsage.prompt_tokens     += usage.prompt_tokens
        totalUsage.completion_tokens += usage.completion_tokens
      } catch {
        // Non-fatal — scoring proceeds without image context
        visualData = null
      }
    }

    // ── Call 1 — Band scoring ──────────────────────────────────────────────

    const scoringUser =
      ieltsTask === 'task1'
        ? `You are scoring an IELTS Writing Task 1 essay.

VISUAL DATA EXTRACTED FROM THE CHART:
${visualData ? JSON.stringify(visualData, null, 2) : 'Image unavailable — score based on essay content alone.'}

TASK INSTRUCTIONS GIVEN TO CANDIDATE:
${instructions}

CANDIDATE ESSAY:
${content}

Using the Best Fit principle and band threshold guidance in your system instructions, score the essay on all four criteria.
Return ONLY valid JSON — no markdown, no preamble:
{ "band_ta": number, "band_cc": number, "band_lr": number, "band_gra": number, "band_overall": number }
All values: multiples of 0.5, range 1.0–9.0.
band_overall = mean of the four, rounded to nearest 0.5.`
        : `You are scoring an IELTS Writing Task 2 essay.

TASK INSTRUCTIONS GIVEN TO CANDIDATE:
${instructions}

CANDIDATE ESSAY:
${content}

Using the Best Fit principle and band threshold guidance in your system instructions, score the essay on all four criteria.
Return ONLY valid JSON — no markdown, no preamble:
{ "band_ta": number, "band_cc": number, "band_lr": number, "band_gra": number, "band_overall": number }
All values: multiples of 0.5, range 1.0–9.0.
band_overall = mean of the four, rounded to nearest 0.5.`

    const { data: scores, usage: scoringUsage } = await callAndParseJson<BandScores>(
      anthropic,
      {
        system: EXAMINER_SYSTEM,
        max_tokens: 300,
        messages: [{ role: 'user', content: scoringUser }],
      }
    )

    totalUsage.prompt_tokens     += scoringUsage.prompt_tokens
    totalUsage.completion_tokens += scoringUsage.completion_tokens

    // ── Call 2 — Bilingual feedback ────────────────────────────────────────

    const visualSummary =
      visualData && (visualData as { examiner_critical_features?: unknown }).examiner_critical_features
        ? JSON.stringify(
            (visualData as { examiner_critical_features: unknown }).examiner_critical_features,
            null,
            2
          )
        : 'Unavailable.'

    const feedbackUser =
      ieltsTask === 'task1'
        ? `You have scored this IELTS Writing Task 1 essay:
Band scores: TA ${scores.band_ta} | CC ${scores.band_cc} | LR ${scores.band_lr} | GRA ${scores.band_gra} | Overall ${scores.band_overall}

VISUAL DATA:
${visualSummary}

CANDIDATE ESSAY:
${content}

Using the Feedback Architecture in your system instructions (strengths → limiting factors → next steps, per criterion), write developmental feedback for the learner.

Return ONLY valid JSON — no markdown fences, no preamble:
{
  "feedback_en": "string — markdown formatted, ~350 words. Four sections: ## Task Achievement, ## Coherence and Cohesion, ## Lexical Resource, ## Grammatical Range and Accuracy. Each section: what was done well (with quoted examples from the essay), what is limiting the score, one or two concrete next steps.",
  "feedback_vi": "string — natural idiomatic Vietnamese translation of feedback_en. Same markdown structure. Not a literal translation."
}`
        : `You have scored this IELTS Writing Task 2 essay:
Band scores: TA ${scores.band_ta} | CC ${scores.band_cc} | LR ${scores.band_lr} | GRA ${scores.band_gra} | Overall ${scores.band_overall}

TASK INSTRUCTIONS GIVEN TO CANDIDATE:
${instructions}

CANDIDATE ESSAY:
${content}

Using the Feedback Architecture in your system instructions (strengths → limiting factors → next steps, per criterion), write developmental feedback for the learner.

Return ONLY valid JSON — no markdown fences, no preamble:
{
  "feedback_en": "string — markdown formatted, ~350 words. Four sections: ## Task Response, ## Coherence and Cohesion, ## Lexical Resource, ## Grammatical Range and Accuracy. Each section: what was done well (with quoted examples from the essay), what is limiting the score, one or two concrete next steps.",
  "feedback_vi": "string — natural idiomatic Vietnamese translation of feedback_en. Same markdown structure. Not a literal translation."
}`

    const {
      data: feedbackText,
      usage: feedbackUsage,
    } = await callAndParseJson<{ feedback_en: string; feedback_vi: string }>(anthropic, {
      system: EXAMINER_SYSTEM,
      max_tokens: 1500,
      messages: [{ role: 'user', content: feedbackUser }],
    })

    totalUsage.prompt_tokens     += feedbackUsage.prompt_tokens
    totalUsage.completion_tokens += feedbackUsage.completion_tokens

    // ── Insert feedback row ────────────────────────────────────────────────

    await supabase.from('feedback').insert({
      submission_id:     submissionId,
      source:            'ai',
      band_overall:      scores.band_overall,
      band_ta:           scores.band_ta,
      band_cc:           scores.band_cc,
      band_lr:           scores.band_lr,
      band_gra:          scores.band_gra,
      feedback_en:       feedbackText.feedback_en,
      feedback_vi:       feedbackText.feedback_vi,
      model_used:        MODEL,
      prompt_tokens:     totalUsage.prompt_tokens,
      completion_tokens: totalUsage.completion_tokens,
    } as never)

    // ── Update submission status ────────────────────────────────────────────

    await supabase
      .from('submissions')
      .update({ status: 'ai_scored' } as never)
      .eq('id', submissionId)

    // ── Notify learner ─────────────────────────────────────────────────────

    if (learnerId) {
      await supabase.from('notifications').insert({
        user_id:    learnerId,
        type:       'feedback_ready',
        title:      'Feedback ready',
        title_vi:   'Có phản hồi mới',
        body:       `Your IELTS Writing ${ieltsTask === 'task1' ? 'Task 1' : 'Task 2'} has been scored. Overall band: ${scores.band_overall}`,
        action_url: `/learner/submissions/${submissionId}`,
      } as never)
    }
  } catch {
    // Revert submission to 'submitted' so it doesn't get stuck
    try {
      await createAdminClient()
        .from('submissions')
        .update({ status: 'submitted' } as never)
        .eq('id', submissionId)
    } catch {
      // ignore revert failure
    }
  }
}
