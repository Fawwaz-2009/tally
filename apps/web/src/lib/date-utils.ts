/**
 * Date range type for filtering
 */
export type DateRange = 'last-7-days' | 'this-month' | 'last-month' | 'all-time'

/**
 * Format date to a relative or short date string
 * - Today, Yesterday for recent dates
 * - Day name for within the last week
 * - Short date format otherwise
 */
export function formatDate(date: Date | string): string {
  const now = new Date()
  const expenseDate = new Date(date)
  const diffInDays = Math.floor(
    (now.getTime() - expenseDate.getTime()) / (1000 * 60 * 60 * 24),
  )

  if (diffInDays === 0) {
    return 'Today'
  } else if (diffInDays === 1) {
    return 'Yesterday'
  } else if (diffInDays < 7) {
    return expenseDate.toLocaleDateString('en-US', { weekday: 'long' })
  } else {
    return expenseDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year:
        expenseDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }
}

/**
 * Format date for HTML date input (YYYY-MM-DD)
 */
export function formatDateForInput(
  date: Date | string | null | undefined,
): string {
  if (!date) return ''
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}

/**
 * Get date range boundaries for filtering
 */
export function getDateRangeBounds(
  dateRange: DateRange | undefined,
): { start: Date; end: Date } | null {
  if (!dateRange || dateRange === 'all-time') return null

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  if (dateRange === 'last-7-days') {
    const start = new Date(now)
    start.setDate(start.getDate() - 6)
    start.setHours(0, 0, 0, 0)
    return {
      start,
      end: new Date(year, month, now.getDate(), 23, 59, 59, 999),
    }
  }

  if (dateRange === 'this-month') {
    return {
      start: new Date(year, month, 1),
      end: new Date(year, month + 1, 0, 23, 59, 59, 999),
    }
  }

  if (dateRange === 'last-month') {
    return {
      start: new Date(year, month - 1, 1),
      end: new Date(year, month, 0, 23, 59, 59, 999),
    }
  }

  return null
}

/**
 * Get human-readable label for date range
 */
export function getDateRangeLabel(dateRange: DateRange | undefined): string {
  switch (dateRange) {
    case 'last-7-days':
      return 'Last 7 Days'
    case 'this-month':
      return 'This Month'
    case 'last-month':
      return 'Last Month'
    case 'all-time':
      return 'All Time'
    default:
      return 'This Month'
  }
}
