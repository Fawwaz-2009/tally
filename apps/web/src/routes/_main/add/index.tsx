import { useCallback, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'

import { useTRPC } from '@/integrations/trpc-react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { type ProcessingStage, type ExtractedData, type TimingData, OllamaStatus, UploadArea, ReviewForm, SuccessView } from '@/components/expense'

export const Route = createFileRoute('/_main/add/')({ component: AddExpense })

function AddExpense() {
  const trpc = useTRPC()

  // Queries
  const ollamaHealth = useQuery(trpc.expenses.checkExtractionHealth.queryOptions())
  const usersQuery = useQuery(trpc.users.list.queryOptions())

  // State
  const [stage, setStage] = useState<ProcessingStage>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [timing, setTiming] = useState<TimingData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [expenseId, setExpenseId] = useState<string | null>(null)

  // For success view
  const [savedData, setSavedData] = useState<{
    amount: string
    currency: string
    merchant: string
  } | null>(null)

  // Mutations - using the new capture API
  const captureExpense = useMutation(
    trpc.expenses.capture.mutationOptions({
      onSuccess: (result) => {
        setStage('complete')
        setExpenseId(result.expense.id)
        if (result.extraction.success && result.extraction.data) {
          const data = result.extraction.data
          setExtractedData({
            amount: data.amount,
            currency: data.currency,
            merchant: data.merchant,
            date: data.date,
          })
        }
        setTiming(result.extraction.timing)

        // If expense was auto-completed (all fields extracted), show success
        if (!result.needsReview && result.expense.state === 'complete') {
          setSavedData({
            amount: ((result.expense.amount ?? 0) / 100).toFixed(2),
            currency: result.expense.currency ?? 'USD',
            merchant: result.expense.merchant ?? 'Unknown',
          })
          setStage('saved')
        }
      },
      onError: (err) => {
        setStage('error')
        setError(err.message)
      },
    }),
  )

  // Complete mutation for finalizing draft expenses
  const completeExpense = useMutation(
    trpc.expenses.complete.mutationOptions({
      onError: (err) => {
        setError(err.message)
      },
    }),
  )

  // Handlers
  const handleFileSelect = useCallback(
    (file: File) => {
      if (!selectedUserId) {
        setError('Please select a user first')
        return
      }

      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setError(null)
      setStage('processing')

      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        captureExpense.mutate({ userId: selectedUserId, imageBase64: base64, fileName: file.name, contentType: file.type })
      }
      reader.readAsDataURL(file)
    },
    [selectedUserId, captureExpense],
  )

  const handleReset = () => {
    setStage('idle')
    setPreviewUrl(undefined)
    setExtractedData(null)
    setTiming(null)
    setError(null)
    setExpenseId(null)
    setSavedData(null)
  }

  const handleSave = (data: { amount: number; currency: string; merchant: string; expenseDate: string }) => {
    if (!expenseId) return

    // Use the complete mutation to finalize the draft expense
    completeExpense.mutate(
      {
        id: expenseId,
        amount: data.amount,
        currency: data.currency,
        merchant: data.merchant || undefined,
        expenseDate: data.expenseDate || undefined,
      },
      {
        onSuccess: () => {
          setSavedData({
            amount: (data.amount / 100).toFixed(2),
            currency: data.currency,
            merchant: data.merchant,
          })
          setStage('saved')
        },
      },
    )
  }

  // Set default user when users load
  if (usersQuery.data && usersQuery.data.length > 0 && !selectedUserId) {
    setSelectedUserId(usersQuery.data[0].id)
  }

  // Render based on stage
  if (stage === 'saved' && savedData) {
    return (
      <SuccessView
        previewUrl={previewUrl}
        amount={savedData.amount}
        currency={savedData.currency}
        merchant={savedData.merchant}
        timing={timing}
        secondaryAction={{ label: 'Add Another Expense', onClick: handleReset }}
      />
    )
  }

  if (stage === 'complete' && extractedData) {
    return <ReviewForm previewUrl={previewUrl} extractedData={extractedData} timing={timing} error={error} isSaving={completeExpense.isPending} onSave={handleSave} onBack={handleReset} />
  }

  const canUpload = ollamaHealth.data?.modelAvailable && selectedUserId

  return (
    <div className="px-6 pt-12 pb-24">
      <div className="max-w-sm mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight font-heading mb-2">Capture Receipt</h1>
          <p className="text-muted-foreground">Upload a screenshot of a payment to extract expense details</p>
        </div>

        {/* User selector */}
        {usersQuery.data && usersQuery.data.length > 1 && (
          <div className="mb-4 space-y-2">
            <Label>User</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {usersQuery.data.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <OllamaStatus isLoading={ollamaHealth.isLoading} data={ollamaHealth.data} />

        <UploadArea stage={stage} previewUrl={previewUrl} error={error} canUpload={!!canUpload} onFileSelect={handleFileSelect} onReset={handleReset} />
      </div>
    </div>
  )
}
