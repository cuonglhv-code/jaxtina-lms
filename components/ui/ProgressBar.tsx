type Size = 'sm' | 'md'

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'h-1',
  md: 'h-1.5',
}

interface ProgressBarProps {
  value:      number   // 0–100
  size?:      Size
  showLabel?: boolean
  className?: string
}

export function ProgressBar({
  value,
  size      = 'md',
  showLabel = false,
  className = '',
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div className={['flex items-center gap-2', className].join(' ')}>
      <div
        className={['flex-1 bg-gray-100 rounded-full overflow-hidden', SIZE_CLASSES[size]].join(' ')}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${clamped}% complete`}
      >
        <div
          className="h-full bg-navy rounded-full transition-all duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="flex-shrink-0 text-[11px] font-medium text-gray-500 tabular-nums">
          {clamped}%
        </span>
      )}
    </div>
  )
}
