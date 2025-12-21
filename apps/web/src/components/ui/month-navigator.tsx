import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface MonthNavigatorProps {
  month: number // 0-11
  year: number
  onMonthChange: (month: number, year: number) => void
  className?: string
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function MonthNavigator({
  month,
  year,
  onMonthChange,
  className
}: MonthNavigatorProps) {
  const handlePrevious = () => {
    if (month === 0) {
      onMonthChange(11, year - 1)
    } else {
      onMonthChange(month - 1, year)
    }
  }

  const handleNext = () => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    // Don't go beyond current month
    if (year === currentYear && month === currentMonth) {
      return
    }

    if (month === 11) {
      onMonthChange(0, year + 1)
    } else {
      onMonthChange(month + 1, year)
    }
  }

  const handleToday = () => {
    const now = new Date()
    onMonthChange(now.getMonth(), now.getFullYear())
  }

  // Check if we're at current month
  const now = new Date()
  const isCurrentMonth = month === now.getMonth() && year === now.getFullYear()
  const canGoNext = !isCurrentMonth

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePrevious}
        className="h-8 w-8"
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        onClick={handleToday}
        className="min-w-[140px] font-medium"
        aria-label="Jump to current month"
      >
        {monthNames[month]} {year}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleNext}
        disabled={!canGoNext}
        className="h-8 w-8"
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}