import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-5 backdrop-blur-sm',
        'bg-white/70 border-[var(--border)]',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--subtle)] mb-1">
      {children}
    </p>
  )
}

export function CardValue({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('display text-2xl font-bold text-[var(--ink)] tabular-nums', className)}>
      {children}
    </p>
  )
}
