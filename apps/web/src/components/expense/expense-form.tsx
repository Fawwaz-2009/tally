import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Save, Trash2 } from 'lucide-react'

import { centsToDollars, dollarsToCents } from '@/lib/expense-utils'
import { formatDateForInput } from '@/lib/date-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { CurrencyPicker } from './currency-picker'
import {
  ImagePreviewDialog,
  ImagePreviewThumbnail,
} from './image-preview-dialog'

// Form schema - amounts are displayed/edited in dollars, stored in cents
const expenseFormSchema = z.object({
  amount: z.string().min(1, 'Amount is required'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  merchant: z.string().optional(),
  description: z.string().optional(),
  categories: z.string().optional(),
  expenseDate: z.string().optional(),
})

type ExpenseFormValues = z.infer<typeof expenseFormSchema>

export interface ExpenseFormData {
  amount: number // in cents
  currency: string
  merchant?: string
  description?: string
  categories?: string[]
  expenseDate?: string
}

interface ExpenseFormProps {
  // Initial data (for edit mode)
  initialData?: {
    amount: number | null // in cents
    currency: string | null
    merchant: string | null
    description?: string | null
    categories?: string[] | null
    expenseDate?: Date | string | null
  }
  // Image preview
  imageUrl?: string | null
  // Callbacks
  onSubmit: (data: ExpenseFormData) => void
  onDelete?: () => void
  // State
  isSubmitting?: boolean
  isDeleting?: boolean
  submitLabel?: string
  // Features
  showDescription?: boolean
  showCategories?: boolean
  showDeleteButton?: boolean
}

export function ExpenseForm({
  initialData,
  imageUrl,
  onSubmit,
  onDelete,
  isSubmitting = false,
  isDeleting = false,
  submitLabel = 'Save',
  showDescription = false,
  showCategories = false,
  showDeleteButton = false,
}: ExpenseFormProps) {
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amount: centsToDollars(initialData?.amount ?? null),
      currency: initialData?.currency || 'USD',
      merchant: initialData?.merchant || '',
      description: initialData?.description || '',
      categories: initialData?.categories?.join(', ') || '',
      expenseDate: formatDateForInput(initialData?.expenseDate),
    },
  })

  const handleSubmit = (data: ExpenseFormValues) => {
    const amountInCents = dollarsToCents(data.amount)

    const categories = data.categories
      ? data.categories
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean)
      : undefined

    onSubmit({
      amount: amountInCents,
      currency: data.currency,
      merchant: data.merchant || undefined,
      description: data.description || undefined,
      categories: categories?.length ? categories : undefined,
      expenseDate: data.expenseDate || undefined,
    })
  }

  const handleDelete = () => {
    setDeleteDialogOpen(false)
    onDelete?.()
  }

  return (
    <>
      {/* Image preview */}
      {imageUrl && (
        <div className="mb-6">
          <ImagePreviewThumbnail
            imageUrl={imageUrl}
            onClick={() => setImageDialogOpen(true)}
            alt="Receipt"
          />
        </div>
      )}

      <ImagePreviewDialog
        open={imageDialogOpen}
        onOpenChange={setImageDialogOpen}
        imageUrl={imageUrl}
        alt="Receipt Image"
      />

      {/* Form */}
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* Amount and Currency */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...form.register('amount')}
            />
            {form.formState.errors.amount && (
              <p className="text-sm text-destructive">
                {form.formState.errors.amount.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <CurrencyPicker
              value={form.watch('currency')}
              onChange={(value) => form.setValue('currency', value)}
            />
            {form.formState.errors.currency && (
              <p className="text-sm text-destructive">
                {form.formState.errors.currency.message}
              </p>
            )}
          </div>
        </div>

        {/* Merchant */}
        <div className="space-y-2">
          <Label htmlFor="merchant">Merchant</Label>
          <Input
            id="merchant"
            placeholder="Store or merchant name"
            {...form.register('merchant')}
          />
        </div>

        {/* Transaction Date */}
        <div className="space-y-2">
          <Label htmlFor="expenseDate">Transaction Date</Label>
          <Input
            id="expenseDate"
            type="date"
            {...form.register('expenseDate')}
          />
        </div>

        {/* Categories (optional) */}
        {showCategories && (
          <div className="space-y-2">
            <Label htmlFor="categories">Categories</Label>
            <Input
              id="categories"
              placeholder="e.g., Food, Travel, Office (comma-separated)"
              {...form.register('categories')}
            />
            <p className="text-xs text-muted-foreground">
              Separate multiple categories with commas
            </p>
          </div>
        )}

        {/* Description (optional) */}
        {showDescription && (
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              placeholder="Add any notes about this expense"
              {...form.register('description')}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            className="flex-1"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {submitLabel}
              </>
            )}
          </Button>
          {showDeleteButton && onDelete && (
            <Button
              type="button"
              variant="destructive"
              size="lg"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </form>

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
              disabled={isDeleting}
            >
              {isDeleting ? (
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
