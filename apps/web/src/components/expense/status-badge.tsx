import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'

export type ExpenseStatus =
  | 'submitted'
  | 'processing'
  | 'needs-review'
  | 'success'

interface StatusBadgeProps {
  status: string
  showSuccess?: boolean
}

/**
 * Unified status badge for expense status display
 * - Processing: blue with spinner
 * - Needs Review: amber with warning icon
 * - Success: green with checkmark (if showSuccess is true)
 */
export function StatusBadge({ status, showSuccess = false }: StatusBadgeProps) {
  switch (status) {
    case 'submitted':
    case 'processing':
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          Processing
        </Badge>
      )
    case 'needs-review':
      return (
        <Badge variant="warning" className="gap-1">
          <AlertCircle className="w-3 h-3" />
          Needs Review
        </Badge>
      )
    case 'success':
      if (showSuccess) {
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle className="w-3 h-3" />
            Complete
          </Badge>
        )
      }
      return null
    default:
      return null
  }
}

/**
 * Get status label text
 */
export function getStatusLabel(status: string): string {
  switch (status) {
    case 'submitted':
      return 'Submitted'
    case 'processing':
      return 'Processing'
    case 'needs-review':
      return 'Needs Review'
    case 'success':
      return 'Complete'
    default:
      return 'Review'
  }
}

/**
 * Get status-based styling for cards/containers
 */
export function getStatusStyle(status: string): {
  border: string
  bg: string
  hoverBg: string
  badgeBg: string
  textColor: string
} {
  switch (status) {
    case 'submitted':
    case 'processing':
      return {
        border: 'border-blue-500',
        bg: 'bg-blue-50 dark:bg-blue-950/20',
        hoverBg: 'hover:bg-blue-100/50 dark:hover:bg-blue-900/20',
        badgeBg: 'bg-blue-100 dark:bg-blue-900/40',
        textColor: 'text-blue-600 dark:text-blue-400',
      }
    case 'needs-review':
    default:
      return {
        border: 'border-amber-500',
        bg: 'bg-amber-50 dark:bg-amber-950/20',
        hoverBg: 'hover:bg-amber-100/50 dark:hover:bg-amber-900/20',
        badgeBg: 'bg-amber-100 dark:bg-amber-900/40',
        textColor: 'text-amber-600 dark:text-amber-400',
      }
  }
}
