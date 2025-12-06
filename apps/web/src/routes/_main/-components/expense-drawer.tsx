import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Pencil, Trash2, Loader2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useTRPC } from '@/integrations/trpc-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer'
import {
  getScreenshotUrl,
  ExpenseForm,
  AmountDisplay,
  ReceiptPreview,
  type ExpenseFormData,
} from '@/components/expense'

import type { ExpenseCardData } from './expense-card'

interface ExpenseDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense: ExpenseCardData | null
  baseCurrency: string
  userName?: string
}

export function ExpenseDrawer({
  open,
  onOpenChange,
  expense,
  baseCurrency,
  userName,
}: ExpenseDrawerProps) {
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
    if (!expense) return
    updateMutation.mutate({
      id: expense.id,
      amount: data.amount,
      currency: data.currency,
      merchant: data.merchant,
      categories: data.categories,
      expenseDate: data.expenseDate,
    })
  }

  const handleDelete = () => {
    if (!expense) return
    deleteMutation.mutate({ id: expense.id })
  }

  if (!expense) return null

  const displayDate = expense.expenseDate || expense.createdAt
  const screenshotUrl = getScreenshotUrl(expense.receiptImageKey)
  const displayAmount = expense.baseAmount ?? expense.amount
  const isDifferentCurrency =
    expense.currency && expense.currency !== baseCurrency

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="bg-background border-border text-foreground max-h-[95vh] flex flex-col">
          <div className="mx-auto w-full max-w-sm flex-1 overflow-auto">
            <ReceiptPreview
              imageUrl={screenshotUrl}
              merchantName={expense.merchant}
            />

            <DrawerHeader className="text-left pt-6 relative z-10 -mt-8">
              {isEditing ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                    Editing Expense
                  </span>
                </div>
              ) : (
                <>
                  <DrawerTitle className="text-3xl font-bold tracking-tight uppercase break-words leading-none text-foreground">
                    {expense.merchant || 'Unknown Merchant'}
                  </DrawerTitle>
                  <DrawerDescription className="text-muted-foreground font-mono mt-2">
                    {format(
                      new Date(displayDate),
                      "EEEE, MMMM do, yyyy 'at' h:mm a",
                    )}
                  </DrawerDescription>
                </>
              )}
            </DrawerHeader>

            <div className="p-4 space-y-6">
              {isEditing ? (
                <ExpenseForm
                  initialData={{
                    amount: expense.amount,
                    currency: expense.currency,
                    merchant: expense.merchant,
                    categories: expense.categories,
                    expenseDate: expense.expenseDate,
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
                    <AmountDisplay
                      amount={displayAmount}
                      currency={baseCurrency}
                      size="xl"
                    />
                    {isDifferentCurrency && expense.amount !== null && (
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
                    {expense.categories && expense.categories.length > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground uppercase tracking-wider font-mono">
                          Category
                        </span>
                        <div className="flex gap-2 flex-wrap justify-end">
                          {expense.categories.map((cat) => (
                            <Badge
                              key={cat}
                              variant="secondary"
                              className="bg-muted text-muted-foreground hover:bg-muted/80 font-mono uppercase text-[10px]"
                            >
                              {cat}
                            </Badge>
                          ))}
                        </div>
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
                </>
              )}

              {/* Actions */}
              <div className="pt-4 space-y-3 pb-8">
                {isEditing ? (
                  <Button
                    variant="outline"
                    className="w-full rounded-xl h-12 font-bold uppercase tracking-wider"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                ) : (
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
                )}
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Expense</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this expense? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
