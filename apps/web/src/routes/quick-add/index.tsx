import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { AlertCircle, ArrowLeft, CheckCircle, ChevronRight, Home, Loader2, Plus, Receipt } from 'lucide-react'

import { useTRPC } from '@/integrations/trpc-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeCurrencyPicker } from '@/components/expense/native-currency-picker'

// Search params schema
const searchSchema = z.object({
  session: z.string().optional(),
})

export const Route = createFileRoute('/quick-add/')({
  validateSearch: searchSchema,
  component: QuickAdd,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(context.trpc.users.list.queryOptions()),
      context.queryClient.ensureQueryData(context.trpc.merchants.list.queryOptions()),
      context.queryClient.ensureQueryData(context.trpc.settings.getBaseCurrency.queryOptions()),
    ])
  },
})

// Stage type for the flow
type Stage = 'user' | 'merchant' | 'details' | 'submitting' | 'success' | 'all-done' | 'error'

function QuickAdd() {
  const { session: sessionId } = Route.useSearch()
  const trpc = useTRPC()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Flow state
  const [stage, setStage] = useState<Stage>('user')
  const [sessionError, setSessionError] = useState<string | null>(null)

  // Query data
  const { data: users = [] } = useQuery(trpc.users.list.queryOptions())
  const { data: merchants = [] } = useQuery(trpc.merchants.list.queryOptions())
  const { data: baseCurrency = 'USD' } = useQuery(trpc.settings.getBaseCurrency.queryOptions())

  // Session data from tRPC
  const {
    data: sessionData,
    isLoading: isSessionLoading,
    error: sessionQueryError,
  } = useQuery({
    ...trpc.shortcut.getSession.queryOptions({ sessionId: sessionId ?? '' }),
    enabled: !!sessionId,
  })

  // Form state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [merchantName, setMerchantName] = useState('')
  const [merchantSearch, setMerchantSearch] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<string | null>(null) // null = use baseCurrency

  // Effective currency (use baseCurrency as default)
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
          completeSessionMutation.mutate({ sessionId })
        }

        // Check for more pending sessions
        const sessions = await queryClient.fetchQuery(trpc.shortcut.listSessions.queryOptions())

        if (sessions.length > 0) {
          // There are more sessions - show success and redirect to next
          setStage('success')
        } else {
          // No more sessions - show "all done" screen
          setStage('all-done')
        }
      },
      onError: () => {
        setStage('error')
      },
    }),
  )

  // Auto-select single user and go to merchant stage
  const initialStage = (): Stage => {
    if (users.length === 1) {
      if (!selectedUserId) {
        setSelectedUserId(users[0].id)
      }
      return 'merchant'
    }
    return 'user'
  }

  // Handle user selection
  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId)
    setStage('merchant')
  }

  // Handle merchant selection
  const handleMerchantSelect = (name: string) => {
    setMerchantName(name)
    setStage('details')
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!sessionData || !selectedUserId || !merchantName || !amount) return

    const user = users.find((u) => u.id === selectedUserId)
    if (!user) return

    setStage('submitting')

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
    } catch {
      setStage('error')
    }
  }

  // Handle proceeding to next session after success
  const handleNextSession = async () => {
    const sessions = await queryClient.fetchQuery(trpc.shortcut.listSessions.queryOptions())
    if (sessions.length > 0) {
      navigate({ to: '/quick-add', search: { session: sessions[0].sessionId } })
    } else {
      navigate({ to: '/' })
    }
  }

  // Filter merchants based on search
  const filteredMerchants = merchantSearch
    ? merchants.filter((m) => m.displayName.toLowerCase().includes(merchantSearch.toLowerCase()))
    : merchants.slice(0, 8) // Show top 8 recent merchants

  const isNewMerchant =
    merchantSearch.trim() !== '' && !merchants.some((m) => m.displayName.toLowerCase() === merchantSearch.toLowerCase())

  // Handle no session ID
  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <Receipt className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold mb-2">No Receipt Selected</h1>
            <p className="text-muted-foreground">Use the iOS Shortcut to share a receipt image first.</p>
          </div>
          <Button onClick={() => navigate({ to: '/' })} size="lg" className="w-full">
            Go Home
          </Button>
        </div>
      </div>
    )
  }

  // Loading state
  if (isSessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Session not found or expired
  if (sessionQueryError || !sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-bold mb-2">Session Not Found</h1>
            <p className="text-muted-foreground">
              This receipt session has expired or was already processed. Sessions expire after 10 minutes.
            </p>
          </div>
          <Button onClick={() => navigate({ to: '/' })} size="lg" className="w-full">
            Go Home
          </Button>
        </div>
      </div>
    )
  }

  // Error state
  if (stage === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
            <p className="text-muted-foreground">{sessionError || 'Failed to add expense. Please try again.'}</p>
          </div>
          <div className="flex flex-col gap-3 pt-4">
            <Button onClick={() => navigate({ to: '/add' })} size="lg" className="w-full">
              Try Again
            </Button>
            <Button variant="outline" onClick={() => navigate({ to: '/' })} size="lg" className="w-full">
              Go Home
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Success state - more sessions pending
  if (stage === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold mb-2">Expense Added!</h1>
            <p className="text-muted-foreground">
              {effectiveCurrency} {amount} at {merchantName}
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-4">
            <Button onClick={handleNextSession} size="lg" className="w-full">
              Next Receipt
            </Button>
            <Button variant="outline" onClick={() => navigate({ to: '/' })} size="lg" className="w-full">
              Done for Now
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // All done state - no more sessions
  if (stage === 'all-done') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold mb-2">All Done!</h1>
            <p className="text-muted-foreground">You've added all your receipts.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Last expense: {effectiveCurrency} {amount} at {merchantName}
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-4">
            <Button onClick={() => navigate({ to: '/' })} size="lg" className="w-full gap-2">
              <Home className="w-5 h-5" />
              Go Home
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Submitting state
  if (stage === 'submitting') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Saving expense...</p>
        </div>
      </div>
    )
  }

  // Determine actual stage (auto-select user if only one)
  const currentStage = stage === 'user' ? initialStage() : stage

  return (
    <div className="min-h-screen bg-background">
      {/* Header with receipt preview */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center gap-3 p-4">
          {currentStage !== 'user' && (
            <button
              onClick={() => {
                if (currentStage === 'details') setStage('merchant')
                else setStage('user')
              }}
              className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            <img src={sessionData.imageUrl} alt="Receipt" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">Quick Add Expense</h1>
            <p className="text-sm text-muted-foreground">
              {currentStage === 'user' && 'Select who made this purchase'}
              {currentStage === 'merchant' && 'Where did you shop?'}
              {currentStage === 'details' && 'Enter the amount'}
            </p>
          </div>
        </div>
      </div>

      {/* User Selection Stage */}
      {currentStage === 'user' && (
        <div className="p-4 space-y-2">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => handleUserSelect(user.id)}
              className="w-full flex items-center justify-between p-4 bg-card border rounded-xl hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-semibold text-primary">{user.name.charAt(0).toUpperCase()}</span>
                </div>
                <span className="font-medium">{user.name}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}

      {/* Merchant Selection Stage */}
      {currentStage === 'merchant' && (
        <div className="p-4 space-y-4">
          {/* Search input */}
          <Input
            placeholder="Search or type merchant name..."
            value={merchantSearch}
            onChange={(e) => setMerchantSearch(e.target.value)}
            className="h-12 text-base"
            autoFocus
          />

          {/* Create new option */}
          {isNewMerchant && (
            <button
              onClick={() => handleMerchantSelect(merchantSearch.trim())}
              className="w-full flex items-center gap-3 p-4 bg-primary/5 border-2 border-primary/20 border-dashed rounded-xl hover:bg-primary/10 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium text-primary">Add "{merchantSearch.trim()}"</span>
            </button>
          )}

          {/* Recent/filtered merchants */}
          <div className="space-y-2">
            {!merchantSearch && <p className="text-sm text-muted-foreground px-1">Recent merchants</p>}
            {filteredMerchants.map((merchant) => (
              <button
                key={merchant.id}
                onClick={() => handleMerchantSelect(merchant.displayName)}
                className="w-full flex items-center justify-between p-4 bg-card border rounded-xl hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="text-left">
                    <span className="font-medium block">{merchant.displayName}</span>
                    {merchant.category && <span className="text-sm text-muted-foreground">{merchant.category}</span>}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            ))}

            {filteredMerchants.length === 0 && !isNewMerchant && (
              <p className="text-center text-muted-foreground py-8">No merchants found</p>
            )}
          </div>
        </div>
      )}

      {/* Details Stage */}
      {currentStage === 'details' && (
        <div className="p-4 space-y-6">
          {/* Selected merchant summary */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Receipt className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium">{merchantName}</span>
          </div>

          {/* Amount input - large and prominent */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Amount</label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-14 text-2xl font-semibold flex-1"
                autoFocus
              />
              <NativeCurrencyPicker value={effectiveCurrency} onChange={setCurrency} className="h-14 w-24" />
            </div>
          </div>

          {/* Submit button */}
          <Button
            onClick={handleSubmit}
            disabled={!amount || parseFloat(amount) <= 0}
            size="lg"
            className="w-full h-14 text-lg"
          >
            Save Expense
          </Button>
        </div>
      )}
    </div>
  )
}
