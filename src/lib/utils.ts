import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a number as Sri Lankan Rupees */
export function formatLKR(amount: number): string {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/** Format a number with + or - sign prefix */
export function formatVariance(qty: number): string {
  if (qty > 0) return `+${qty}`
  return String(qty)
}

/** Return today's date in YYYY-MM-DD using Sri Lanka timezone (UTC+5:30) */
export function todaySL(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' })
}

/** Format a YYYY-MM-DD date string for display */
export function formatDate(date: string): string {
  return new Date(`${date}T00:00:00+05:30`).toLocaleDateString('en-LK', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** Format a timestamp for display */
export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-LK', {
    timeZone: 'Asia/Colombo',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const MOVEMENT_LABELS: Record<string, string> = {
  GRN: 'GRN',
  TradingGRN: 'Trading GRN',
  TransferIn: 'Transfer In',
  CR: 'CR',
  TransferOut: 'Transfer Out',
}

export const MOVEMENT_COLORS: Record<string, string> = {
  GRN: 'text-emerald bg-emerald-bg border-emerald/20',
  TradingGRN: 'text-gold bg-gold-muted/20 border-gold/20',
  TransferIn: 'text-coral-400 bg-coral-900/30 border-coral-700/30',
  CR: 'text-rose bg-rose-bg border-rose/20',
  TransferOut: 'text-amber bg-amber-bg border-amber/20',
}

export const STOCK_IN_TYPES = ['GRN', 'TradingGRN', 'TransferIn'] as const
export const STOCK_OUT_TYPES = ['CR', 'TransferOut'] as const

export type MovementType = 'GRN' | 'TradingGRN' | 'TransferIn' | 'CR' | 'TransferOut'
export type UserRole = 'owner' | 'manager' | 'worker'
