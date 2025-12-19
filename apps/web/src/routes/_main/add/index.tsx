import { useRef, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, CheckCircle, Loader2, Upload, X } from 'lucide-react'

import { useTRPC } from '@/integrations/trpc-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CurrencyPicker } from '@/components/expense/currency-picker'
import { DatePicker } from '@/components/ui/date-picker'
import { displayToSmallestUnit } from '@/lib/expense-utils'
import { formatDateForInput } from '@/lib/date-utils'

export const Route = createFileRoute('/_main/add/')({
  component: AddExpense,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(context.trpc.users.list.queryOptions())
  },
})

function AddExpense() {
  const trpc = useTRPC()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: users } = useQuery(trpc.users.list.queryOptions())

  // Form state
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [merchant, setMerchant] = useState('')
  const [expenseDate, setExpenseDate] = useState(formatDateForInput(new Date()))
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Set default user when users load
  if (users && users.length > 0 && !selectedUserId) {
    setSelectedUserId(users[0].id)
  }

  const createMutation = useMutation(
    trpc.expenses.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.expenses.list.queryKey() })
        setSuccess(true)
      },
      onError: (err) => {
        setError(err.message || 'Failed to create expense')
      },
    }),
  )

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setError(null)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedFile) {
      setError('Please select a receipt image')
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }

    if (!merchant.trim()) {
      setError('Please enter a merchant name')
      return
    }

    const user = users?.find((u) => u.id === selectedUserId)
    if (!user) {
      setError('Please select a user')
      return
    }

    const formData = new FormData()
    formData.append('image', selectedFile)
    formData.append('userName', user.name)
    formData.append('merchant', merchant.trim())
    formData.append('currency', currency)
    formData.append('amount', String(displayToSmallestUnit(amount, currency)))
    if (expenseDate) {
      formData.append('expenseDate', expenseDate)
    }

    createMutation.mutate(formData)
  }

  const handleAddAnother = () => {
    setSuccess(false)
    setSelectedFile(null)
    setPreviewUrl(null)
    setAmount('')
    setMerchant('')
    setExpenseDate(formatDateForInput(new Date()))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Success view
  if (success) {
    return (
      <div className="px-6 pt-12 pb-24">
        <div className="max-w-sm mx-auto w-full text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-heading mb-2">Expense Added!</h1>
            <p className="text-muted-foreground">Your expense has been saved successfully.</p>
          </div>
          <div className="flex flex-col gap-3 pt-4">
            <Button onClick={handleAddAnother} size="lg" className="w-full">
              Add Another Expense
            </Button>
            <Button variant="outline" onClick={() => navigate({ to: '/' })} size="lg" className="w-full">
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 pt-12 pb-24">
      <div className="max-w-sm mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight font-heading mb-2">Add Expense</h1>
          <p className="text-muted-foreground">Upload a receipt and enter expense details</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Receipt Image</Label>
            <input type="file" ref={fileInputRef} accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />

            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
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
              </div>
            ) : (
              <div className="relative">
                <img src={previewUrl!} alt="Receipt preview" className="w-full h-48 object-cover rounded-lg" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 w-8 h-8"
                  onClick={handleRemoveFile}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* User selector - only show if multiple users */}
          {users && users.length > 1 && (
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
            <Label htmlFor="merchant">Merchant</Label>
            <Input
              id="merchant"
              placeholder="Store or merchant name"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
            />
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
            <DatePicker value={expenseDate} onChange={setExpenseDate} placeholder="Select transaction date" />
          </div>

          {/* Error */}
          {error && <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">{error}</div>}

          {/* Submit */}
          <Button type="submit" className="w-full" size="lg" disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Save Expense
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
