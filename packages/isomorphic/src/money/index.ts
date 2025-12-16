/**
 * Currency and Money Utilities
 *
 * This module provides safe, currency-aware operations for monetary values.
 * All amounts are stored and manipulated in the smallest unit (cents, yen, fils, etc.)
 * to avoid floating-point precision issues.
 *
 * Key features:
 * - Currency-aware decimal handling (USD=2, JPY=0, KWD=3)
 * - Safe arithmetic with Decimal.js for precision
 * - Proper allocation that preserves totals (no lost cents)
 * - Formatting via Intl.NumberFormat
 *
 * This module is isomorphic - it works in both browser and Node.js environments.
 */

import DecimalJS from 'decimal.js'
import cc from 'currency-codes'

// For ESM compatibility, Decimal.js exports the class as default.default
const Decimal = DecimalJS.default ?? DecimalJS
type Decimal = InstanceType<typeof Decimal>

// Configure Decimal.js for financial calculations
Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
})

// ============================================================================
// Types
// ============================================================================

/**
 * Represents a monetary value with its currency.
 * Amount is always in the smallest unit (cents, yen, etc.)
 */
export interface Money {
  amount: number
  currency: string
}

/**
 * Currency option for select/picker components
 */
export interface CurrencyOption {
  value: string
  label: string
  name: string
  digits: number
}

/**
 * Error thrown when an invalid currency code is used
 */
export class InvalidCurrencyError extends Error {
  constructor(code: string) {
    super(`Invalid ISO 4217 currency code: ${code}`)
    this.name = 'InvalidCurrencyError'
  }
}

// ============================================================================
// Currency Metadata
// ============================================================================

/**
 * Get the number of decimal places (exponent) for a currency.
 * USD = 2 (cents), JPY = 0 (no subunit), KWD = 3 (fils)
 *
 * @param currency - ISO 4217 currency code
 * @returns Number of decimal places
 * @throws InvalidCurrencyError if currency code is invalid
 */
export function getExponent(currency: string): number {
  const data = cc.code(currency)
  if (!data) {
    throw new InvalidCurrencyError(currency)
  }
  return data.digits
}

/**
 * Get the exponent for a currency, returning a default if invalid.
 * Use this when you need a graceful fallback.
 *
 * @param currency - ISO 4217 currency code
 * @param defaultExponent - Default to use if currency is invalid (default: 2)
 */
export function getExponentSafe(currency: string, defaultExponent: number = 2): number {
  const data = cc.code(currency)
  return data?.digits ?? defaultExponent
}

/**
 * Validate that a string is a valid ISO 4217 currency code.
 *
 * @param code - Currency code to validate
 * @returns true if valid, false otherwise
 */
export function isValidCurrency(code: string): boolean {
  return cc.code(code) !== undefined
}

/**
 * Get currency metadata (name, countries, etc.)
 *
 * @param code - ISO 4217 currency code
 * @returns Currency metadata or undefined if invalid
 */
export function getCurrencyInfo(code: string) {
  return cc.code(code)
}

/**
 * Get all available currency codes.
 *
 * @returns Array of ISO 4217 currency codes
 */
export function getCurrencyCodes(): string[] {
  return cc.codes()
}

/**
 * Get all currency options for select/picker components.
 *
 * @returns Array of currency options with code, label, name, and digits
 */
export function getCurrencyOptions(): CurrencyOption[] {
  return cc.codes().map((code) => {
    const info = cc.code(code)
    return {
      value: code,
      label: `${code} - ${info?.currency ?? code}`,
      name: info?.currency ?? code,
      digits: info?.digits ?? 2,
    }
  })
}

// ============================================================================
// Conversion Between Representations
// ============================================================================

/**
 * Convert a display amount to the smallest unit for storage.
 * Example: 19.99 USD → 1999 cents
 *
 * @param displayAmount - Amount as displayed to user (e.g., 19.99)
 * @param currency - ISO 4217 currency code
 * @returns Amount in smallest unit (e.g., 1999)
 */
export function toSmallestUnit(displayAmount: number | string, currency: string): number {
  const exponent = getExponent(currency)
  const multiplier = new Decimal(10).pow(exponent)
  return new Decimal(displayAmount).times(multiplier).round().toNumber()
}

/**
 * Convert smallest unit to display amount.
 * Example: 1999 cents USD → 19.99
 *
 * @param smallestUnit - Amount in smallest unit (e.g., 1999)
 * @param currency - ISO 4217 currency code
 * @returns Amount as decimal number (e.g., 19.99)
 */
export function toDisplayAmount(smallestUnit: number, currency: string): number {
  const exponent = getExponent(currency)
  const divisor = new Decimal(10).pow(exponent)
  return new Decimal(smallestUnit).dividedBy(divisor).toNumber()
}

/**
 * Convert smallest unit to display string with correct decimal places.
 * Example: 1999 cents USD → "19.99"
 *
 * @param smallestUnit - Amount in smallest unit
 * @param currency - ISO 4217 currency code
 * @returns Formatted decimal string
 */
export function toDisplayString(smallestUnit: number, currency: string): string {
  const exponent = getExponent(currency)
  const divisor = new Decimal(10).pow(exponent)
  return new Decimal(smallestUnit).dividedBy(divisor).toFixed(exponent)
}

// ============================================================================
// Formatting
// ============================================================================

/**
 * Format an amount in smallest units to a localized currency string.
 * Example: 1999, "USD" → "$19.99"
 *
 * @param smallestUnit - Amount in smallest unit
 * @param currency - ISO 4217 currency code
 * @param locale - Locale for formatting (default: "en-US")
 * @returns Formatted currency string
 */
export function format(smallestUnit: number, currency: string, locale: string = 'en-US'): string {
  const displayAmount = toDisplayAmount(smallestUnit, currency)
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(displayAmount)
  } catch {
    // Fallback for invalid currency codes
    const exponent = getExponentSafe(currency)
    return `${currency} ${displayAmount.toFixed(exponent)}`
  }
}

/**
 * Format with explicit symbol placement control.
 * Useful when you need just the number with symbol.
 *
 * @param smallestUnit - Amount in smallest unit
 * @param currency - ISO 4217 currency code
 * @returns Object with symbol, formatted number, and full string
 */
export function formatParts(smallestUnit: number, currency: string, locale: string = 'en-US'): { symbol: string; value: string; full: string } {
  const displayAmount = toDisplayAmount(smallestUnit, currency)
  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    })
    const parts = formatter.formatToParts(displayAmount)
    const symbol = parts.find((p) => p.type === 'currency')?.value ?? currency
    const value = parts
      .filter((p) => p.type !== 'currency' && p.type !== 'literal')
      .map((p) => p.value)
      .join('')
    return {
      symbol,
      value: value.trim(),
      full: formatter.format(displayAmount),
    }
  } catch {
    const exponent = getExponentSafe(currency)
    const value = displayAmount.toFixed(exponent)
    return {
      symbol: currency,
      value,
      full: `${currency} ${value}`,
    }
  }
}

// ============================================================================
// Arithmetic Operations (all in smallest units)
// ============================================================================

/**
 * Sum an array of amounts.
 * Example: sum([100, 200, 300]) → 600
 *
 * @param amounts - Array of amounts in smallest units
 * @returns Total sum
 */
export function sum(amounts: number[]): number {
  if (amounts.length === 0) return 0
  return amounts
    .reduce((acc, val) => acc.plus(val), new Decimal(0))
    .round()
    .toNumber()
}

/**
 * Calculate average of amounts with proper rounding.
 *
 * @param amounts - Array of amounts in smallest units
 * @returns Average (rounded to nearest smallest unit)
 */
export function average(amounts: number[]): number {
  if (amounts.length === 0) return 0
  const total = amounts.reduce((acc, val) => acc.plus(val), new Decimal(0))
  return total.dividedBy(amounts.length).round().toNumber()
}

/**
 * Find the maximum amount.
 *
 * @param amounts - Array of amounts
 * @returns Maximum value, or 0 if empty
 */
export function max(amounts: number[]): number {
  if (amounts.length === 0) return 0
  return Math.max(...amounts)
}

/**
 * Find the minimum amount.
 *
 * @param amounts - Array of amounts
 * @returns Minimum value, or 0 if empty
 */
export function min(amounts: number[]): number {
  if (amounts.length === 0) return 0
  return Math.min(...amounts)
}

/**
 * Multiply an amount by a factor.
 * Useful for quantities or scaling.
 *
 * @param amount - Amount in smallest units
 * @param factor - Multiplier
 * @returns Result rounded to nearest smallest unit
 */
export function multiply(amount: number, factor: number): number {
  return new Decimal(amount).times(factor).round().toNumber()
}

/**
 * Divide an amount by a divisor.
 *
 * @param amount - Amount in smallest units
 * @param divisor - Divisor (must be non-zero)
 * @returns Result rounded to nearest smallest unit
 * @throws Error if divisor is zero
 */
export function divide(amount: number, divisor: number): number {
  if (divisor === 0) {
    throw new Error('Cannot divide by zero')
  }
  return new Decimal(amount).dividedBy(divisor).round().toNumber()
}

/**
 * Subtract amounts from a base amount.
 *
 * @param minuend - Base amount
 * @param subtrahends - Amounts to subtract
 * @returns Result
 */
export function subtract(minuend: number, ...subtrahends: number[]): number {
  return subtrahends
    .reduce((acc, val) => acc.minus(val), new Decimal(minuend))
    .round()
    .toNumber()
}

// ============================================================================
// Allocation (the tricky one - preserves totals)
// ============================================================================

/**
 * Split an amount evenly among N parts, distributing remainders.
 * This ensures no money is lost to rounding.
 *
 * Example: allocateEvenly(1000, 3) → [334, 333, 333] (sums to 1000)
 * NOT [333, 333, 333] which loses 1 cent!
 *
 * @param amount - Total amount in smallest units
 * @param parts - Number of parts to split into
 * @returns Array of amounts that sum exactly to the original
 */
export function allocateEvenly(amount: number, parts: number): number[] {
  if (parts <= 0) {
    throw new Error('Parts must be a positive integer')
  }
  if (parts === 1) {
    return [amount]
  }

  const base = Math.floor(amount / parts)
  const remainder = amount - base * parts

  // Distribute remainder across first N allocations
  return Array.from({ length: parts }, (_, i) => (i < remainder ? base + 1 : base))
}

/**
 * Split an amount by weights/ratios.
 * Last allocation absorbs rounding to ensure exact total.
 *
 * Example: allocate(1000, [1, 1, 2]) → [250, 250, 500]
 * Example: allocate(1000, [1, 2]) → [333, 667]
 *
 * @param amount - Total amount in smallest units
 * @param weights - Array of relative weights
 * @returns Array of amounts that sum exactly to the original
 */
export function allocate(amount: number, weights: number[]): number[] {
  if (weights.length === 0) {
    return []
  }
  if (weights.length === 1) {
    return [amount]
  }

  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  if (totalWeight === 0) {
    throw new Error('Weights must sum to a positive number')
  }

  const results: number[] = []
  let remaining = amount

  for (let i = 0; i < weights.length; i++) {
    if (i === weights.length - 1) {
      // Last allocation gets remainder to preserve total
      results.push(remaining)
    } else {
      const weight = weights[i]! // Safe: loop bounds guarantee this exists
      const share = new Decimal(amount).times(weight).dividedBy(totalWeight).round().toNumber()
      results.push(share)
      remaining -= share
    }
  }

  return results
}

// ============================================================================
// Percentage Calculations
// ============================================================================

/**
 * Calculate what percentage an amount is of a total.
 *
 * @param amount - The part amount
 * @param total - The total amount
 * @param decimalPlaces - Decimal places for result (default: 2)
 * @returns Percentage (e.g., 25.50 for 25.5%)
 */
export function percentage(amount: number, total: number, decimalPlaces: number = 2): number {
  if (total === 0) return 0
  return new Decimal(amount).dividedBy(total).times(100).toDecimalPlaces(decimalPlaces).toNumber()
}

/**
 * Calculate percentage and round to integer.
 * Useful for charts and progress bars.
 *
 * @param amount - The part amount
 * @param total - The total amount
 * @returns Integer percentage (0-100)
 */
export function percentageInt(amount: number, total: number): number {
  if (total === 0) return 0
  return new Decimal(amount).dividedBy(total).times(100).round().toNumber()
}

/**
 * Calculate percentage of an amount.
 * Example: percentageOf(1000, 15) → 150 (15% of 1000)
 *
 * @param amount - Base amount
 * @param percent - Percentage to calculate
 * @returns Calculated amount (rounded to smallest unit)
 */
export function percentageOf(amount: number, percent: number): number {
  return new Decimal(amount).times(percent).dividedBy(100).round().toNumber()
}

// ============================================================================
// Currency Conversion
// ============================================================================

/**
 * Convert an amount between currencies using an exchange rate.
 * Handles different decimal places correctly.
 *
 * @param amount - Amount in smallest unit of source currency
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @param rate - Exchange rate (how many toCurrency per 1 fromCurrency)
 * @returns Amount in smallest unit of target currency
 *
 * @example
 * // Convert 1000 JPY to USD at rate 0.0067
 * convert(1000, "JPY", "USD", 0.0067) // → 670 cents ($6.70)
 */
export function convert(amount: number, fromCurrency: string, toCurrency: string, rate: number): number {
  if (fromCurrency === toCurrency) {
    return amount
  }

  const fromExponent = getExponent(fromCurrency)
  const toExponent = getExponent(toCurrency)

  // Convert to display amount (e.g., dollars from cents)
  const fromDivisor = new Decimal(10).pow(fromExponent)
  const displayAmount = new Decimal(amount).dividedBy(fromDivisor)

  // Apply exchange rate
  const convertedDisplay = displayAmount.times(rate)

  // Convert to smallest unit of target currency
  const toMultiplier = new Decimal(10).pow(toExponent)
  return convertedDisplay.times(toMultiplier).round().toNumber()
}

// ============================================================================
// Analytical Helpers (for charts and reports)
// ============================================================================

/**
 * Group amounts by a key and sum them.
 * Useful for category breakdowns, monthly totals, etc.
 *
 * @param items - Array of items to group
 * @param getKey - Function to extract grouping key
 * @param getAmount - Function to extract amount
 * @returns Map of key to summed amount
 */
export function groupAndSum<T>(items: T[], getKey: (item: T) => string, getAmount: (item: T) => number): Map<string, number> {
  const groups = new Map<string, number[]>()

  for (const item of items) {
    const key = getKey(item)
    const amount = getAmount(item)
    const existing = groups.get(key) ?? []
    existing.push(amount)
    groups.set(key, existing)
  }

  const result = new Map<string, number>()
  for (const [key, amounts] of groups) {
    result.set(key, sum(amounts))
  }

  return result
}

/**
 * Group amounts by a key and calculate average.
 *
 * @param items - Array of items to group
 * @param getKey - Function to extract grouping key
 * @param getAmount - Function to extract amount
 * @returns Map of key to average amount
 */
export function groupAndAverage<T>(items: T[], getKey: (item: T) => string, getAmount: (item: T) => number): Map<string, number> {
  const groups = new Map<string, number[]>()

  for (const item of items) {
    const key = getKey(item)
    const amount = getAmount(item)
    const existing = groups.get(key) ?? []
    existing.push(amount)
    groups.set(key, existing)
  }

  const result = new Map<string, number>()
  for (const [key, amounts] of groups) {
    result.set(key, average(amounts))
  }

  return result
}

/**
 * Calculate change between two values.
 *
 * @param current - Current value
 * @param previous - Previous value
 * @returns Object with absolute change and percentage change
 */
export function change(current: number, previous: number): { absolute: number; percentage: number } {
  const absolute = current - previous
  const pct = previous === 0 ? (current > 0 ? 100 : 0) : percentage(absolute, previous)
  return { absolute, percentage: pct }
}

/**
 * Format a month key for grouping (YYYY-MM format).
 *
 * @param date - Date to format
 * @returns String in YYYY-MM format
 */
export function toMonthKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/**
 * Parse a month key back to a Date (first of the month).
 *
 * @param monthKey - String in YYYY-MM format
 * @returns Date object for the first of that month
 */
export function fromMonthKey(monthKey: string): Date {
  const parts = monthKey.split('-').map(Number)
  const year = parts[0]
  const month = parts[1]

  if (year === undefined || month === undefined || Number.isNaN(year) || Number.isNaN(month)) {
    throw new Error(`Invalid month key format: "${monthKey}". Expected "YYYY-MM"`)
  }

  return new Date(year, month - 1, 1)
}

// ============================================================================
// Comparison Helpers
// ============================================================================

/**
 * Check if two amounts are equal.
 * Handles floating point comparison safely.
 */
export function equals(a: number, b: number): boolean {
  return new Decimal(a).equals(b)
}

/**
 * Check if amount a is greater than amount b.
 */
export function greaterThan(a: number, b: number): boolean {
  return new Decimal(a).greaterThan(b)
}

/**
 * Check if amount a is less than amount b.
 */
export function lessThan(a: number, b: number): boolean {
  return new Decimal(a).lessThan(b)
}

/**
 * Check if an amount is zero.
 */
export function isZero(amount: number): boolean {
  return new Decimal(amount).isZero()
}

/**
 * Check if an amount is positive (greater than zero).
 */
export function isPositive(amount: number): boolean {
  return new Decimal(amount).isPositive() && !new Decimal(amount).isZero()
}

/**
 * Check if an amount is negative.
 */
export function isNegative(amount: number): boolean {
  return new Decimal(amount).isNegative()
}
