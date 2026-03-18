# /lib/anthropic

Server-side Anthropic API wrappers for AI-powered features.

## Planned files
- `client.ts` — initialise the Anthropic SDK with `ANTHROPIC_API_KEY`
- `feedback.ts` — generate IELTS writing feedback (Task 1 / Task 2 two-call architecture)
- `prompts.ts` — system prompt constants

## Rules
- Model: `claude-sonnet-4-20250514` — do not substitute
- Max tokens: 1500 for feedback generation, 500 for short completions
- Always include a system prompt; never pass raw user input directly
- Wrap all calls in try/catch with graceful fallback
- Never import from `"use client"` files
