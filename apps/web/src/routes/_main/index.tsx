import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { useMemo } from 'react'

import { ExpenseList, FilterBar, OverviewHeader } from './-components'
import type { ExpenseCardData } from './-components/expense-card'
import { useTRPC } from '@/integrations/trpc-react'
import { getMonthBounds } from '@/lib/date-utils'

const dashboardSearchSchema = z.object({
  month: z.number().optional(),
  year: z.number().optional(),
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

  // Default to current month if not specified
  const now = new Date()
  const currentMonth = filters.month ?? now.getMonth()
  const currentYear = filters.year ?? now.getFullYear()

  const expensesQuery = useQuery(trpc.expenses.list.queryOptions())
  const usersQuery = useQuery(trpc.users.list.queryOptions())
  const baseCurrencyQuery = useQuery(trpc.settings.getBaseCurrency.queryOptions())

  const isCurrentMonth = currentMonth === now.getMonth() && currentYear === now.getFullYear()
  const hasActiveFilters = Boolean(!isCurrentMonth || filters.userId || filters.category || filters.search)

  const handleMonthChange = (month: number, year: number) => {
    navigate({
      search: (prev) => ({ ...prev, month, year }),
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
    const now = new Date()
    navigate({
      search: { month: now.getMonth(), year: now.getFullYear() },
      replace: true,
    })
  }

  const filteredExpenses = useMemo((): ExpenseCardData[] => {
    if (!expensesQuery.data) return []

    let result = [...expensesQuery.data]

    // Filter by selected month/year
    const dateRange = getMonthBounds(currentMonth, currentYear)
    result = result.filter((expense) => {
      const dateToCheck = new Date(expense.expenseDate)
      return dateToCheck >= dateRange.start && dateToCheck <= dateRange.end
    })

    if (filters.userId) {
      result = result.filter((expense) => expense.userId === filters.userId)
    }

    if (filters.category) {
      result = result.filter((expense) => expense.category === filters.category)
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter((expense) => {
        const merchantMatch = expense.merchantName.toLowerCase().includes(searchLower)
        const categoryMatch = expense.category?.toLowerCase().includes(searchLower)
        return merchantMatch || categoryMatch
      })
    }

    return result.sort((a, b) => {
      const dateA = new Date(a.expenseDate).getTime()
      const dateB = new Date(b.expenseDate).getTime()
      return dateB - dateA
    })
  }, [expensesQuery.data, currentMonth, currentYear, filters.userId, filters.category, filters.search])

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
        month={currentMonth}
        year={currentYear}
        onMonthChange={handleMonthChange}
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
