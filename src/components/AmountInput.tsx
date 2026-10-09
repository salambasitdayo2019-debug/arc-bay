import { cn } from '@/lib/utils'
import { formatUsdc } from '@/lib/utils'

interface AmountInputProps {
  value: string
  onChange: (val: string) => void
  balance?: bigint
  placeholder?: string
  label?: string
  disabled?: boolean
}

export function AmountInput({
  value,
  onChange,
  balance,
  placeholder = '0.00',
  label = 'Amount',
  disabled,
}: AmountInputProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--subtle)]">
          {label}
        </label>
        {balance !== undefined && (
          <button
            type="button"
            onClick={() => onChange(formatUsdc(balance).replace(/,/g, ''))}
            className="text-xs text-[var(--accent-hover)] font-medium hover:underline"
          >
            Max {formatUsdc(balance)} USDC
          </button>
        )}
      </div>
      <div className={cn(
        'flex items-center gap-2 rounded-xl border px-4 py-3',
        'bg-[var(--surface-muted)] border-[var(--border)]',
        'focus-within:border-[var(--focus)] focus-within:ring-2 focus-within:ring-[var(--focus)]/20',
        disabled && 'opacity-50 cursor-not-allowed'
      )}>
        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent text-lg font-semibold text-[var(--ink)] tabular-nums outline-none placeholder:text-[var(--subtle)]"
        />
        <span className="text-sm font-semibold text-[var(--muted)]">USDC</span>
      </div>
    </div>
  )
}
