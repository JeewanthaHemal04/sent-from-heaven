import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftAddon?: ReactNode
  rightAddon?: ReactNode
}

export function Input({
  label,
  error,
  hint,
  leftAddon,
  rightAddon,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-ink-secondary uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftAddon && (
          <span className="absolute left-3 text-ink-tertiary pointer-events-none">
            {leftAddon}
          </span>
        )}
        <input
          id={inputId}
          {...props}
          className={cn(
            'w-full bg-surface-elevated border border-surface-border rounded-lg',
            'px-3 py-2.5 text-sm text-ink-primary placeholder:text-ink-tertiary',
            'transition-colors duration-150',
            'focus:outline-none focus:border-coral-500 focus:ring-1 focus:ring-coral-500/30',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-rose focus:border-rose focus:ring-rose/20',
            leftAddon && 'pl-9',
            rightAddon && 'pr-9',
            className
          )}
        />
        {rightAddon && (
          <span className="absolute right-3 text-ink-tertiary pointer-events-none">
            {rightAddon}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-rose">{error}</p>}
      {!error && hint && <p className="text-xs text-ink-tertiary">{hint}</p>}
    </div>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export function Textarea({ label, error, hint, className, id, ...props }: TextareaProps) {
  const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={textareaId} className="text-xs font-medium text-ink-secondary uppercase tracking-wider">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        {...props}
        className={cn(
          'w-full bg-surface-elevated border border-surface-border rounded-lg',
          'px-3 py-2.5 text-sm text-ink-primary placeholder:text-ink-tertiary',
          'resize-y min-h-[80px] transition-colors duration-150',
          'focus:outline-none focus:border-coral-500 focus:ring-1 focus:ring-coral-500/30',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error && 'border-rose focus:border-rose',
          className
        )}
      />
      {error && <p className="text-xs text-rose">{error}</p>}
      {!error && hint && <p className="text-xs text-ink-tertiary">{hint}</p>}
    </div>
  )
}
