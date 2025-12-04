import {
  createFileRoute,
  redirect,
  Link,
  useNavigate,
} from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { z } from 'zod'
import { useMemo } from 'react'

import { useTRPC } from '@/integrations/trpc-react'
import { Button } from '@/components/ui/button'
import { getDateRangeBounds, type DateRange } from '@/components/expense'

import {
  ReviewBanner,
  FilterControls,
  TotalSpent,
  ExpenseList,
  type DashboardFilters,
} from './-components'

const dashboardSearchSchema = z.object({
  dateRange: z
    .enum(['last-7-days', 'this-month', 'last-month', 'all-time'])
    .default('this-month'),
  userId: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
})

export const Route = createFileRoute('/_main/')({
  component: Dashboard,
  validateSearch: dashboardSearchSchema,
  beforeLoad: async ({ context }) => {
    const isSetupComplete = await context.queryClient.fetchQuery(
      context.trpc.settings.isSetupComplete.queryOptions(),
    )
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
  const baseCurrencyQuery = useQuery(
    trpc.settings.getBaseCurrency.queryOptions(),
  )

  const allCategories = useMemo(() => {
    if (!expensesQuery.data) return []
    const categorySet = new Set<string>()
    expensesQuery.data.forEach((expense) => {
      expense.categories?.forEach((cat) => categorySet.add(cat))
    })
    return Array.from(categorySet).sort()
  }, [expensesQuery.data])

  const hasActiveFilters = Boolean(
    (filters.dateRange && filters.dateRange !== 'this-month') ||
      filters.userId ||
      filters.category ||
      filters.search,
  )

  const handleFilterChange = (
    key: keyof DashboardFilters,
    value: string | undefined,
  ) => {
    navigate({
      search: (prev) => ({ ...prev, [key]: value }),
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
        const dateToCheck = new Date(expense.expenseDate || expense.createdAt)
        return dateToCheck >= dateRange.start && dateToCheck <= dateRange.end
      })
    }

    if (filters.userId) {
      result = result.filter((expense) => expense.userId === filters.userId)
    }

    if (filters.category) {
      result = result.filter((expense) =>
        expense.categories?.includes(filters.category!),
      )
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter((expense) => {
        const merchantMatch = expense.merchant
          ?.toLowerCase()
          .includes(searchLower)
        const categoryMatch = expense.categories?.some((cat) =>
          cat.toLowerCase().includes(searchLower),
        )
        return merchantMatch || categoryMatch
      })
    }

    return result.sort((a, b) => {
      const dateA = new Date(a.expenseDate || a.createdAt).getTime()
      const dateB = new Date(b.expenseDate || b.createdAt).getTime()
      return dateB - dateA
    })
  }, [
    expensesQuery.data,
    filters.dateRange,
    filters.userId,
    filters.category,
    filters.search,
  ])

  const displayExpenses = useMemo(() => {
    return filteredExpenses.filter((expense) => expense.status === 'success')
  }, [filteredExpenses])

  const needsAttentionCount = useMemo(() => {
    if (!expensesQuery.data) return 0
    return expensesQuery.data.filter(
      (expense) =>
        expense.status === 'processing' ||
        expense.status === 'submitted' ||
        expense.status === 'needs-review',
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
    <div className="px-6 pt-12 pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <Button size="sm" variant="outline" asChild>
          <Link to="/add">
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Link>
        </Button>
      </div>

      <ReviewBanner count={needsAttentionCount} />

      <FilterControls
        filters={filters}
        users={usersQuery.data}
        categories={allCategories}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <TotalSpent
        amount={totalSpent}
        currency={baseCurrency}
        dateRange={filters.dateRange as DateRange}
        expenseCount={displayExpenses.length}
        isLoading={expensesQuery.isLoading}
      />

      <ExpenseList
        expenses={displayExpenses}
        baseCurrency={baseCurrency}
        isLoading={expensesQuery.isLoading}
        isError={expensesQuery.isError}
        errorMessage={expensesQuery.error?.message}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
      />
    </div>
  )
}
