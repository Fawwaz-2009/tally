import cc from 'currency-codes'
import type { Expense } from '@repo/data-ops/domain'

/**
 * Format amount from cents to a localized currency string
 */
export function formatAmount(amountInCents: number | null, currency: string | null = 'USD'): string {
  if (amountInCents === null) return '$0.00'

  const amount = amountInCents / 100
  const currencyCode = currency || 'USD'

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount)
  } catch {
    // Fallback if currency code is invalid
    return `${currencyCode} ${amount.toFixed(2)}`
  }
}

/**
 * Convert dollars to cents
 */
export function dollarsToCents(dollars: number | string): number {
  const value = typeof dollars === 'string' ? parseFloat(dollars) : dollars
  return Math.round(value * 100)
}

/**
 * Convert cents to dollars string (for form inputs)
 */
export function centsToDollars(cents: number | null): string {
  if (cents === null) return ''
  return (cents / 100).toFixed(2)
}

/**
 * Get all currency options for select components
 */
export interface CurrencyOption {
  value: string
  label: string
  name: string
}

export function getCurrencyOptions(): CurrencyOption[] {
  return cc.codes().map((code) => {
    const info = cc.code(code)
    return {
      value: code,
      label: `${code} - ${info?.currency ?? code}`,
      name: info?.currency ?? code,
    }
  })
}

/**
 * Get screenshot URL from storage path
 */
export function getScreenshotUrl(screenshotPath: string | null): string | null {
  if (!screenshotPath) return null
  return `/api/files/${screenshotPath}`
}

// =============================================================================
// Expense Display Utilities
// =============================================================================

/**
 * Check if expense has all required fields for completion
 */
export function isExpenseValid(expense: Expense): boolean {
  return (
    expense.amount !== null &&
    expense.currency !== null &&
    expense.merchant !== null &&
    expense.expenseDate !== null
  )
}

/**
 * Check if expense needs manual review
 */
export function expenseNeedsReview(expense: Expense): boolean {
  return (
    expense.state === 'draft' &&
    expense.receipt.extraction.status === 'done' &&
    !isExpenseValid(expense)
  )
}

/**
 * Get display amount (prefer base currency conversion)
 */
export function getExpenseDisplayAmount(expense: Expense): number | null {
  return expense.baseAmount ?? expense.amount
}

/**
 * Get display date (prefer expense date, fallback to captured)
 */
export function getExpenseDisplayDate(expense: Expense): Date {
  return expense.expenseDate ?? expense.receipt.capturedAt
}
