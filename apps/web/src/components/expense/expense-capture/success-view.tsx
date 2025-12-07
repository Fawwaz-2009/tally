import { Link } from '@tanstack/react-router'
import { CheckCircle2, Plus, Clock, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { TimingData } from './capture-types'

interface SuccessViewProps {
  previewUrl: string | undefined
  amount: string
  currency: string
  merchant: string
  timing?: TimingData | null
  showAddAnother?: boolean
  onAddAnother?: () => void
}

export function SuccessView({
  previewUrl,
  amount,
  currency,
  merchant,
  timing,
  showAddAnother = false,
  onAddAnother,
}: SuccessViewProps) {
  return (
    <div className="text-center">
      {/* Success icon */}
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
        <CheckCircle2 className="w-7 h-7 text-green-600 dark:text-green-400" />
      </div>

      <h2 className="text-xl font-semibold tracking-tight mb-1">Expense Saved</h2>
      <p className="text-sm text-muted-foreground mb-6">Successfully extracted and saved</p>

      {/* Expense card */}
      <div className="bg-muted/30 border rounded-xl p-4 mb-6">
        <div className="flex gap-4">
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Receipt"
              className="w-16 h-16 object-cover rounded-lg border flex-shrink-0"
            />
          )}
          <div className="flex-1 text-left min-w-0">
            <div className="font-mono text-2xl font-bold tracking-tight">
              {currency} {amount}
            </div>
            {merchant && (
              <div className="text-sm text-muted-foreground truncate">{merchant}</div>
            )}
            {timing && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {(timing.ocrMs / 1000).toFixed(1)}s
                </span>
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {(timing.llmMs / 1000).toFixed(1)}s
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {showAddAnother && onAddAnother && (
          <Button className="w-full" size="lg" onClick={onAddAnother}>
            <Plus className="w-4 h-4 mr-2" />
            Add Another Expense
          </Button>
        )}
      </div>
    </div>
  )
}
