import type { ReactNode } from 'react'

type Variant = 'teal' | 'blue' | 'amber' | 'red' | 'green' | 'gray'

const VARIANT_CLASSES: Record<Variant, string> = {
  teal:  'bg-teal-light  text-teal-text',
  blue:  'bg-brand-blue-light  text-brand-blue',
  amber: 'bg-amber-light text-amber',
  red:   'bg-brand-red-light   text-brand-red',
  green: 'bg-brand-green-light text-brand-green',
  gray:  'bg-gray-100    text-gray-500',
}

interface BadgeProps {
  children:  ReactNode
  variant?:  Variant
  className?: string
}

export function Badge({ children, variant = 'gray', className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-block text-[10px] font-medium px-2.5 py-0.5 rounded-full',
        VARIANT_CLASSES[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  )
}
