import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { useMemo } from 'react'

import { ExpenseList, FilterBar, OverviewHeader } from './-components'
import type { Expense } from '@repo/data-ops/schemas'
import type { DateRange } from '@/lib/date-utils'
import { useTRPC } from '@/integrations/trpc-react'
import { getDateRangeBounds } from '@/lib/date-utils'

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

  const expensesQuery = useQuery(trpc.expenses.list.queryOptions())
  const usersQuery = useQuery(trpc.users.list.queryOptions())
  const baseCurrencyQuery = useQuery(trpc.settings.getBaseCurrency.queryOptions())

  const hasActiveFilters = Boolean(filters.dateRange !== 'this-month' || filters.userId || filters.category || filters.search)

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

  const filteredExpenses = useMemo((): Expense[] => {
    if (!expensesQuery.data) return []

    let result = [...expensesQuery.data]

    const dateRange = getDateRangeBounds(filters.dateRange)
    if (dateRange) {
      result = result.filter((expense) => {
        const dateToCheck = new Date(expense.expenseDate)
        return dateToCheck >= dateRange.start && dateToCheck <= dateRange.end
      })
    }

    if (filters.userId) {
      result = result.filter((expense) => expense.userId === filters.userId)
    }

    if (filters.category) {
      result = result.filter((expense) => expense.categories.includes(filters.category!))
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter((expense) => {
        const merchantMatch = expense.merchant?.toLowerCase().includes(searchLower)
        const categoryMatch = expense.categories.some((cat) => cat.toLowerCase().includes(searchLower))
        return merchantMatch || categoryMatch
      })
    }

    return result.sort((a, b) => {
      const dateA = new Date(a.expenseDate).getTime()
      const dateB = new Date(b.expenseDate).getTime()
      return dateB - dateA
    })
  }, [expensesQuery.data, filters.dateRange, filters.userId, filters.category, filters.search])

  const totalSpent = useMemo(() => {
    return filteredExpenses.reduce((sum, expense) => sum + expense.baseAmount, 0)
  }, [filteredExpenses])

  const baseCurrency = baseCurrencyQuery.data ?? 'USD'

  return (
    <div className="pb-24">
      <OverviewHeader
        totalSpent={totalSpent}
        baseCurrency={baseCurrency}
        expenseCount={filteredExpenses.length}
        dateRange={filters.dateRange}
        onDateRangeChange={handleDateRangeChange}
        isLoading={expensesQuery.isLoading}
      />

      <FilterBar selectedUserId={filters.userId} onUserFilterChange={handleUserFilterChange} users={usersQuery.data} />

      <ExpenseList
        expenses={filteredExpenses}
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
