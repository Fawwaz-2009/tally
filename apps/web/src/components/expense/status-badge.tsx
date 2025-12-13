import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

import type { ExpenseState } from '@repo/data-ops/schemas'
import { Badge } from '@/components/ui/badge'

interface StatusBadgeProps {
  state: ExpenseState
  showConfirmed?: boolean
}

/**
 * Unified status badge for expense state display
 * - pending: blue with spinner (Processing)
 * - pending-review: amber with warning icon (Needs Review)
 * - confirmed: green with checkmark (if showConfirmed is true)
 */
export function StatusBadge({ state, showConfirmed = false }: StatusBadgeProps) {
  switch (state) {
    case 'pending':
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          Processing
        </Badge>
      )

    case 'pending-review':
      return (
        <Badge variant="warning" className="gap-1">
          <AlertCircle className="w-3 h-3" />
          Needs Review
        </Badge>
      )

    case 'confirmed':
      if (showConfirmed) {
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle className="w-3 h-3" />
            Confirmed
          </Badge>
        )
      }
      return null

    default:
      return null
  }
}

/**
 * Get status label text based on state
 */
export function getStatusLabel(state: ExpenseState): string {
  switch (state) {
    case 'pending':
      return 'Processing'
    case 'pending-review':
      return 'Needs Review'
    case 'confirmed':
      return 'Confirmed'
  }
}

/**
 * Get status-based styling for cards/containers
 */
export function getStatusStyle(state: ExpenseState): {
  border: string
  bg: string
  hoverBg: string
  badgeBg: string
  textColor: string
} {
  switch (state) {
    case 'pending':
      return {
        border: 'border-blue-500',
        bg: 'bg-blue-50 dark:bg-blue-950/20',
        hoverBg: 'hover:bg-blue-100/50 dark:hover:bg-blue-900/20',
        badgeBg: 'bg-blue-100 dark:bg-blue-900/40',
        textColor: 'text-blue-600 dark:text-blue-400',
      }

    case 'pending-review':
      return {
        border: 'border-amber-500',
        bg: 'bg-amber-50 dark:bg-amber-950/20',
        hoverBg: 'hover:bg-amber-100/50 dark:hover:bg-amber-900/20',
        badgeBg: 'bg-amber-100 dark:bg-amber-900/40',
        textColor: 'text-amber-600 dark:text-amber-400',
      }

    case 'confirmed':
      return {
        border: 'border-border',
        bg: 'bg-card',
        hoverBg: 'hover:bg-muted/50',
        badgeBg: 'bg-muted',
        textColor: 'text-foreground',
      }
  }
}
