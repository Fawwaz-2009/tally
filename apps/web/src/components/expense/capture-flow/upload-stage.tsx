import { useCallback, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ImageIcon, Loader2, Upload, AlertCircle, Server, CheckCircle2, XCircle } from 'lucide-react'

import { useTRPC } from '@/integrations/trpc-react'
import { Button } from '@/components/ui/button'

export interface UploadStageProps {
  userId: string
  onComplete: (expenseId: string, needsReview: boolean) => void
}

export function UploadStage({ userId, onComplete }: UploadStageProps) {
  const trpc = useTRPC()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const ollamaHealth = useQuery(trpc.expenses.checkExtractionHealth.queryOptions())

  const captureExpense = useMutation(
    trpc.expenses.capture.mutationOptions({
      onSuccess: (result) => {
        onComplete(result.expense.id!, result.needsReview)
      },
      onError: (err) => {
        setError(err.message)
        setPreviewUrl(null)
      },
    }),
  )

  const handleFileSelect = useCallback(
    (file: File) => {
      if (!userId) {
        setError('User ID is required')
        return
      }

      // Show preview immediately
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setError(null)

      // Send FormData directly - server handles all transformation
      const formData = new FormData()
      formData.append('image', file)
      formData.append('userId', userId)

      captureExpense.mutate(formData)
    },
    [userId, captureExpense],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0] as File | undefined
      if (file?.type.startsWith('image/')) {
        handleFileSelect(file)
      }
    },
    [handleFileSelect],
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleReset = () => {
    setPreviewUrl(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const isProcessing = captureExpense.isPending
  const canUpload = !!ollamaHealth.data?.modelAvailable

  return (
    <>
      {/* Ollama Status */}
      <OllamaStatus isLoading={ollamaHealth.isLoading} data={ollamaHealth.data} />

      {/* Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${isProcessing ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
          ${error ? 'border-destructive bg-destructive/5' : ''}
          ${!canUpload ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {previewUrl ? (
          <div className="space-y-4">
            <img src={previewUrl} alt="Selected screenshot" className="w-32 h-32 object-cover rounded-lg mx-auto border" />
            {isProcessing && (
              <div className="flex items-center justify-center gap-2 text-primary">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">Processing your receipt...</span>
              </div>
            )}
          </div>
        ) : (
          <>
            <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground mb-4">Drag and drop a payment screenshot here, or click to select</p>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={!canUpload}>
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
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFileSelect(file)
        }}
      />

      {error && (
        <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Extraction failed</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={handleReset}>
                Try again
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="text-center mt-6">
        <p className="text-xs text-muted-foreground">Upload a screenshot of a payment from Wise, Monzo, or any banking app</p>
      </div>
    </>
  )
}

// Co-located Ollama status component
interface OllamaStatusProps {
  isLoading: boolean
  data:
    | {
        available: boolean
        configured: boolean
        modelAvailable: boolean
        model: string | null
        host: string
        models: string[]
      }
    | undefined
}

function OllamaStatus({ isLoading, data }: OllamaStatusProps) {
  const getStatus = () => {
    if (isLoading) {
      return (
        <span className="flex items-center gap-1 text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          Checking...
        </span>
      )
    }

    if (data?.available && data.modelAvailable) {
      return (
        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
          <CheckCircle2 className="w-3 h-3" />
          Ready ({data.model})
        </span>
      )
    }

    if (data?.available && !data.configured) {
      return (
        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
          <AlertCircle className="w-3 h-3" />
          Model not configured
        </span>
      )
    }

    if (data?.available && !data.modelAvailable) {
      return (
        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
          <AlertCircle className="w-3 h-3" />
          Model &quot;{data.model}&quot; not found
        </span>
      )
    }

    return (
      <span className="flex items-center gap-1 text-destructive">
        <XCircle className="w-3 h-3" />
        Ollama unavailable
      </span>
    )
  }

  return (
    <div className="mb-4 p-3 rounded-lg bg-muted/50 text-sm">
      <div className="flex items-center gap-2">
        <Server className="w-4 h-4 text-muted-foreground" />
        <span className="text-muted-foreground">AI Extraction:</span>
        {getStatus()}
      </div>
      {data && !data.available && <p className="text-xs text-muted-foreground mt-1 ml-6">Make sure Ollama is running at {data.host}</p>}
      {data?.available && !data.modelAvailable && data.models.length > 0 && (
        <p className="text-xs text-muted-foreground mt-1 ml-6">
          Available: {data.models.slice(0, 3).join(', ')}
          {data.models.length > 3 && ` +${data.models.length - 3} more`}
        </p>
      )}
    </div>
  )
}
