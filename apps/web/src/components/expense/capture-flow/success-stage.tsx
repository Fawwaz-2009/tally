import { useQuery } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, Loader2, Plus } from 'lucide-react'

import { useTRPC } from '@/integrations/trpc-react'
import { Button } from '@/components/ui/button'
import { getScreenshotUrl, isConfirmed } from '@/lib/expense-utils'

export interface SuccessStageProps {
  expenseId: string
  /** Called when user clicks "Add Another" - omit to hide the button */
  onAddAnother?: () => void
  /** Custom action button (e.g., "Continue to Dashboard" for setup flow) */
  actionButton?: React.ReactNode
}

export function SuccessStage({ expenseId, onAddAnother, actionButton }: SuccessStageProps) {
  const trpc = useTRPC()

  const expense = useQuery(trpc.expenses.getById.queryOptions({ id: expenseId }))

  // Loading state
  if (expense.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Error state
  if (expense.error || !expense.data) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">Failed to load expense</p>
            <p className="text-sm text-muted-foreground mt-1">{expense.error?.message || 'Expense not found'}</p>
            {onAddAnother && (
              <Button variant="outline" size="sm" className="mt-3" onClick={onAddAnother}>
                Try again
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const data = expense.data

  // SuccessStage should only show confirmed expenses
  if (!isConfirmed(data)) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">Invalid expense state</p>
            <p className="text-sm text-muted-foreground mt-1">Expense is not confirmed yet</p>
            {onAddAnother && (
              <Button variant="outline" size="sm" className="mt-3" onClick={onAddAnother}>
                Try again
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const amount = (data.amount / 100).toFixed(2)

  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
        <CheckCircle2 className="w-7 h-7 text-green-600 dark:text-green-400" />
      </div>

      <h2 className="text-xl font-semibold tracking-tight mb-1">Expense Saved</h2>
      <p className="text-sm text-muted-foreground mb-6">Successfully extracted and saved</p>

      <div className="bg-muted/30 border rounded-xl p-4 mb-6">
        <div className="flex gap-4">
          {data.imageKey && <img src={getScreenshotUrl(data.imageKey)!} alt="Receipt" className="w-16 h-16 object-cover rounded-lg border flex-shrink-0" />}
          <div className="flex-1 text-left min-w-0">
            <div className="font-mono text-2xl font-bold tracking-tight">
              {data.currency} {amount}
            </div>
            {data.merchant && <div className="text-sm text-muted-foreground truncate">{data.merchant}</div>}
          </div>
        </div>
      </div>

      {/* Show custom action button, or "Add Another" button if callback provided */}
      {actionButton}
      {!actionButton && onAddAnother && (
        <Button className="w-full" size="lg" onClick={onAddAnother}>
          <Plus className="w-4 h-4 mr-2" />
          Add Another Expense
        </Button>
      )}
    </div>
  )
}
