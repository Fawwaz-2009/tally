import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react'

import { ExpenseMetadata, Notification, ReviewWarning } from './-components'
import type {ExpenseFormData} from '@/components/expense/expense-form';
import { useTRPC } from '@/integrations/trpc-react'
import { Button } from '@/components/ui/button'
import { getScreenshotUrl, isPendingReview } from '@/lib/expense-utils'
import { StatusBadge } from '@/components/expense/status-badge'
import { ExpenseForm  } from '@/components/expense/expense-form'


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
  const pendingReviewQuery = useQuery(trpc.expenses.getPendingReview.queryOptions())

  const getNextExpenseId = (): string | null => {
    const expenses = pendingReviewQuery.data || []
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

  // Use confirm mutation for pending-review expenses, update for confirmed expenses
  const confirmMutation = useMutation({
    ...trpc.expenses.confirm.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.expenses.getById.queryKey({ id }),
      })
      queryClient.invalidateQueries({ queryKey: trpc.expenses.list.queryKey() })
      queryClient.invalidateQueries({
        queryKey: trpc.expenses.listAll.queryKey(),
      })
      queryClient.invalidateQueries({
        queryKey: trpc.expenses.getPendingReview.queryKey(),
      })
      queryClient.invalidateQueries({
        queryKey: trpc.expenses.pendingReviewCount.queryKey(),
      })

      setNotification({
        message: 'Expense saved! Moving to next...',
        type: 'success',
      })
      setTimeout(() => {
        setNotification(null)
        navigateToNextOrReview()
      }, 1000)
    },
    onError: (error) => {
      setNotification({
        message: error.message || 'Failed to save expense',
        type: 'error',
      })
      setTimeout(() => setNotification(null), 5000)
    },
  })

  const updateMutation = useMutation({
    ...trpc.expenses.update.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.expenses.getById.queryKey({ id }),
      })
      queryClient.invalidateQueries({ queryKey: trpc.expenses.list.queryKey() })
      queryClient.invalidateQueries({
        queryKey: trpc.expenses.listAll.queryKey(),
      })

      setNotification({
        message: 'Expense saved successfully',
        type: 'success',
      })
      setTimeout(() => setNotification(null), 3000)
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
          queryKey: trpc.expenses.listAll.queryKey(),
        })
        queryClient.invalidateQueries({
          queryKey: trpc.expenses.getPendingReview.queryKey(),
        })
        queryClient.invalidateQueries({
          queryKey: trpc.expenses.pendingReviewCount.queryKey(),
        })

        const wasPendingReview = expenseQuery.data?.state === 'pending-review'
        if (wasPendingReview) {
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
    const needsConfirm = expenseQuery.data && isPendingReview(expenseQuery.data)
    const expenseDate = data.expenseDate ? new Date(data.expenseDate) : undefined

    if (needsConfirm) {
      // Use confirm mutation for pending-review expenses
      confirmMutation.mutate({
        id,
        amount: data.amount,
        currency: data.currency,
        merchant: data.merchant ?? null,
        description: data.description ?? null,
        categories: data.categories ?? [],
        expenseDate: expenseDate ?? null,
      })
    } else {
      // Use update mutation for confirmed expenses
      updateMutation.mutate({
        id,
        amount: data.amount,
        currency: data.currency,
        merchant: data.merchant ?? undefined,
        description: data.description ?? undefined,
        categories: data.categories ?? [],
        expenseDate: expenseDate ?? undefined,
      })
    }
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
          <p className="text-muted-foreground mb-6">{expenseQuery.error.message}</p>
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
          <p className="text-muted-foreground mb-6">This expense may have been deleted.</p>
          <Button asChild>
            <Link to="/">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  const expense = expenseQuery.data
  const needsConfirm = isPendingReview(expense)

  // Get values that exist on pending-review and confirmed expenses
  const amount = expense.state !== 'pending' ? expense.amount : null
  const currency = expense.state !== 'pending' ? expense.currency : null
  const merchant = expense.state !== 'pending' ? expense.merchant : null
  const description = expense.state !== 'pending' ? expense.description : null
  const categories = expense.state !== 'pending' ? expense.categories : []
  const expenseDate = expense.state !== 'pending' ? expense.expenseDate : null
  const extractionError = expense.state === 'pending-review' ? expense.extractionMetadata?.error : null

  return (
    <div className="px-6 pt-6 pb-24">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}

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
        <StatusBadge state={expense.state} />
      </div>

      {/* Review warning */}
      {needsConfirm && extractionError && <ReviewWarning errorMessage={extractionError} />}

      {/* Form */}
      <ExpenseForm
        initialData={{
          amount,
          currency,
          merchant,
          description,
          categories,
          expenseDate,
        }}
        imageUrl={getScreenshotUrl(expense.imageKey)}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        isSubmitting={confirmMutation.isPending || updateMutation.isPending}
        isDeleting={deleteMutation.isPending}
        submitLabel={needsConfirm ? 'Confirm Expense' : 'Save Changes'}
        showDescription
        showCategories
        showDeleteButton
      />

      <ExpenseMetadata expense={expense} />
    </div>
  )
}
