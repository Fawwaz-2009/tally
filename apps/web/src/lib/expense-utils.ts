import cc from 'currency-codes'

/**
 * Format amount from cents to a localized currency string
 */
export function formatAmount(
  amountInCents: number | null,
  currency: string | null = 'USD',
): string {
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
