import { canConfirm, getDisplayAmount, getDisplayDate, getMissingFields, isConfirmed, isPending, isPendingReview } from '@repo/data-ops/schemas'
import { format, getCurrencyOptions, getExponentSafe, isValidCurrency, toDisplayString, toSmallestUnit } from '@repo/isomorphic/money'
import type { Expense, PendingReviewExpense } from '@repo/data-ops/schemas'
import type { CurrencyOption } from '@repo/isomorphic/money'

// Re-export type guards for convenience
export { isPending, isPendingReview, isConfirmed, canConfirm, getMissingFields }

// Re-export money utilities that are commonly used in the web app
export { format as formatMoney, toSmallestUnit, toDisplayString, isValidCurrency, getCurrencyOptions }
export type { CurrencyOption }

/**
 * Format amount from smallest unit to a localized currency string.
 * Currency-aware: handles different decimal places (USD=2, JPY=0, KWD=3)
 */
export function formatAmount(amountInSmallestUnit: number | null, currency: string | null = 'USD'): string {
  if (amountInSmallestUnit === null) return '$0.00'
  const currencyCode = currency || 'USD'
  return format(amountInSmallestUnit, currencyCode)
}

/**
 * Convert display amount to smallest unit for storage.
 * Currency-aware: handles different decimal places.
 *
 * @param displayAmount - Amount as shown to user (e.g., 19.99 for USD, 1000 for JPY)
 * @param currency - ISO 4217 currency code
 * @returns Amount in smallest unit
 */
export function displayToSmallestUnit(displayAmount: number | string, currency: string = 'USD'): number {
  const value = typeof displayAmount === 'string' ? parseFloat(displayAmount) : displayAmount
  if (Number.isNaN(value)) {
    return 0
  }
  return toSmallestUnit(value, currency)
}

/**
 * Convert smallest unit to display string (for form inputs).
 * Currency-aware: uses correct decimal places.
 *
 * @param smallestUnit - Amount in smallest unit
 * @param currency - ISO 4217 currency code
 * @returns String with correct decimal places (e.g., "19.99" for USD, "1000" for JPY)
 */
export function smallestUnitToDisplay(smallestUnit: number | null, currency: string = 'USD'): string {
  if (smallestUnit === null) return ''
  return toDisplayString(smallestUnit, currency)
}

/**
 * Get the number of decimal places for a currency.
 * Safe version that returns 2 for invalid currencies.
 */
export function getCurrencyDecimalPlaces(currency: string): number {
  return getExponentSafe(currency, 2)
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
 * Check if expense needs manual review (is in pending-review state)
 */
export function expenseNeedsReview(expense: Expense): expense is PendingReviewExpense {
  return isPendingReview(expense)
}

/**
 * Get display amount (prefer base currency conversion)
 */
export function getExpenseDisplayAmount(expense: Expense): number | null {
  return getDisplayAmount(expense)
}

/**
 * Get display date (prefer expense date, fallback to captured)
 */
export function getExpenseDisplayDate(expense: Expense): Date {
  return getDisplayDate(expense)
}
