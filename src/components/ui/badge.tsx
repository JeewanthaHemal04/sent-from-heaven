import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'coral' | 'success' | 'error' | 'warning' | 'gold' | 'info'

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
  size?: 'sm' | 'md'
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-surface-elevated border-surface-border text-ink-secondary',
  coral: 'bg-coral-900/40 border-coral-700/40 text-coral-400',
  success: 'bg-emerald-bg border-emerald/20 text-emerald',
  error: 'bg-rose-bg border-rose/20 text-rose',
  warning: 'bg-amber-bg border-amber/20 text-amber',
  gold: 'bg-gold-muted/20 border-gold/20 text-gold',
  info: 'bg-sky-950 border-sky-800/30 text-sky-400',
}

export function Badge({ variant = 'default', size = 'sm', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium border rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-[11px] gap-1' : 'px-3 py-1 text-xs gap-1.5',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

/** Role badge */
export function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    owner: { variant: 'gold', label: 'Owner' },
    manager: { variant: 'coral', label: 'Manager' },
    worker: { variant: 'default', label: 'Worker' },
  }
  const config = map[role] ?? { variant: 'default', label: role }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

/** Movement type badge */
export function MovementBadge({ type }: { type: string }) {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    GRN: { variant: 'success', label: 'GRN' },
    TradingGRN: { variant: 'gold', label: 'Trading GRN' },
    TransferIn: { variant: 'coral', label: 'Transfer In' },
    CR: { variant: 'error', label: 'CR' },
    TransferOut: { variant: 'warning', label: 'Transfer Out' },
  }
  const config = map[type] ?? { variant: 'default', label: type }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
