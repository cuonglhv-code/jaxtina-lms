import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, id, className = '', ...props }: InputProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[11px] font-medium uppercase tracking-wide text-gray-400"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={[
          'w-full rounded-md border px-3.5 py-2.5 text-sm transition-colors',
          'focus:outline-none',
          error
            ? 'border-red-300 bg-red-50 focus:border-red-400'
            : 'border-gray-200 bg-gray-50 focus:bg-white focus:border-navy/40',
          className,
        ].join(' ')}
        aria-describedby={error ? `${inputId}-error` : undefined}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} role="alert" className="text-[11px] text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
