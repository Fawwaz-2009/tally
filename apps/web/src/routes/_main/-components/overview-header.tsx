import { AmountDisplay } from '@/components/expense/amount-display'
import { MonthNavigator } from '@/components/ui/month-navigator'

interface OverviewHeaderProps {
  totalSpent: number
  baseCurrency: string
  expenseCount: number
  month: number
  year: number
  onMonthChange: (month: number, year: number) => void
  isLoading?: boolean
  children?: React.ReactNode
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function OverviewHeader({ totalSpent, baseCurrency, expenseCount, month, year, onMonthChange, isLoading, children }: OverviewHeaderProps) {
  return (
    <div className="px-4 pt-12 pb-4 bg-background/80 sticky top-0 z-10 border-b border-border/50 backdrop-blur-xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Overview</h1>
        <MonthNavigator
          month={month}
          year={year}
          onMonthChange={onMonthChange}
        />
      </div>

      <div className="mb-2">
        <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">Total Spent • {monthNames[month]} {year}</div>
        <AmountDisplay amount={totalSpent} currency={baseCurrency} size="hero" isLoading={isLoading} />
        {!isLoading && (
          <div className="text-xs font-mono text-muted-foreground mt-2">
            from {expenseCount} expense{expenseCount !== 1 ? 's' : ''}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}
