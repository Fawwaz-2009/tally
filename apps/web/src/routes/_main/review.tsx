import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, ImageOff } from 'lucide-react'

import { useTRPC } from '@/integrations/trpc-react'
import { PageHeader } from '@/components/layout/page-header'
import { formatDate } from '@/lib/date-utils'
import { getScreenshotUrl } from '@/lib/expense-utils'
import { LoadingState, ErrorState, SuccessState } from '@/components/expense/states'
import type { PendingReviewExpense } from '@repo/data-ops/schemas'

export const Route = createFileRoute('/_main/review')({
  component: ReviewPage,
})

// Review item component
function ReviewItem({ expense }: { expense: PendingReviewExpense }) {
  const screenshotUrl = getScreenshotUrl(expense.imageKey)
  const hasError = expense.extractionMetadata?.error != null

  return (
    <div
      className={`border-l-4 ${hasError ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20' : 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'} rounded-r-lg overflow-hidden`}
    >
      <Link to="/expenses/$id" params={{ id: expense.id }} className="flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors">
        {/* Screenshot thumbnail */}
        <div className="w-16 h-16 flex-shrink-0 bg-muted rounded-md overflow-hidden">
          {screenshotUrl ? (
            <img src={screenshotUrl} alt="Receipt" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageOff className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium truncate">{expense.merchant || 'Unknown merchant'}</span>
          </div>
          <div className="text-sm text-muted-foreground mb-2">{formatDate(expense.createdAt)}</div>
          {expense.extractionMetadata?.error && (
            <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded">{expense.extractionMetadata.error}</div>
          )}
        </div>

        {/* Status indicator */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span
            className={`text-xs font-semibold ${hasError ? 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30' : 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30'} px-2 py-1 rounded-full`}
          >
            {hasError ? 'Needs Review' : 'Review'}
          </span>
          <ChevronRight className={`w-5 h-5 ${hasError ? 'text-amber-600' : 'text-blue-600'}`} />
        </div>
      </Link>
    </div>
  )
}

function ReviewPage() {
  const trpc = useTRPC()

  // Use the new getPendingReview query
  const pendingReviewQuery = useQuery(trpc.expenses.getPendingReview.queryOptions())

  const sortedExpenses = pendingReviewQuery.data?.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || []

  const expenseCount = pendingReviewQuery.data?.length ?? 0
  const subtitle = expenseCount > 0 ? `${expenseCount} ${expenseCount === 1 ? 'expense needs' : 'expenses need'} attention` : undefined

  return (
    <div className="px-4 pt-12 pb-24">
      <PageHeader title="Review" subtitle={subtitle} />

      {/* Content */}
      {pendingReviewQuery.isLoading ? (
        <LoadingState />
      ) : pendingReviewQuery.isError ? (
        <ErrorState message={pendingReviewQuery.error.message} />
      ) : sortedExpenses.length === 0 ? (
        <SuccessState title="All caught up!" description="No expenses need review right now." action={{ label: 'Back to Dashboard', to: '/' }} />
      ) : (
        <div className="space-y-3">
          {sortedExpenses.map((expense) => (
            <ReviewItem key={expense.id} expense={expense} />
          ))}
        </div>
      )}
    </div>
  )
}
