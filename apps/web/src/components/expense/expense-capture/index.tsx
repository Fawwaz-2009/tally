import { useCallback, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'

import { useTRPC } from '@/integrations/trpc-react'
import { OllamaStatus } from './ollama-status'
import { UploadArea } from './upload-area'
import { ReviewForm } from './review-form'
import { SuccessView } from './success-view'
import type { ProcessingStage, ExtractedData, TimingData } from './capture-types'

export interface ExpenseCaptureProps {
  userId: string
  onSuccess?: (expense: { id: string; amount: number; currency: string; merchant: string }) => void
  showAddAnother?: boolean
}

export function ExpenseCapture({ userId, onSuccess, showAddAnother = false }: ExpenseCaptureProps) {
  const trpc = useTRPC()

  // Query for Ollama health
  const ollamaHealth = useQuery(trpc.expenses.checkExtractionHealth.queryOptions())

  // State machine
  const [stage, setStage] = useState<ProcessingStage>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [timing, setTiming] = useState<TimingData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expenseId, setExpenseId] = useState<string | null>(null)
  const [savedData, setSavedData] = useState<{
    amount: string
    currency: string
    merchant: string
  } | null>(null)

  // Capture mutation
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
          const expenseData = {
            amount: ((result.expense.amount ?? 0) / 100).toFixed(2),
            currency: result.expense.currency ?? 'USD',
            merchant: result.expense.merchant ?? 'Unknown',
          }
          setSavedData(expenseData)
          setStage('saved')
          onSuccess?.({
            id: result.expense.id,
            amount: result.expense.amount ?? 0,
            currency: result.expense.currency ?? 'USD',
            merchant: result.expense.merchant ?? 'Unknown',
          })
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
      if (!userId) {
        setError('User ID is required')
        return
      }

      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setError(null)
      setStage('processing')

      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        captureExpense.mutate({
          userId,
          imageBase64: base64,
          fileName: file.name,
          contentType: file.type,
        })
      }
      reader.readAsDataURL(file)
    },
    [userId, captureExpense],
  )

  const handleReset = useCallback(() => {
    setStage('idle')
    setPreviewUrl(undefined)
    setExtractedData(null)
    setTiming(null)
    setError(null)
    setExpenseId(null)
    setSavedData(null)
  }, [])

  const handleSave = useCallback(
    (data: { amount: number; currency: string; merchant: string; expenseDate: string }) => {
      if (!expenseId) return

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
            const expenseData = {
              amount: (data.amount / 100).toFixed(2),
              currency: data.currency,
              merchant: data.merchant,
            }
            setSavedData(expenseData)
            setStage('saved')
            onSuccess?.({
              id: expenseId,
              amount: data.amount,
              currency: data.currency,
              merchant: data.merchant,
            })
          },
        },
      )
    },
    [expenseId, completeExpense, onSuccess],
  )

  // Render based on stage
  if (stage === 'saved' && savedData) {
    return (
      <SuccessView
        previewUrl={previewUrl}
        amount={savedData.amount}
        currency={savedData.currency}
        merchant={savedData.merchant}
        timing={timing}
        showAddAnother={showAddAnother}
        onAddAnother={handleReset}
      />
    )
  }

  if (stage === 'complete' && extractedData) {
    return (
      <ReviewForm
        previewUrl={previewUrl}
        extractedData={extractedData}
        timing={timing}
        error={error}
        isSaving={completeExpense.isPending}
        onSave={handleSave}
        onBack={handleReset}
      />
    )
  }

  const canUpload = ollamaHealth.data?.modelAvailable

  return (
    <>
      <OllamaStatus isLoading={ollamaHealth.isLoading} data={ollamaHealth.data} />
      <UploadArea stage={stage} previewUrl={previewUrl} error={error} canUpload={!!canUpload} onFileSelect={handleFileSelect} onReset={handleReset} />
    </>
  )
}
