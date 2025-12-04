import {
  formatAmount,
  getDateRangeLabel,
  type DateRange,
} from '@/components/expense'

interface TotalSpentProps {
  amount: number
  currency: string
  dateRange: DateRange
  expenseCount: number
  isLoading: boolean
}

export function TotalSpent({
  amount,
  currency,
  dateRange,
  expenseCount,
  isLoading,
}: TotalSpentProps) {
  return (
    <div className="mb-8">
      <div className="text-sm font-mono text-muted-foreground uppercase tracking-widest mb-1">
        Total Spent · {getDateRangeLabel(dateRange)}
      </div>
      <div className="text-5xl font-mono font-bold tracking-tighter tabular-nums">
        {isLoading ? (
          <span className="text-muted-foreground">...</span>
        ) : (
          formatAmount(amount, currency)
        )}
      </div>
      {!isLoading && (
        <div className="text-sm text-muted-foreground mt-1">
          from {expenseCount} {expenseCount === 1 ? 'expense' : 'expenses'}
        </div>
      )}
    </div>
  )
}
