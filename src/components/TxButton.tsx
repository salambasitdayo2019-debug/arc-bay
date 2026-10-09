import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface TxButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean
  loadingText?: string
  variant?: 'primary' | 'secondary' | 'danger'
}

export function TxButton({
  children,
  isLoading,
  loadingText = 'Confirming...',
  variant = 'primary',
  className,
  disabled,
  ...props
}: TxButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={cn(
        'flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        variant === 'primary' && 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]',
        variant === 'secondary' && 'bg-[var(--surface-muted)] text-[var(--ink)] hover:bg-[var(--border)]',
        variant === 'danger' && 'bg-[var(--danger)] text-white hover:opacity-90',
        className
      )}
      {...props}
    >
      {isLoading && <Loader2 size={15} className="animate-spin" />}
      {isLoading ? loadingText : children}
    </button>
  )
}
