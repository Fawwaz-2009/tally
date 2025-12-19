import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react'

import { ExpenseMetadata, Notification } from './-components'
import type { ExpenseFormData } from '@/components/expense/expense-form'
import { useTRPC } from '@/integrations/trpc-react'
import { Button } from '@/components/ui/button'
import { getScreenshotUrl } from '@/lib/expense-utils'
import { ExpenseForm } from '@/components/expense/expense-form'

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

  const updateMutation = useMutation({
    ...trpc.expenses.update.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.expenses.getById.queryKey({ id }),
      })
      queryClient.invalidateQueries({ queryKey: trpc.expenses.list.queryKey() })

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
        navigate({ to: '/' })
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
    const expenseDate = data.expenseDate ? new Date(data.expenseDate) : undefined

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
      </div>

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
        imageUrl={getScreenshotUrl(expense.imageKey)}
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
