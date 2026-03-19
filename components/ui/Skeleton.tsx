interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={['animate-pulse bg-gray-100 rounded', className].join(' ')}
    />
  )
}
