import { useState, useRef, useCallback } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  CheckCircle2,
  Home,
  Loader2,
  Upload,
  ImageIcon,
  AlertCircle,
  Clock,
  Sparkles,
  Server,
  XCircle,
} from 'lucide-react'

import { useTRPC } from '@/integrations/trpc-react'
import { Button } from '@/components/ui/button'

interface WaitingForExpenseProps {
  userName: string
  userId: string
}

type ProcessingStage =
  | 'idle'
  | 'uploading'
  | 'ocr'
  | 'extracting'
  | 'complete'
  | 'error'

export function WaitingForExpense({
  userName,
  userId,
}: WaitingForExpenseProps) {
  const trpc = useTRPC()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check Ollama health on mount
  const ollamaHealth = useQuery(trpc.expenses.checkOllamaHealth.queryOptions())

  const [stage, setStage] = useState<ProcessingStage>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [extractedData, setExtractedData] = useState<{
    amount: number | null
    currency: string | null
    merchant: string | null
  } | null>(null)
  const [timing, setTiming] = useState<{
    ocrMs: number
    llmMs: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const uploadAndProcess = useMutation(
    trpc.expenses.uploadAndProcess.mutationOptions({
      onSuccess: (result) => {
        setStage('complete')
        if (result.extraction.success && result.extraction.data) {
          setExtractedData({
            amount: result.extraction.data.amount,
            currency: result.extraction.data.currency,
            merchant: result.extraction.data.merchant,
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
    async (file: File) => {
      // Show preview
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setError(null)

      // Convert to base64
      setStage('uploading')
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        setStage('ocr')

        // Simulate OCR stage - only advance if we haven't errored
        setTimeout(() => {
          setStage((current) => (current === 'ocr' ? 'extracting' : current))
        }, 500)

        uploadAndProcess.mutate({
          userId,
          imageBase64: base64,
          fileName: file.name,
          contentType: file.type,
        })
      }
      reader.readAsDataURL(file)
    },
    [userId, uploadAndProcess],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file && file.type.startsWith('image/')) {
        handleFileSelect(file)
      }
    },
    [handleFileSelect],
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  // Success state - show extracted data and redirect button
  if (stage === 'complete' && extractedData) {
    return (
      <div className="min-h-screen flex flex-col justify-center px-6 py-12">
        <div className="max-w-sm mx-auto w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight font-heading mb-2">
            Expense Extracted!
          </h1>
          <p className="text-muted-foreground mb-6">
            Your setup is complete. Tally is ready to track your expenses.
          </p>

          {previewUrl && (
            <div className="mb-4">
              <img
                src={previewUrl}
                alt="Uploaded receipt"
                className="w-32 h-32 object-cover rounded-lg mx-auto border"
              />
            </div>
          )}

          <div className="bg-muted/50 rounded-lg p-4 mb-4 text-left">
            <div className="text-sm text-muted-foreground mb-1">
              Extracted expense:
            </div>
            <div className="font-mono text-lg font-semibold">
              {extractedData.currency ?? 'USD'}{' '}
              {extractedData.amount !== null
                ? (extractedData.amount / 100).toFixed(2)
                : '0.00'}
            </div>
            {extractedData.merchant && (
              <div className="text-sm text-muted-foreground">
                {extractedData.merchant}
              </div>
            )}
          </div>

          {timing && (
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mb-6">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>OCR: {(timing.ocrMs / 1000).toFixed(1)}s</span>
              </div>
              <div className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>AI: {(timing.llmMs / 1000).toFixed(1)}s</span>
              </div>
            </div>
          )}

          <Button
            className="w-full"
            size="lg"
            onClick={() => navigate({ to: '/' })}
          >
            <Home className="w-4 h-4 mr-2" />
            Go to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  // Processing states
  const isProcessing = stage !== 'idle' && stage !== 'error'

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12">
      <div className="max-w-sm mx-auto w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight font-heading mb-2">
            Welcome, {userName}!
          </h1>
          <p className="text-muted-foreground">
            Upload a screenshot of a payment to complete setup
          </p>
        </div>

        {/* Ollama status indicator */}
        <div className="mb-4 p-3 rounded-lg bg-muted/50 text-sm">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">AI Extraction:</span>
            {ollamaHealth.isLoading ? (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Checking...
              </span>
            ) : ollamaHealth.data?.available &&
              ollamaHealth.data?.modelAvailable ? (
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-3 h-3" />
                Ready ({ollamaHealth.data.model})
              </span>
            ) : ollamaHealth.data?.available &&
              !ollamaHealth.data?.configured ? (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-3 h-3" />
                Model not configured
              </span>
            ) : ollamaHealth.data?.available &&
              !ollamaHealth.data?.modelAvailable ? (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-3 h-3" />
                Model "{ollamaHealth.data.model}" not found
              </span>
            ) : (
              <span className="flex items-center gap-1 text-destructive">
                <XCircle className="w-3 h-3" />
                Ollama unavailable
              </span>
            )}
          </div>
          {ollamaHealth.data && !ollamaHealth.data.available && (
            <p className="text-xs text-muted-foreground mt-1 ml-6">
              Make sure Ollama is running at {ollamaHealth.data.host}
            </p>
          )}
          {ollamaHealth.data?.available &&
            !ollamaHealth.data.modelAvailable &&
            ollamaHealth.data.models.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1 ml-6">
                Available: {ollamaHealth.data.models.slice(0, 3).join(', ')}
                {ollamaHealth.data.models.length > 3 &&
                  ` +${ollamaHealth.data.models.length - 3} more`}
              </p>
            )}
        </div>

        {/* Upload area */}
        <div
          className={`
            border-2 border-dashed rounded-lg p-6 text-center transition-colors
            ${isProcessing ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
            ${stage === 'error' ? 'border-destructive bg-destructive/5' : ''}
            ${!ollamaHealth.data?.modelAvailable ? 'opacity-50 pointer-events-none' : ''}
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {previewUrl ? (
            <div className="space-y-4">
              <img
                src={previewUrl}
                alt="Selected screenshot"
                className="w-32 h-32 object-cover rounded-lg mx-auto border"
              />
              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-medium">
                      {stage === 'uploading' && 'Uploading...'}
                      {stage === 'ocr' && 'Reading text (OCR)...'}
                      {stage === 'extracting' && 'Extracting expense data...'}
                    </span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{
                        width:
                          stage === 'uploading'
                            ? '20%'
                            : stage === 'ocr'
                              ? '50%'
                              : stage === 'extracting'
                                ? '80%'
                                : '100%',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Drag and drop a payment screenshot here, or click to select
              </p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Select Image
              </Button>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInputChange}
        />

        {/* Error state */}
        {stage === 'error' && error && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  Extraction failed
                </p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setStage('idle')
                    setPreviewUrl(null)
                    setError(null)
                  }}
                >
                  Try again
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="text-center mt-6">
          <p className="text-xs text-muted-foreground mb-4">
            Upload a screenshot of a payment from Wise, Monzo, or any banking
            app
          </p>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">Skip for now</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
