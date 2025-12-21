import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { Store, Tag, Users } from 'lucide-react'

import { BreakdownCard, CategoryBreakdownCard, TotalSpendingCard, merchantColors, useAnalytics, userColors } from './-components'
import { useTRPC } from '@/integrations/trpc-react'
import { PageHeader } from '@/components/layout/page-header'
import { MonthNavigator } from '@/components/ui/month-navigator'
import { AnalyticsEmptyState, ErrorState, LoadingState } from '@/components/expense/states'

const analysisSearchSchema = z.object({
  month: z.number().optional(),
  year: z.number().optional(),
})

export const Route = createFileRoute('/_main/analysis/')({
  component: Analysis,
  validateSearch: analysisSearchSchema,
})

function Analysis() {
  const trpc = useTRPC()
  const navigate = useNavigate({ from: '/analysis' })
  const filters = Route.useSearch()

  // Default to current month if not specified
  const now = new Date()
  const currentMonth = filters.month ?? now.getMonth()
  const currentYear = filters.year ?? now.getFullYear()

  const expensesQuery = useQuery(trpc.expenses.list.queryOptions())
  const usersQuery = useQuery(trpc.users.list.queryOptions())
  const baseCurrencyQuery = useQuery(trpc.settings.getBaseCurrency.queryOptions())

  const baseCurrency = baseCurrencyQuery.data ?? 'USD'
  const analytics = useAnalytics(expensesQuery.data, usersQuery.data, currentMonth, currentYear)

  const handleMonthChange = (month: number, year: number) => {
    navigate({
      search: { month, year },
      replace: true,
    })
  }

  const isLoading = expensesQuery.isLoading || usersQuery.isLoading
  const isError = expensesQuery.isError || usersQuery.isError
  const errorMessage = expensesQuery.error?.message || usersQuery.error?.message || 'Unknown error'

  return (
    <div className="px-4 pt-12 pb-24">
      <PageHeader title="Analysis">
        <MonthNavigator
          month={currentMonth}
          year={currentYear}
          onMonthChange={handleMonthChange}
        />
      </PageHeader>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message={errorMessage} />
      ) : !analytics ? (
        <AnalyticsEmptyState />
      ) : (
        <div className="space-y-6">
          <TotalSpendingCard totalSpending={analytics.totalSpending} expenseCount={analytics.expenseCount} month={currentMonth} year={currentYear} currency={baseCurrency} />

          <CategoryBreakdownCard
            icon={Tag}
            title="By Category"
            subtitle="Tap to see expenses in this category"
            items={analytics.categoryBreakdown}
            currency={baseCurrency}
          />

          <BreakdownCard icon={Users} title="By User" subtitle="Spending per person" items={analytics.userBreakdown} colors={userColors} currency={baseCurrency} />

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
