import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'

import { useTRPC } from '@/integrations/trpc-react'
import { Button } from '@/components/ui/button'
import {
  getScreenshotUrl,
  StatusBadge,
  ExpenseForm,
  type ExpenseFormData,
} from '@/components/expense'

import { Notification, ExpenseMetadata, ReviewWarning } from './-components'

export const Route = createFileRoute('/_main/expenses/$id')({
  component: ExpenseDetail,
})

function ExpenseDetail() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const trpc = useTRPC()

  const [notification, setNotification] = useState<{
    message: string
    type: 'success' | 'error'
  } | null>(null)

  const expenseQuery = useQuery(trpc.expenses.getById.queryOptions({ id }))
  const needsAttentionQuery = useQuery(
    trpc.expenses.getNeedsAttention.queryOptions(),
  )

  const getNextExpenseId = (): string | null => {
    const expenses = needsAttentionQuery.data || []
    const otherExpenses = expenses.filter((e) => e.id !== id)
    return otherExpenses.length > 0 ? otherExpenses[0].id : null
  }

  const navigateToNextOrReview = () => {
    const nextId = getNextExpenseId()
    if (nextId) {
      navigate({ to: '/expenses/$id', params: { id: nextId } })
    } else {
      navigate({ to: '/review' })
    }
  }

  const updateMutation = useMutation({
    ...trpc.expenses.update.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.expenses.getById.queryKey({ id }),
      })
      queryClient.invalidateQueries({ queryKey: trpc.expenses.list.queryKey() })
      queryClient.invalidateQueries({
        queryKey: trpc.expenses.getNeedsAttention.queryKey(),
      })

      const wasReviewItem = expenseQuery.data?.status !== 'success'
      if (wasReviewItem) {
        setNotification({
          message: 'Expense saved! Moving to next...',
          type: 'success',
        })
        setTimeout(() => {
          setNotification(null)
          navigateToNextOrReview()
        }, 1000)
      } else {
        setNotification({
          message: 'Expense saved successfully',
          type: 'success',
        })
        setTimeout(() => setNotification(null), 3000)
      }
    },
    onError: (error) => {
      setNotification({
        message: error.message || 'Failed to save expense',
        type: 'error',
      })
      setTimeout(() => setNotification(null), 5000)
    },
  })

  const deleteMutation = useMutation(
    trpc.expenses.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.expenses.list.queryKey(),
        })
        queryClient.invalidateQueries({
          queryKey: trpc.expenses.getNeedsAttention.queryKey(),
        })

        const wasReviewItem = expenseQuery.data?.status !== 'success'
        if (wasReviewItem) {
          navigateToNextOrReview()
        } else {
          navigate({ to: '/' })
        }
      },
      onError: (error) => {
        setNotification({
          message: error.message || 'Failed to delete expense',
          type: 'error',
        })
        setTimeout(() => setNotification(null), 5000)
      },
    }),
  )

  const handleSubmit = (data: ExpenseFormData) => {
    const status =
      expenseQuery.data?.status !== 'success' ? 'success' : undefined

    updateMutation.mutate({
      id,
      amount: data.amount,
      currency: data.currency,
      merchant: data.merchant,
      description: data.description,
      categories: data.categories,
      status,
      expenseDate: data.expenseDate,
    })
  }

  const handleDelete = () => {
    deleteMutation.mutate({ id })
  }

  // Loading state
  if (expenseQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Error state
  if (expenseQuery.isError) {
    return (
      <div className="px-6 pt-12 pb-24">
        <div className="text-center py-20">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Failed to load expense</h2>
          <p className="text-muted-foreground mb-6">
            {expenseQuery.error.message}
          </p>
          <Button asChild>
            <Link to="/">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Not found state
  if (!expenseQuery.data) {
    return (
      <div className="px-6 pt-12 pb-24">
        <div className="text-center py-20">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Expense not found</h2>
          <p className="text-muted-foreground mb-6">
            This expense may have been deleted.
          </p>
          <Button asChild>
            <Link to="/">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  const expense = expenseQuery.data

  return (
    <div className="px-6 pt-6 pb-24">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Expense Details</h1>
        </div>
        <StatusBadge status={expense.status} showSuccess />
      </div>

      {/* Review warning */}
      {expense.status === 'needs-review' && expense.errorMessage && (
        <ReviewWarning errorMessage={expense.errorMessage} />
      )}

      {/* Form */}
      <ExpenseForm
        initialData={{
          amount: expense.amount,
          currency: expense.currency,
          merchant: expense.merchant,
          description: expense.description,
          categories: expense.categories,
          expenseDate: expense.expenseDate,
        }}
        imageUrl={getScreenshotUrl(expense.screenshotPath)}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        isSubmitting={updateMutation.isPending}
        isDeleting={deleteMutation.isPending}
        submitLabel="Save Changes"
        showDescription
        showCategories
        showDeleteButton
      />

      <ExpenseMetadata expense={expense} />
    </div>
  )
}
