import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, ImageOff } from 'lucide-react'

import { useTRPC } from '@/integrations/trpc-react'
import { PageHeader } from '@/components/layout/page-header'
import { formatDate, getScreenshotUrl, getStatusLabel, getStatusStyle, LoadingState, ErrorState, SuccessState } from '@/components/expense'

export const Route = createFileRoute('/_main/review')({
  component: ReviewPage,
})

// Review item component
function ReviewItem({
  expense,
}: {
  expense: {
    id: string
    state: string
    extractionStatus: string
    merchant: string | null
    extractionError: string | null
    createdAt: Date
    receiptImageKey: string | null
  }
}) {
  const statusStyle = getStatusStyle(expense.state, expense.extractionStatus)
  const screenshotUrl = getScreenshotUrl(expense.receiptImageKey)

  return (
    <div className={`border-l-4 ${statusStyle.border} ${statusStyle.bg} rounded-r-lg overflow-hidden`}>
      <Link to="/expenses/$id" params={{ id: expense.id }} className={`flex items-start gap-4 p-4 ${statusStyle.hoverBg} transition-colors`}>
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
          {expense.extractionError && (
            <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded">{expense.extractionError}</div>
          )}
        </div>

        {/* Status indicator */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className={`text-xs font-semibold ${statusStyle.textColor} ${statusStyle.badgeBg} px-2 py-1 rounded-full`}>
            {getStatusLabel(expense.state, expense.extractionStatus)}
          </span>
          <ChevronRight className={`w-5 h-5 ${statusStyle.textColor}`} />
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
