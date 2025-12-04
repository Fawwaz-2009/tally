import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { Users, Store, Tag, Calendar } from 'lucide-react'

import { useTRPC } from '@/integrations/trpc-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LoadingState,
  ErrorState,
  AnalyticsEmptyState,
  type DateRange,
} from '@/components/expense'

import {
  TotalSpendingCard,
  CategoryBreakdownCard,
  BreakdownCard,
  userColors,
  merchantColors,
  useAnalytics,
} from './-components'

const analysisSearchSchema = z.object({
  dateRange: z
    .enum(['last-7-days', 'this-month', 'last-month', 'all-time'])
    .default('this-month'),
})

export const Route = createFileRoute('/_main/analysis/')({
  component: Analysis,
  validateSearch: analysisSearchSchema,
})

function Analysis() {
  const trpc = useTRPC()
  const navigate = useNavigate({ from: '/analysis' })
  const { dateRange } = Route.useSearch()

  const expensesQuery = useQuery(trpc.expenses.list.queryOptions())
  const usersQuery = useQuery(trpc.users.list.queryOptions())
  const baseCurrencyQuery = useQuery(
    trpc.settings.getBaseCurrency.queryOptions(),
  )

  const baseCurrency = baseCurrencyQuery.data ?? 'USD'
  const analytics = useAnalytics(
    expensesQuery.data,
    usersQuery.data,
    dateRange as DateRange,
  )

  const handleDateRangeChange = (value: string) => {
    navigate({
      search: { dateRange: value as DateRange },
      replace: true,
    })
  }

  const isLoading = expensesQuery.isLoading || usersQuery.isLoading
  const isError = expensesQuery.isError || usersQuery.isError
  const errorMessage =
    expensesQuery.error?.message || usersQuery.error?.message || 'Unknown error'

  return (
    <div className="px-6 pt-12 pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Analysis</h1>
        <Select value={dateRange} onValueChange={handleDateRangeChange}>
          <SelectTrigger className="w-[140px]" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last-7-days">Last 7 days</SelectItem>
            <SelectItem value="this-month">This month</SelectItem>
            <SelectItem value="last-month">Last month</SelectItem>
            <SelectItem value="all-time">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message={errorMessage} />
      ) : !analytics ? (
        <AnalyticsEmptyState />
      ) : (
        <div className="space-y-6">
          <TotalSpendingCard
            totalSpending={analytics.totalSpending}
            expenseCount={analytics.expenseCount}
            dateRange={dateRange as DateRange}
            currency={baseCurrency}
          />

          <CategoryBreakdownCard
            icon={Tag}
            title="By Category"
            subtitle="Tap to see expenses in this category"
            items={analytics.categoryBreakdown}
            currency={baseCurrency}
          />

          <BreakdownCard
            icon={Users}
            title="By User"
            subtitle="Spending per person"
            items={analytics.userBreakdown}
            colors={userColors}
            currency={baseCurrency}
          />

          <BreakdownCard
            icon={Store}
            title="By Merchant"
            subtitle="Top merchants by spending"
            items={analytics.merchantBreakdown}
            colors={merchantColors}
            currency={baseCurrency}
          />
        </div>
      )}
    </div>
  )
}
