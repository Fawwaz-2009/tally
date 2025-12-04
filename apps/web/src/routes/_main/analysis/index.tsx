import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { Users, Store, Tag } from 'lucide-react'

import { useTRPC } from '@/integrations/trpc-react'
import { PageHeader } from '@/components/layout/page-header'
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
    <div className="px-4 pt-12 pb-24">
      <PageHeader title="Analysis">
        <Select value={dateRange} onValueChange={handleDateRangeChange}>
          <SelectTrigger className="h-8 w-auto border-border bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full text-xs font-mono uppercase tracking-wider px-3">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last-7-days">Last 7 Days</SelectItem>
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="last-month">Last Month</SelectItem>
            <SelectItem value="all-time">All Time</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

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
