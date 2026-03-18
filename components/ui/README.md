# /components/ui

Primitive, reusable UI components with no LMS domain knowledge.

## Planned components
- `Button` — variants: primary, secondary, ghost, destructive
- `Input` / `Textarea` — accessible form fields
- `Modal` / `Dialog` — focus-trapped overlay
- `Badge` — status and role indicators
- `Avatar` — user avatar with fallback initials
- `Spinner` — loading indicator
- `Toast` — notification toasts

## Rules
- No inline styles — Tailwind utility classes only
- Every interactive element needs `aria-label` or a visible label
- All user-facing strings via `next-intl` translation keys
