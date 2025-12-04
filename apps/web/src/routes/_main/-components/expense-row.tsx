import { Link } from '@tanstack/react-router'

import { formatAmount, formatDate, StatusBadge } from '@/components/expense'

interface ExpenseRowProps {
  expense: {
    id: string
    status: string
    amount: number | null
    currency: string | null
    baseAmount: number | null
    baseCurrency: string | null
    merchant: string | null
    createdAt: Date
    expenseDate: Date | null
  }
  baseCurrency: string
}

export function ExpenseRow({ expense, baseCurrency }: ExpenseRowProps) {
  const isProcessing =
    expense.status === 'submitted' || expense.status === 'processing'

  const displayDate = expense.expenseDate || expense.createdAt
  const isDifferentCurrency =
    expense.currency && expense.currency !== baseCurrency
  const displayAmount = expense.baseAmount ?? expense.amount

  return (
    <Link
      to="/expenses/$id"
      params={{ id: expense.id }}
      className="flex items-center justify-between py-4 border-b border-border/50 last:border-b-0 hover:bg-muted/50 -mx-2 px-2 rounded-md transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`font-medium truncate ${isProcessing ? 'text-muted-foreground' : ''}`}
          >
            {expense.merchant || 'Unknown merchant'}
          </span>
          <StatusBadge status={expense.status} />
        </div>
        <div className="text-sm text-muted-foreground">
          {formatDate(displayDate)}
        </div>
      </div>
      <div className="text-right">
        <div
          className={`font-mono font-semibold tabular-nums ${isProcessing ? 'text-muted-foreground' : ''}`}
        >
          {isProcessing ? '...' : formatAmount(displayAmount, baseCurrency)}
        </div>
        {!isProcessing && isDifferentCurrency && expense.amount !== null && (
          <div className="text-xs text-muted-foreground font-mono tabular-nums">
            {formatAmount(expense.amount, expense.currency)}
          </div>
        )}
      </div>
    </Link>
  )
}
