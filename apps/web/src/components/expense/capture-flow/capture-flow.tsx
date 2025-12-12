import { useState, useCallback } from 'react'

import { UploadStage } from './upload-stage'
import { ReviewStage } from './review-stage'
import { SuccessStage } from './success-stage'

type FlowStage = 'upload' | 'review' | 'success'

export interface CaptureFlowProps {
  userId: string
  /** Show "Add Another" button on success (default: false) */
  showAddAnother?: boolean
  /** Custom action button for success stage (e.g., "Continue to Dashboard") */
  successActionButton?: React.ReactNode
  /** Called when flow completes (after success stage) */
  onComplete?: (expenseId: string) => void
}

/**
 * State-based expense capture flow.
 *
 * Use this for:
 * - Setup page (where URL-based routing isn't needed)
 * - Storybook stories (for testing the full flow)
 *
 * For the /add route, use the URL-based stage components directly
 * to get proper browser navigation support.
 */
export function CaptureFlow({ userId, showAddAnother = false, successActionButton, onComplete }: CaptureFlowProps) {
  const [stage, setStage] = useState<FlowStage>('upload')
  const [expenseId, setExpenseId] = useState<string | null>(null)

  const handleUploadComplete = useCallback(
    (id: string, needsReview: boolean) => {
      setExpenseId(id)
      if (needsReview) {
        setStage('review')
      } else {
        setStage('success')
        onComplete?.(id)
      }
    },
    [onComplete],
  )

  const handleReviewComplete = useCallback(
    (id: string) => {
      setStage('success')
      onComplete?.(id)
    },
    [onComplete],
  )

  const handleAddAnother = useCallback(() => {
    setStage('upload')
    setExpenseId(null)
  }, [])

  const handleBack = useCallback(() => {
    setStage('upload')
    setExpenseId(null)
  }, [])

  if (stage === 'review' && expenseId) {
    return <ReviewStage expenseId={expenseId} onComplete={handleReviewComplete} onBack={handleBack} />
  }

  if (stage === 'success' && expenseId) {
    return <SuccessStage expenseId={expenseId} onAddAnother={showAddAnother ? handleAddAnother : undefined} actionButton={successActionButton} />
  }

  return <UploadStage userId={userId} onComplete={handleUploadComplete} />
}
