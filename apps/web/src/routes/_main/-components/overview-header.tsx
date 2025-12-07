import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AmountDisplay } from '@/components/expense'
import { type DateRange, getDateRangeLabel } from '@/lib/date-utils'

interface OverviewHeaderProps {
  totalSpent: number
  baseCurrency: string
  expenseCount: number
  dateRange: DateRange
  onDateRangeChange: (dateRange: DateRange) => void
  isLoading?: boolean
  children?: React.ReactNode
}

export function OverviewHeader({ totalSpent, baseCurrency, expenseCount, dateRange, onDateRangeChange, isLoading, children }: OverviewHeaderProps) {
  return (
    <div className="px-4 pt-12 pb-4 bg-background/80 sticky top-0 z-10 border-b border-border/50 backdrop-blur-xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Overview</h1>
        <Select value={dateRange} onValueChange={(value) => onDateRangeChange(value as DateRange)}>
          <SelectTrigger className="h-8 w-auto border-border bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full text-xs font-mono uppercase tracking-wider px-3">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="last-month">Last Month</SelectItem>
            <SelectItem value="last-7-days">Last 7 Days</SelectItem>
            <SelectItem value="all-time">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mb-2">
        <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">Total Spent • {getDateRangeLabel(dateRange)}</div>
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
