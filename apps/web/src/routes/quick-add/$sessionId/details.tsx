import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { AlertCircle, Receipt, X, ZoomIn } from 'lucide-react'

import { useTRPC } from '@/integrations/trpc-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeCurrencyPicker } from '@/components/expense/native-currency-picker'

const searchSchema = z.object({
  user: z.string(),
  merchant: z.string(),
})

export const Route = createFileRoute('/quick-add/$sessionId/details')({
  validateSearch: searchSchema,
  component: DetailsForm,
  beforeLoad: ({ search }) => {
    console.log('DETAILS_SESSION_PAGE_BEFORE_LOAD')

    // NO redirects - just validate
    if (!search.user) {
      throw new Error('USER_REQUIRED')
    }
    if (!search.merchant) {
      throw new Error('MERCHANT_REQUIRED')
    }
  },
  errorComponent: ({ error }) => {
    const navigate = useNavigate()
    const { sessionId } = Route.useParams()
    const { user } = Route.useSearch()

    if (error.message === 'USER_REQUIRED') {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6">
          <div className="text-center space-y-4 max-w-sm">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold mb-2">User Required</h1>
              <p className="text-muted-foreground">Please select a user first.</p>
            </div>
            <Button onClick={() => navigate({ to: '/quick-add/$sessionId', params: { sessionId } })} size="lg" className="w-full">
              Select User
            </Button>
          </div>
        </div>
      )
    }

    if (error.message === 'MERCHANT_REQUIRED') {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6">
          <div className="text-center space-y-4 max-w-sm">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
              <Receipt className="w-8 h-8 text-orange-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold mb-2">Merchant Required</h1>
              <p className="text-muted-foreground">Please select a merchant first.</p>
            </div>
            <Button onClick={() => navigate({ to: '/quick-add/$sessionId/merchant', params: { sessionId }, search: { user } })} size="lg" className="w-full">
              Select Merchant
            </Button>
          </div>
        </div>
      )
    }

    throw error
  },
})

function DetailsForm() {
  const navigate = useNavigate({ from: Route.fullPath })
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { sessionId } = Route.useParams()
  const { user: userId, merchant: merchantName } = Route.useSearch()
  console.log('DETAILS_SESSION_PAGE')

  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<string | null>(null) // null = use baseCurrency
  const [showReceiptPreview, setShowReceiptPreview] = useState(false)

  // Prefetched data
  const { data: baseCurrency = 'USD' } = useQuery(trpc.settings.getBaseCurrency.queryOptions())
  const { data: users = [] } = useQuery(trpc.users.list.queryOptions())
  const { data: sessionData } = useQuery(trpc.shortcut.getSession.queryOptions({ sessionId }))

  const user = users.find((u) => u.id === userId)
  const effectiveCurrency = currency ?? baseCurrency

  // Complete session mutation
  const completeSessionMutation = useMutation(trpc.shortcut.completeSession.mutationOptions())

  // Create expense mutation
  const createMutation = useMutation(
    trpc.expenses.create.mutationOptions({
      onSuccess: async () => {
        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: trpc.expenses.list.queryKey() })
        queryClient.invalidateQueries({ queryKey: trpc.merchants.list.queryKey() })

        // Mark session as complete
        if (sessionId) {
          await completeSessionMutation.mutateAsync({ sessionId })
          await queryClient.invalidateQueries({ queryKey: trpc.shortcut.listSessions.queryKey() })
        }

        // Navigate to success screen
        navigate({
          to: '/quick-add',
          search: {},
        })
      },
    }),
  )

  const handleSubmit = async () => {
    if (!sessionData || !user || !merchantName || !amount) return

    // First, fetch the image from the session
    try {
      const imageResponse = await fetch(sessionData.imageUrl)
      const imageBlob = await imageResponse.blob()
      const imageFile = new File([imageBlob], 'receipt.jpg', { type: sessionData.contentType })

      const formData = new FormData()
      formData.append('image', imageFile)
      formData.append('userName', user.name)
      formData.append('merchantName', merchantName)
      formData.append('currency', effectiveCurrency)
      formData.append('amount', amount)
      // No expenseDate - server defaults to today for quick-add

      createMutation.mutate(formData)
    } catch (error) {
      console.error('Failed to create expense:', error)
    }
  }

  if (createMutation.isPending) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Saving expense...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      {/* Receipt preview - tappable thumbnail that expands */}
      {sessionData && (
        <button
          type="button"
          onClick={() => setShowReceiptPreview(true)}
          className="w-full flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
        >
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 border">
            <img src={sessionData.imageUrl} alt="Receipt" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{merchantName}</span>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <ZoomIn className="w-3 h-3" />
              Tap to view receipt
            </p>
          </div>
        </button>
      )}

      {/* Fullscreen receipt preview modal */}
      {showReceiptPreview && sessionData && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowReceiptPreview(false)}
        >
          <button
            type="button"
            onClick={() => setShowReceiptPreview(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img 
            src={sessionData.imageUrl} 
            alt="Receipt" 
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Amount input - large and prominent */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Amount</label>
        <div className="flex gap-2">
          <Input
            type="text"
            inputMode="decimal"
            pattern="[0-9]*\.?[0-9]*"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-14 text-2xl font-semibold flex-1"
            autoFocus
          />
          <NativeCurrencyPicker value={effectiveCurrency} onChange={setCurrency} className="h-14 w-24" />
        </div>
      </div>

      {/* Error message */}
      {createMutation.error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{createMutation.error.message || 'Failed to save expense. Please try again.'}</p>
        </div>
      )}

      {/* Submit button */}
      <Button onClick={handleSubmit} disabled={!amount || parseFloat(amount) <= 0 || createMutation.isPending} size="lg" className="w-full h-14 text-lg">
        Save Expense
      </Button>
    </div>
  )
}
