import { Card, CardContent } from '@/components/ui/card'
import { formatAmount, getDateRangeLabel, type DateRange } from '@/components/expense'

interface TotalSpendingCardProps {
  totalSpending: number
  expenseCount: number
  dateRange: DateRange
  currency: string
}

export function TotalSpendingCard({ totalSpending, expenseCount, dateRange, currency }: TotalSpendingCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center">
          <div className="text-sm font-mono text-muted-foreground uppercase tracking-widest mb-2">Total Spending · {getDateRangeLabel(dateRange)}</div>
          <div className="text-4xl md:text-5xl font-mono font-bold tracking-tighter tabular-nums">{formatAmount(totalSpending, currency)}</div>
          <div className="text-sm text-muted-foreground mt-2">
            from {expenseCount} expense{expenseCount !== 1 ? 's' : ''}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
