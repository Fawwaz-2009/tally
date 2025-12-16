import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Pencil, Trash2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { ExpenseCardData } from './expense-card'
import type { ExpenseFormData } from '@/components/expense/expense-form'
import { useTRPC } from '@/integrations/trpc-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { getExpenseDisplayAmount, getExpenseDisplayDate, getScreenshotUrl, isPending, isConfirmed } from '@/lib/expense-utils'
import { ExpenseForm } from '@/components/expense/expense-form'
import { AmountDisplay } from '@/components/expense/amount-display'
import { ReceiptPreview } from '@/components/expense/receipt-preview'

interface ExpenseDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense: ExpenseCardData | null
  baseCurrency: string
  userName?: string
}

export function ExpenseDrawer({ open, onOpenChange, expense, baseCurrency, userName }: ExpenseDrawerProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  // Reset state when drawer opens with a new expense
  useEffect(() => {
    if (open && expense) {
      setIsEditing(false)
    }
  }, [open, expense])

  const updateMutation = useMutation({
    ...trpc.expenses.update.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.expenses.list.queryKey() })
      queryClient.invalidateQueries({
        queryKey: trpc.expenses.listAll.queryKey(),
      })
      queryClient.invalidateQueries({
        queryKey: trpc.expenses.getPendingReview.queryKey(),
      })
      setIsEditing(false)
    },
  })

  const deleteMutation = useMutation(
    trpc.expenses.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.expenses.list.queryKey() })
        queryClient.invalidateQueries({
          queryKey: trpc.expenses.listAll.queryKey(),
        })
        queryClient.invalidateQueries({
          queryKey: trpc.expenses.getPendingReview.queryKey(),
        })
        setDeleteDialogOpen(false)
        onOpenChange(false)
      },
    }),
  )

  const handleSave = (data: ExpenseFormData) => {
    if (!expense?.id) return
    updateMutation.mutate({
      id: expense.id,
      amount: data.amount,
      currency: data.currency,
      merchant: data.merchant ?? undefined,
      categories: data.categories ?? [],
      expenseDate: data.expenseDate ? new Date(data.expenseDate) : undefined,
    })
  }

  const handleDelete = () => {
    if (!expense?.id) return
    deleteMutation.mutate({ id: expense.id })
  }

  if (!expense) return null

  // Handle different expense states
  const isProcessing = isPending(expense)
  const displayDate = getExpenseDisplayDate(expense)
  const displayAmount = getExpenseDisplayAmount(expense)

  // Properties that vary by state
  const imageKey = expense.imageKey
  const screenshotUrl = getScreenshotUrl(imageKey)
  const merchant = isProcessing ? 'Processing...' : expense.merchant || 'Unknown Merchant'
  const currency = isProcessing ? null : expense.currency
  const amount = isProcessing ? null : expense.amount
  const categories = isProcessing ? [] : expense.categories

  const isDifferentCurrency = currency && currency !== baseCurrency

  // Can only edit confirmed expenses
  const canEdit = isConfirmed(expense)

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="bg-background border-border text-foreground max-h-[95vh] flex flex-col">
          <div className="mx-auto w-full max-w-sm flex-1 overflow-auto">
            <ReceiptPreview imageUrl={screenshotUrl} merchantName={merchant} />

            <DrawerHeader className="text-left pt-6 relative z-10 -mt-8">
              {isEditing ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono uppercase tracking-wider text-muted-foreground">Editing Expense</span>
                </div>
              ) : (
                <>
                  <DrawerTitle className="text-3xl font-bold tracking-tight uppercase break-words leading-none text-foreground">{merchant}</DrawerTitle>
                  <DrawerDescription className="text-muted-foreground font-mono mt-2">
                    {format(new Date(displayDate), "EEEE, MMMM do, yyyy 'at' h:mm a")}
                  </DrawerDescription>
                </>
              )}
            </DrawerHeader>

            <div className="p-4 space-y-6">
              {isEditing && !isProcessing ? (
                <ExpenseForm
                  initialData={{
                    amount: amount,
                    currency: currency,
                    merchant: isPending(expense) ? null : expense.merchant,
                    categories: categories,
                    expenseDate: isPending(expense) ? null : expense.expenseDate,
                  }}
                  onSubmit={handleSave}
                  isSubmitting={updateMutation.isPending}
                  submitLabel="Save Changes"
                  showCategories
                />
              ) : (
                <>
                  {/* Amount Section */}
                  <div className="border-b border-dashed border-border pb-6">
                    {displayAmount !== null ? (
                      <>
                        <AmountDisplay amount={displayAmount} currency={baseCurrency} size="xl" />
                        {isDifferentCurrency && amount !== null && (
                          <div className="text-sm text-muted-foreground font-mono mt-2">
                            <AmountDisplay amount={amount} currency={currency} size="sm" className="text-muted-foreground" />
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-2xl text-muted-foreground">Processing...</span>
                    )}
                  </div>

                  {/* Status & Tags */}
                  <div className="space-y-4">
                    {categories.length > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground uppercase tracking-wider font-mono">Category</span>
                        <div className="flex gap-2 flex-wrap justify-end">
                          {categories.map((cat) => (
                            <Badge key={cat} variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted/80 font-mono uppercase text-[10px]">
                              {cat}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {userName && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground uppercase tracking-wider font-mono">Paid By</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold uppercase text-foreground">{userName}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="pt-4 space-y-3 pb-8">
                {isEditing ? (
                  <Button variant="outline" className="w-full rounded-xl h-12 font-bold uppercase tracking-wider" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      className="bg-foreground text-background hover:bg-foreground/90 rounded-xl h-12 font-bold uppercase tracking-wider"
                      onClick={() => setIsEditing(true)}
                      disabled={!canEdit}
                    >
                      <Pencil className="mr-2 h-3 w-3" /> Edit
                    </Button>
                    <Button variant="destructive" className="rounded-xl h-12 font-bold uppercase tracking-wider" onClick={() => setDeleteDialogOpen(true)}>
                      <Trash2 className="mr-2 h-3 w-3" /> Delete
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        isDeleting={deleteMutation.isPending}
      />
    </>
  )
}
