import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}

export function Modal({ open, onClose, title, children, className, size = 'md' }: ModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Prevent body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          'relative w-full bg-surface-card border border-surface-border rounded-2xl shadow-elevated',
          'flex flex-col max-h-[85dvh] overflow-hidden',
          sizeClasses[size],
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border shrink-0">
            <h2 className="font-semibold text-ink-primary">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-ink-tertiary hover:text-ink-primary hover:bg-surface-elevated transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div
          className="overflow-y-auto flex-1 p-6"
          style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
        >{children}</div>
      </div>
    </div>
  )
}

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  isLoading?: boolean
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-ink-secondary mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm rounded-lg border border-surface-border text-ink-secondary hover:text-ink-primary hover:bg-surface-elevated transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={cn(
            'px-4 py-2 text-sm rounded-lg font-medium transition-colors disabled:opacity-50',
            danger
              ? 'bg-rose-bg border border-rose/30 text-rose hover:bg-rose/20'
              : 'bg-coral-500 hover:bg-coral-600 text-white'
          )}
        >
          {isLoading ? '…' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
