import { useCallback, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'

import { useTRPC } from '@/integrations/trpc-react'
import { Button } from '@/components/ui/button'
import { type ProcessingStage, type ExtractedData, type TimingData, OllamaStatus, UploadArea, SuccessView } from '@/components/expense'

interface WaitingForExpenseProps {
  userName: string
  userId: string
}

export function WaitingForExpense({ userName, userId }: WaitingForExpenseProps) {
  const trpc = useTRPC()
  const navigate = useNavigate()

  // Check Ollama health on mount
  const ollamaHealth = useQuery(trpc.expenses.checkExtractionHealth.queryOptions())

  // State
  const [stage, setStage] = useState<ProcessingStage>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [timing, setTiming] = useState<TimingData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const captureMutation = useMutation(
    trpc.expenses.capture.mutationOptions({
      onSuccess: (result) => {
        setStage('complete')
        if (result.extraction.success && result.extraction.data) {
          setExtractedData({
            amount: result.extraction.data.amount ?? null,
            currency: result.extraction.data.currency ?? null,
            merchant: result.extraction.data.merchant ?? null,
            date: result.extraction.data.date ?? null,
          })
        }
        setTiming(result.extraction.timing)
      },
      onError: (err) => {
        setStage('error')
        setError(err.message)
      },
    }),
  )

  const handleFileSelect = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setError(null)
      setStage('processing')

      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        captureMutation.mutate({
          userId,
          imageBase64: base64,
          fileName: file.name,
          contentType: file.type,
        })
      }
      reader.readAsDataURL(file)
    },
    [userId, captureMutation],
  )

  const handleReset = () => {
    setStage('idle')
    setPreviewUrl(undefined)
    setExtractedData(null)
    setTiming(null)
    setError(null)
  }

  // Success state - show extracted data and redirect to dashboard
  if (stage === 'complete' && extractedData) {
    return (
      <SuccessView
        previewUrl={previewUrl}
        amount={extractedData.amount !== null ? (extractedData.amount / 100).toFixed(2) : '0.00'}
        currency={extractedData.currency ?? 'USD'}
        merchant={extractedData.merchant ?? 'Unknown'}
        timing={timing}
        title="Expense Extracted!"
        subtitle="Your setup is complete. Tally is ready to track your expenses."
        primaryAction={{ label: 'Go to Dashboard', to: '/' }}
      />
    )
  }

  const canUpload = ollamaHealth.data?.modelAvailable

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12">
      <div className="max-w-sm mx-auto w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight font-heading mb-2">Welcome, {userName}!</h1>
          <p className="text-muted-foreground">Upload a screenshot of a payment to complete setup</p>
        </div>

        <OllamaStatus isLoading={ollamaHealth.isLoading} data={ollamaHealth.data} />

        <UploadArea stage={stage} previewUrl={previewUrl} error={error} canUpload={!!canUpload} onFileSelect={handleFileSelect} onReset={handleReset} />

        <div className="text-center mt-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">Skip for now</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
