import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'

import { useTRPC } from '@/integrations/trpc-react'
import { Button } from '@/components/ui/button'
import { ExpenseForm, type ExpenseFormData } from '@/components/expense/expense-form'
import { getScreenshotUrl } from '@/lib/expense-utils'

export interface ReviewStageProps {
  expenseId: string
  onComplete: (expenseId: string) => void
  onBack: () => void
  /** Hide back button (e.g., in setup flow where going back doesn't make sense) */
  hideBackButton?: boolean
}

export function ReviewStage({ expenseId, onComplete, onBack, hideBackButton = false }: ReviewStageProps) {
  const trpc = useTRPC()

  const expense = useQuery(trpc.expenses.getById.queryOptions({ id: expenseId }))

  const completeExpense = useMutation(
    trpc.expenses.complete.mutationOptions({
      onSuccess: (result) => {
        // Validate required fields are present
        const { id, amount, currency, merchant } = result
        if (amount == null || currency == null || merchant == null) {
          throw new Error('Completed expense is missing required fields')
        }
        onComplete(id!)
      },
    }),
  )

  const handleSubmit = (data: ExpenseFormData) => {
    if (!expense.data?.id) {
      throw new Error('Expense data is missing')
    }
    completeExpense.mutate({
      ...expense.data,
      id: expense.data.id,
      amount: data.amount,
      currency: data.currency,
      merchant: data.merchant || null,
      expenseDate: data.expenseDate ? new Date(data.expenseDate) : null,
    })
  }

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
            <Button variant="outline" size="sm" className="mt-3" onClick={onBack}>
              Go back
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const data = expense.data

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        {!hideBackButton && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        <h1 className="text-2xl font-bold tracking-tight">Review Expense</h1>
      </div>

      <ExpenseForm
        initialData={{
          amount: data.amount,
          currency: data.currency,
          merchant: data.merchant,
          expenseDate: data.expenseDate,
        }}
        imageUrl={getScreenshotUrl(data.receipt.imageKey)}
        onSubmit={handleSubmit}
        isSubmitting={completeExpense.isPending}
        submitLabel="Save Expense"
        error={completeExpense.error?.message}
      />
    </>
  )
}
