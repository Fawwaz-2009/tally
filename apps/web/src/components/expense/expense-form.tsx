import { useRef, useState } from 'react'
import { Camera, Loader2, Receipt, Save, Trash2, X, ZoomIn } from 'lucide-react'

import { CurrencyPicker } from './currency-picker'
import { MerchantPicker } from './merchant-picker'
import { ImagePreviewDialog } from './image-preview-dialog'
import { smallestUnitToDisplay } from '@/lib/expense-utils'
import { formatDateForInput } from '@/lib/date-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export interface ExpenseFormData {
  amount: number // display amount (e.g., 300 for 300 SAR, 19.99 for 19.99 USD)
  currency: string
  merchantName: string
  expenseDate: string
  userId?: string
  image?: File
}

interface User {
  id: string
  name: string
}

interface ExpenseFormProps {
  // Mode
  mode: 'create' | 'edit'
  // Initial data (for edit mode)
  initialData?: {
    amount: number | null
    currency: string | null
    merchantName: string | null
    category?: string | null
    expenseDate?: Date | string | null
    imageUrl?: string | null
  }
  // Users for selection (optional - only shown if provided with multiple users)
  users?: User[]
  defaultUserId?: string
  // Callbacks
  onSubmit: (data: ExpenseFormData) => void
  onDelete?: () => void
  onCancel?: () => void
  // State
  isSubmitting?: boolean
  isDeleting?: boolean
  submitLabel?: string
  // Error message
  error?: string | null
}

export function ExpenseForm({
  mode,
  initialData,
  users,
  defaultUserId,
  onSubmit,
  onDelete,
  onCancel,
  isSubmitting = false,
  isDeleting = false,
  submitLabel,
  error,
}: ExpenseFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [amount, setAmount] = useState(() =>
    smallestUnitToDisplay(initialData?.amount ?? null, initialData?.currency || 'USD')
  )
  const [currency, setCurrency] = useState(initialData?.currency || 'USD')
  const [merchantName, setMerchantName] = useState(initialData?.merchantName || '')
  const [expenseDate, setExpenseDate] = useState(() =>
    formatDateForInput(initialData?.expenseDate ?? new Date())
  )
  const [selectedUserId, setSelectedUserId] = useState(defaultUserId || users?.[0]?.id || '')
  const [validationError, setValidationError] = useState<string | null>(null)

  // Determine image URL to display
  const displayImageUrl = previewUrl || initialData?.imageUrl

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(URL.createObjectURL(file))
      setValidationError(null)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    // Validation
    if (mode === 'create' && !selectedFile && !initialData?.imageUrl) {
      setValidationError('Please select a receipt image')
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      setValidationError('Please enter a valid amount')
      return
    }

    if (!merchantName.trim()) {
      setValidationError('Please enter a merchant name')
      return
    }

    if (!expenseDate) {
      setValidationError('Please select a date')
      return
    }

    // Parse amount as a display value (the API will convert to smallest units)
    const displayAmount = parseFloat(amount)

    onSubmit({
      amount: displayAmount,
      currency,
      merchantName: merchantName.trim(),
      expenseDate,
      userId: selectedUserId || undefined,
      image: selectedFile || undefined,
    })
  }

  const handleDelete = () => {
    setDeleteDialogOpen(false)
    onDelete?.()
  }

  const showUserSelector = users && users.length > 1
  const displayError = error || validationError
  const defaultSubmitLabel = mode === 'create' ? 'Save Expense' : 'Save Changes'

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image Upload / Preview */}
        <div className="space-y-2">
          <Label>Receipt Image</Label>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />

          {!displayImageUrl ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Camera className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Upload Receipt</p>
                  <p className="text-sm text-muted-foreground">Tap to take a photo or select an image</p>
                </div>
              </div>
            </button>
          ) : (
            <div className="relative">
              {/* Receipt preview thumbnail */}
              <button
                type="button"
                onClick={() => setImageDialogOpen(true)}
                className="relative h-48 w-full bg-muted overflow-hidden shrink-0 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
              >
                <img
                  src={displayImageUrl}
                  alt="Receipt preview"
                  className="w-full h-full object-contain brightness-90 group-hover:brightness-100 group-active:brightness-100 transition-all duration-200"
                />

                {/* Bottom gradient */}
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background/60 to-transparent pointer-events-none" />

                {/* Zoom indicator */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-background/80 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 group-active:opacity-100 transition-opacity shadow-lg">
                    <ZoomIn className="w-4 h-4" />
                    <span className="text-xs font-mono uppercase tracking-wider">View Receipt</span>
                  </div>
                </div>

                {/* Receipt badge */}
                <div className="absolute top-3 left-3 bg-background/60 backdrop-blur-md rounded-full px-3 py-1 flex items-center gap-2 pointer-events-none">
                  <Receipt className="w-3 h-3 text-foreground" />
                  <span className="text-[10px] font-mono text-foreground uppercase tracking-wider">Receipt</span>
                </div>
              </button>

              {/* Change/Remove buttons */}
              <div className="absolute top-3 right-3 flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-7 text-xs bg-background/80 backdrop-blur-sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Change
                </Button>
                {mode === 'create' && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleRemoveFile}
                    aria-label="Remove image"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User selector - only show if multiple users */}
        {showUserSelector && (
          <div className="space-y-2">
            <Label>User</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Merchant */}
        <div className="space-y-2">
          <Label>Merchant</Label>
          <MerchantPicker value={merchantName} onChange={setMerchantName} />
          {initialData?.category && (
            <p className="text-xs text-muted-foreground">
              Category: <span className="font-medium">{initialData.category}</span>
            </p>
          )}
        </div>

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
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <CurrencyPicker value={currency} onChange={setCurrency} />
          </div>
        </div>

        {/* Transaction Date */}
        <div className="space-y-2">
          <Label>Transaction Date</Label>
          <DatePicker
            value={expenseDate}
            onChange={(date) => setExpenseDate(date)}
            placeholder="Select transaction date"
          />
        </div>

        {/* Error */}
        {displayError && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            {displayError}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button type="submit" className="flex-1" size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {submitLabel || defaultSubmitLabel}
              </>
            )}
          </Button>
          {mode === 'edit' && onDelete && (
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
          {onCancel && (
            <Button type="button" variant="outline" size="lg" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>

      {/* Image preview dialog */}
      <ImagePreviewDialog
        open={imageDialogOpen}
        onOpenChange={setImageDialogOpen}
        imageUrl={displayImageUrl}
        alt="Receipt"
      />

      {/* Delete confirmation dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </>
  )
}
