import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'

import type { ExpenseFormData } from '@/components/expense/expense-form'
import { useTRPC } from '@/integrations/trpc-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog'
import { getScreenshotUrl } from '@/lib/expense-utils'
import { ExpenseForm } from '@/components/expense/expense-form'
import { AmountDisplay } from '@/components/expense/amount-display'
import { ReceiptPreview } from '@/components/expense/receipt-preview'

export const Route = createFileRoute('/_main/expense/$id')({
  component: ExpenseDetailPage,
})

function ExpenseDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const [isEditing, setIsEditing] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch expense details
  const { data: expense } = useQuery(trpc.expenses.getById.queryOptions({ id }))
  const { data: baseCurrency } = useQuery(trpc.settings.getBaseCurrency.queryOptions())
  const { data: users } = useQuery(trpc.users.list.queryOptions())

  const updateMutation = useMutation({
    ...trpc.expenses.update.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.expenses.list.queryKey() })
      queryClient.invalidateQueries({ queryKey: trpc.merchants.list.queryKey() })
      queryClient.invalidateQueries({ queryKey: trpc.expenses.getById.queryKey({ id }) })
      setIsEditing(false)
      setError(null)
    },
    onError: (err) => {
      setError(err.message || 'Failed to update expense')
    },
  })

  const deleteMutation = useMutation(
    trpc.expenses.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.expenses.list.queryKey() })
        navigate({ to: '/' })
      },
    }),
  )

  const handleSave = (data: ExpenseFormData) => {
    setError(null)
    updateMutation.mutate({
      id,
      amount: data.amount,
      currency: data.currency,
      merchantName: data.merchantName,
      expenseDate: data.expenseDate ? new Date(data.expenseDate) : undefined,
    })
  }

  const handleDelete = () => {
    deleteMutation.mutate({ id })
  }

  const handleBack = () => {
    navigate({ to: '/' })
  }

  if (!expense || !baseCurrency) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  const screenshotUrl = getScreenshotUrl(expense.imageKey)
  const isDifferentCurrency = expense.currency !== baseCurrency
  const userName = users?.find((u) => u.id === expense.userId)?.name

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="max-w-sm mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-9 w-9"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold uppercase tracking-wider flex-1">
            {isEditing ? 'Edit Expense' : 'Expense Details'}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-sm mx-auto">
        {isEditing ? (
          // Edit mode - full form
          <div className="p-4">
            <ExpenseForm
              mode="edit"
              initialData={{
                amount: expense.amount,
                currency: expense.currency,
                merchantName: expense.merchantName,
                category: expense.category,
                expenseDate: expense.expenseDate,
                imageUrl: screenshotUrl,
              }}
              onSubmit={handleSave}
              onCancel={() => setIsEditing(false)}
              isSubmitting={updateMutation.isPending}
              error={error}
            />
          </div>
        ) : (
          // View mode
          <>
            <ReceiptPreview imageUrl={screenshotUrl} merchantName={expense.merchantName} />

            <div className="p-4 space-y-6">
              {/* Merchant & Date */}
              <div>
                <h2 className="text-3xl font-bold tracking-tight uppercase break-words leading-none text-foreground">
                  {expense.merchantName}
                </h2>
                <p className="text-muted-foreground font-mono mt-2 text-sm">
                  {format(new Date(expense.expenseDate), "EEEE, MMMM do, yyyy 'at' h:mm a")}
                </p>
              </div>

              {/* Amount Section */}
              <div className="border-b border-dashed border-border pb-6">
                <AmountDisplay amount={expense.baseAmount} currency={baseCurrency} size="xl" />
                {isDifferentCurrency && (
                  <div className="text-sm text-muted-foreground font-mono mt-2">
                    <AmountDisplay
                      amount={expense.amount}
                      currency={expense.currency}
                      size="sm"
                      className="text-muted-foreground"
                    />
                  </div>
                )}
              </div>

              {/* Status & Tags */}
              <div className="space-y-4">
                {expense.category && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground uppercase tracking-wider font-mono">
                      Category
                    </span>
                    <Badge
                      variant="secondary"
                      className="bg-muted text-muted-foreground hover:bg-muted/80 font-mono uppercase text-[10px]"
                    >
                      {expense.category}
                    </Badge>
                  </div>
                )}

                {userName && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground uppercase tracking-wider font-mono">
                      Paid By
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold uppercase text-foreground">
                        {userName}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-4 space-y-3 pb-8">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    className="bg-foreground text-background hover:bg-foreground/90 rounded-xl h-12 font-bold uppercase tracking-wider"
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil className="mr-2 h-3 w-3" /> Edit
                  </Button>
                  <Button
                    variant="destructive"
                    className="rounded-xl h-12 font-bold uppercase tracking-wider"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="mr-2 h-3 w-3" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  )
}
