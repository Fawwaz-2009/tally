import { ArrowLeft, Clock, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ExpenseForm, type ExpenseFormData } from '@/components/expense/expense-form'
import type { ExtractedData, TimingData } from './capture-types'

interface ReviewFormProps {
  previewUrl: string | undefined
  extractedData: ExtractedData
  timing: TimingData | null
  error: string | null
  isSaving: boolean
  onSave: (data: { amount: number; currency: string; merchant: string; expenseDate: string }) => void
  onBack: () => void
}

export function ReviewForm({ previewUrl, extractedData, timing, error, isSaving, onSave, onBack }: ReviewFormProps) {
  const handleSubmit = (data: ExpenseFormData) => {
    onSave({
      amount: data.amount,
      currency: data.currency,
      merchant: data.merchant || '',
      expenseDate: data.expenseDate || '',
    })
  }

  return (
    <div className="px-6 pt-12 pb-24">
      <div className="max-w-sm mx-auto w-full">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Review Expense</h1>
        </div>

        {/* Timing info */}
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

        <ExpenseForm
          initialData={{
            amount: extractedData.amount,
            currency: extractedData.currency,
            merchant: extractedData.merchant,
            expenseDate: extractedData.date !== null ? extractedData.date.split('T')[0] : new Date().toISOString().split('T')[0],
          }}
          imageUrl={previewUrl}
          onSubmit={handleSubmit}
          isSubmitting={isSaving}
          submitLabel="Save Expense"
          error={error}
        />
      </div>
    </div>
  )
}
