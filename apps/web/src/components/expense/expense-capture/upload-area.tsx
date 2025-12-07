import { useRef, useCallback } from 'react'
import { ImageIcon, Loader2, Upload, AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { ProcessingStage } from './capture-types'

interface UploadAreaProps {
  stage: ProcessingStage
  previewUrl: string | undefined
  error: string | null
  canUpload: boolean
  onFileSelect: (file: File) => void
  onReset: () => void
}

export function UploadArea({ stage, previewUrl, error, canUpload, onFileSelect, onReset }: UploadAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0] as File | undefined
      if (file?.type.startsWith('image/')) {
        onFileSelect(file)
      }
    },
    [onFileSelect],
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileSelect(file)
    }
  }

  const isProcessing = stage === 'processing'

  return (
    <>
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${isProcessing ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
          ${stage === 'error' ? 'border-destructive bg-destructive/5' : ''}
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

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInputChange} />

      {stage === 'error' && error && (
        <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Extraction failed</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={onReset}>
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
