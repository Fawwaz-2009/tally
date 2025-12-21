import { Card, CardContent } from '@/components/ui/card'
import { formatAmount } from '@/lib/expense-utils'

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

interface TotalSpendingCardProps {
  totalSpending: number
  expenseCount: number
  month: number
  year: number
  currency: string
}

export function TotalSpendingCard({ totalSpending, expenseCount, month, year, currency }: TotalSpendingCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center">
          <div className="text-sm font-mono text-muted-foreground uppercase tracking-widest mb-2">Total Spending · {monthNames[month]} {year}</div>
          <div className="text-4xl md:text-5xl font-mono font-bold tracking-tighter tabular-nums">{formatAmount(totalSpending, currency)}</div>
          <div className="text-sm text-muted-foreground mt-2">
            from {expenseCount} expense{expenseCount !== 1 ? 's' : ''}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
