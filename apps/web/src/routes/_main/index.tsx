import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { useMemo } from 'react'

import { useTRPC } from '@/integrations/trpc-react'
import { getDateRangeBounds, type DateRange } from '@/lib/date-utils'
import { OverviewHeader, StatusBanners, FilterBar, ExpenseList, type ExpenseCardData } from './-components'

const dashboardSearchSchema = z.object({
  dateRange: z.enum(['last-7-days', 'this-month', 'last-month', 'all-time']).default('this-month'),
  userId: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
})

export const Route = createFileRoute('/_main/')({
  component: Dashboard,
  validateSearch: dashboardSearchSchema,
  beforeLoad: async ({ context }) => {
    const isSetupComplete = await context.queryClient.fetchQuery(context.trpc.settings.isSetupComplete.queryOptions())
    if (!isSetupComplete) {
      throw redirect({ to: '/setup' })
    }
  },
})

function Dashboard() {
  const trpc = useTRPC()
  const navigate = useNavigate({ from: '/' })
  const filters = Route.useSearch()

  // Use listAll to get both draft and complete expenses for the dashboard
  const expensesQuery = useQuery(trpc.expenses.listAll.queryOptions())
  const usersQuery = useQuery(trpc.users.list.queryOptions())
  const baseCurrencyQuery = useQuery(trpc.settings.getBaseCurrency.queryOptions())
  const pendingReviewQuery = useQuery(trpc.expenses.pendingReviewCount.queryOptions())

  const hasActiveFilters = Boolean((filters.dateRange && filters.dateRange !== 'this-month') || filters.userId || filters.category || filters.search)

  const handleDateRangeChange = (dateRange: DateRange) => {
    navigate({
      search: (prev) => ({ ...prev, dateRange }),
      replace: true,
    })
  }

  const handleUserFilterChange = (userId: string | undefined) => {
    navigate({
      search: (prev) => ({ ...prev, userId }),
      replace: true,
    })
  }

  const handleClearFilters = () => {
    navigate({
      search: { dateRange: 'this-month' },
      replace: true,
    })
  }

  const filteredExpenses = useMemo(() => {
    if (!expensesQuery.data) return []

    let result = [...expensesQuery.data]

    const dateRange = getDateRangeBounds(filters.dateRange)
    if (dateRange) {
      result = result.filter((expense) => {
        const dateToCheck = new Date(expense.expenseDate || expense.receipt.capturedAt)
        return dateToCheck >= dateRange.start && dateToCheck <= dateRange.end
      })
    }

    if (filters.userId) {
      result = result.filter((expense) => expense.userId === filters.userId)
    }

    if (filters.category) {
      result = result.filter((expense) => expense.categories?.includes(filters.category!))
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter((expense) => {
        const merchantMatch = expense.merchant?.toLowerCase().includes(searchLower)
        const categoryMatch = expense.categories?.some((cat) => cat.toLowerCase().includes(searchLower))
        return merchantMatch || categoryMatch
      })
    }

    return result.sort((a, b) => {
      const dateA = new Date(a.expenseDate || a.receipt.capturedAt).getTime()
      const dateB = new Date(b.expenseDate || b.receipt.capturedAt).getTime()
      return dateB - dateA
    })
  }, [expensesQuery.data, filters.dateRange, filters.userId, filters.category, filters.search])

  // Only show complete expenses in the main list
  const displayExpenses = useMemo((): ExpenseCardData[] => {
    return filteredExpenses.filter((expense) => expense.state === 'complete')
  }, [filteredExpenses])

  // Count processing expenses (draft with pending/processing extraction)
  const processingCount = useMemo(() => {
    if (!expensesQuery.data) return 0
    return expensesQuery.data.filter(
      (expense) => expense.state === 'draft' && (expense.receipt.extraction.status === 'pending' || expense.receipt.extraction.status === 'processing'),
    ).length
  }, [expensesQuery.data])

  const totalSpent = useMemo(() => {
    return displayExpenses.reduce((sum, expense) => {
      const amountToAdd = expense.baseAmount ?? expense.amount ?? 0
      return sum + amountToAdd
    }, 0)
  }, [displayExpenses])

  const baseCurrency = baseCurrencyQuery.data ?? 'USD'

  return (
    <div className="pb-24">
      <OverviewHeader
        totalSpent={totalSpent}
        baseCurrency={baseCurrency}
        expenseCount={displayExpenses.length}
        dateRange={filters.dateRange}
        onDateRangeChange={handleDateRangeChange}
        isLoading={expensesQuery.isLoading}
      />

      <StatusBanners needsReviewCount={pendingReviewQuery.data ?? 0} processingCount={processingCount} />

      <FilterBar selectedUserId={filters.userId} onUserFilterChange={handleUserFilterChange} users={usersQuery.data} />

      <ExpenseList
        expenses={displayExpenses}
        baseCurrency={baseCurrency}
        users={usersQuery.data}
        isLoading={expensesQuery.isLoading}
        isError={expensesQuery.isError}
        errorMessage={expensesQuery.error?.message}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
      />
    </div>
  )
}
