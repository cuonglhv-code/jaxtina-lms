import type { ReactNode } from 'react'

type Padding = 'sm' | 'md' | 'lg'

const PADDING_CLASSES: Record<Padding, string> = {
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

interface CardProps {
  children:   ReactNode
  className?: string
  padding?:   Padding
}

export function Card({ children, className = '', padding = 'md' }: CardProps) {
  return (
    <div
      className={[
        'bg-white border border-gray-100 rounded-lg',
        PADDING_CLASSES[padding],
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}
