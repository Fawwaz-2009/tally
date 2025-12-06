import { Loader2, AlertCircle, CheckCircle, FileWarning } from 'lucide-react'

import { Badge } from '@/components/ui/badge'

export type ExpenseState = 'draft' | 'complete'
export type ExtractionStatus = 'pending' | 'processing' | 'done' | 'failed'

interface StatusBadgeProps {
  state: string
  extractionStatus?: string
  showComplete?: boolean
}

/**
 * Unified status badge for expense state display
 * - Draft + pending/processing: blue with spinner (Processing)
 * - Draft + done: amber with warning icon (Needs Review)
 * - Draft + failed: red with warning icon (Extraction Failed)
 * - Complete: green with checkmark (if showComplete is true)
 */
export function StatusBadge({
  state,
  extractionStatus,
  showComplete = false,
}: StatusBadgeProps) {
  if (state === 'draft') {
    if (extractionStatus === 'pending' || extractionStatus === 'processing') {
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          Processing
        </Badge>
      )
    }
    if (extractionStatus === 'failed') {
      return (
        <Badge variant="destructive" className="gap-1">
          <FileWarning className="w-3 h-3" />
          Failed
        </Badge>
      )
    }
    // extractionStatus === 'done' but still draft = needs review
    return (
      <Badge variant="warning" className="gap-1">
        <AlertCircle className="w-3 h-3" />
        Needs Review
      </Badge>
    )
  }

  // state === 'complete'
  if (showComplete) {
    return (
      <Badge variant="default" className="gap-1 bg-green-600">
        <CheckCircle className="w-3 h-3" />
        Complete
      </Badge>
    )
  }
  return null
}

/**
 * Get status label text based on state and extraction status
 */
export function getStatusLabel(
  state: string,
  extractionStatus?: string,
): string {
  if (state === 'draft') {
    if (extractionStatus === 'pending' || extractionStatus === 'processing') {
      return 'Processing'
    }
    if (extractionStatus === 'failed') {
      return 'Failed'
    }
    return 'Needs Review'
  }
  return 'Complete'
}

/**
 * Get status-based styling for cards/containers
 */
export function getStatusStyle(
  state: string,
  extractionStatus?: string,
): {
  border: string
  bg: string
  hoverBg: string
  badgeBg: string
  textColor: string
} {
  if (state === 'draft') {
    if (extractionStatus === 'pending' || extractionStatus === 'processing') {
      return {
        border: 'border-blue-500',
        bg: 'bg-blue-50 dark:bg-blue-950/20',
        hoverBg: 'hover:bg-blue-100/50 dark:hover:bg-blue-900/20',
        badgeBg: 'bg-blue-100 dark:bg-blue-900/40',
        textColor: 'text-blue-600 dark:text-blue-400',
      }
    }
    if (extractionStatus === 'failed') {
      return {
        border: 'border-red-500',
        bg: 'bg-red-50 dark:bg-red-950/20',
        hoverBg: 'hover:bg-red-100/50 dark:hover:bg-red-900/20',
        badgeBg: 'bg-red-100 dark:bg-red-900/40',
        textColor: 'text-red-600 dark:text-red-400',
      }
    }
    // needs review
    return {
      border: 'border-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-950/20',
      hoverBg: 'hover:bg-amber-100/50 dark:hover:bg-amber-900/20',
      badgeBg: 'bg-amber-100 dark:bg-amber-900/40',
      textColor: 'text-amber-600 dark:text-amber-400',
    }
  }
  // complete - no special styling needed
  return {
    border: 'border-border',
    bg: 'bg-card',
    hoverBg: 'hover:bg-muted/50',
    badgeBg: 'bg-muted',
    textColor: 'text-foreground',
  }
}
