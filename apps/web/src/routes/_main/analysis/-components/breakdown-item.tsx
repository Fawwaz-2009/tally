import { Link } from '@tanstack/react-router'

import { formatAmount } from '@/components/expense'

import { ProgressBar } from './progress-bar'

interface BreakdownItemProps {
  label: string
  amount: number
  percentage: number
  maxAmount: number
  color?: string
  currency?: string
}

export function BreakdownItem({
  label,
  amount,
  percentage,
  maxAmount,
  color = 'bg-primary',
  currency = 'USD',
}: BreakdownItemProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium truncate flex-1 mr-2">{label}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="font-mono text-sm tabular-nums">
            {formatAmount(amount, currency)}
          </span>
          <span className="text-xs text-muted-foreground w-10 text-right">
            {percentage}%
          </span>
        </div>
      </div>
      <ProgressBar value={amount} max={maxAmount} color={color} />
    </div>
  )
}

interface CategoryBreakdownItemProps extends BreakdownItemProps {
  count: number
}

export function CategoryBreakdownItem({
  label,
  amount,
  count,
  percentage,
  maxAmount,
  color = 'bg-primary',
  currency = 'USD',
}: CategoryBreakdownItemProps) {
  return (
    <Link
      to="/"
      search={{ dateRange: 'all-time', category: label }}
      className="block space-y-2 -mx-2 px-2 py-2 rounded-md hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="font-medium truncate">{label}</span>
          <span className="text-xs text-muted-foreground">
            ({count} expense{count !== 1 ? 's' : ''})
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="font-mono text-sm tabular-nums">
            {formatAmount(amount, currency)}
          </span>
          <span className="text-xs text-muted-foreground w-10 text-right">
            {percentage}%
          </span>
        </div>
      </div>
      <ProgressBar value={amount} max={maxAmount} color={color} />
    </Link>
  )
}
