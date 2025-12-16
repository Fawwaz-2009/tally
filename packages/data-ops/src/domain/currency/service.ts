import { Effect } from 'effect'
import { convert as moneyConvert, getExponent } from '@repo/isomorphic/money'

// ============================================================================
// Types
// ============================================================================

/**
 * Error thrown when currency conversion fails
 */
export class CurrencyConversionError extends Error {
  readonly _tag = 'CurrencyConversionError'

  constructor(
    public readonly fromCurrency: string,
    public readonly toCurrency: string,
    public readonly reason: string,
  ) {
    super(`Failed to convert ${fromCurrency} to ${toCurrency}: ${reason}`)
    this.name = 'CurrencyConversionError'
  }
}

// ============================================================================
// Exchange Rate Cache
// ============================================================================

interface CachedRates {
  rates: Record<string, number>
  baseCurrency: string
  fetchedAt: number
}

// In-memory cache for exchange rates
let ratesCache: CachedRates | null = null
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours (reduced from 24)
const FETCH_TIMEOUT_MS = 5000 // 5 second timeout for API calls

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetches exchange rates from frankfurter.app API.
 * Returns rates relative to the specified base currency.
 * Has a 5-second timeout to prevent hanging.
 */
const fetchRatesFromAPI = (baseCurrency: string) =>
  Effect.gen(function* () {
    // Create an AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    try {
      const response = yield* Effect.tryPromise({
        try: () =>
          fetch(`https://api.frankfurter.app/latest?from=${baseCurrency}`, {
            signal: controller.signal,
          }),
        catch: (error) => new CurrencyConversionError(baseCurrency, '*', `API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`),
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        return yield* Effect.fail(new CurrencyConversionError(baseCurrency, '*', `API returned status ${response.status}`))
      }

      const data = yield* Effect.tryPromise({
        try: () =>
          response.json() as Promise<{
            amount: number
            base: string
            date: string
            rates: Record<string, number>
          }>,
        catch: () => new CurrencyConversionError(baseCurrency, '*', 'Failed to parse API response'),
      })

      return data.rates
    } finally {
      clearTimeout(timeoutId)
    }
  })

/**
 * Gets exchange rates, using cache if available and not expired.
 * Returns Effect.fail if rates cannot be fetched.
 */
const getRates = (baseCurrency: string) =>
  Effect.gen(function* () {
    const now = Date.now()

    // Check if we have valid cached rates for this base currency
    if (ratesCache && ratesCache.baseCurrency === baseCurrency && now - ratesCache.fetchedAt < CACHE_TTL_MS) {
      return ratesCache.rates
    }

    // Fetch fresh rates - propagate errors instead of silently falling back
    const rates = yield* fetchRatesFromAPI(baseCurrency)

    // Update cache
    ratesCache = {
      rates,
      baseCurrency,
      fetchedAt: now,
    }

    return rates
  })

// ============================================================================
// Conversion Functions
// ============================================================================

/**
 * Converts an amount from one currency to another.
 * Uses proper decimal handling via the money utility.
 *
 * @param amount - Amount in smallest unit (cents, yen, etc.)
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @returns Effect with converted amount or CurrencyConversionError
 */
const convert = (amount: number, fromCurrency: string, toCurrency: string): Effect.Effect<number, CurrencyConversionError> =>
  Effect.gen(function* () {
    // Same currency - no conversion needed
    if (fromCurrency === toCurrency) {
      return amount
    }

    // Get rates with toCurrency as base
    const rates = yield* getRates(toCurrency)

    // The rate from toCurrency to fromCurrency
    const rateFromBase = rates[fromCurrency]

    if (rateFromBase === undefined) {
      return yield* Effect.fail(new CurrencyConversionError(fromCurrency, toCurrency, `No exchange rate available for ${fromCurrency}`))
    }

    // Calculate the rate: how many toCurrency per 1 fromCurrency
    // Since rates are "1 toCurrency = X fromCurrency", we need 1/X
    const rate = 1 / rateFromBase

    // Use the money utility for precise conversion
    return moneyConvert(amount, fromCurrency, toCurrency, rate)
  })

/**
 * Converts an amount with a fallback to 1:1 if conversion fails.
 * Use this when you need a best-effort conversion that won't fail.
 * Logs a warning when falling back.
 */
const convertWithFallback = (amount: number, fromCurrency: string, toCurrency: string): Effect.Effect<number> =>
  convert(amount, fromCurrency, toCurrency).pipe(
    Effect.catchAll((error) => {
      console.warn(`Currency conversion failed, using 1:1 fallback: ${error.message}`)
      // For 1:1 fallback, we still need to handle different decimal places
      // Convert the amount as if rate were 1:1
      return Effect.succeed(moneyConvert(amount, fromCurrency, toCurrency, 1))
    }),
  )

/**
 * Gets the exchange rate between two currencies.
 * Returns Effect.fail if rate is unavailable.
 */
const getRate = (fromCurrency: string, toCurrency: string): Effect.Effect<number, CurrencyConversionError> =>
  Effect.gen(function* () {
    if (fromCurrency === toCurrency) {
      return 1
    }

    const rates = yield* getRates(toCurrency)
    const rate = rates[fromCurrency]

    if (rate === undefined) {
      return yield* Effect.fail(new CurrencyConversionError(fromCurrency, toCurrency, `No exchange rate available for ${fromCurrency}`))
    }

    // Return the inverse rate (how many toCurrency per 1 fromCurrency)
    return 1 / rate
  })

// ============================================================================
// Service Definition
// ============================================================================

/**
 * CurrencyService provides currency conversion functionality.
 */
export class CurrencyService extends Effect.Service<CurrencyService>()('CurrencyService', {
  effect: Effect.gen(function* () {
    return {
      /**
       * Convert an amount from one currency to another.
       * Returns Effect.fail with CurrencyConversionError if conversion fails.
       *
       * @param amount - The amount in smallest currency unit (cents, yen, etc.)
       * @param fromCurrency - The source currency code (e.g., "USD")
       * @param toCurrency - The target currency code (e.g., "EUR")
       * @returns The converted amount in smallest currency unit
       */
      convert: (amount: number, fromCurrency: string, toCurrency: string) => convert(amount, fromCurrency, toCurrency),

      /**
       * Convert an amount with 1:1 fallback if conversion fails.
       * Use when you need best-effort conversion that won't fail.
       * Logs a warning when falling back.
       */
      convertWithFallback: (amount: number, fromCurrency: string, toCurrency: string) => convertWithFallback(amount, fromCurrency, toCurrency),

      /**
       * Get the exchange rate between two currencies.
       * Returns Effect.fail with CurrencyConversionError if rate unavailable.
       *
       * @param fromCurrency - The source currency code
       * @param toCurrency - The target currency code
       * @returns The exchange rate (how many toCurrency per 1 fromCurrency)
       */
      getRate: (fromCurrency: string, toCurrency: string) => getRate(fromCurrency, toCurrency),

      /**
       * Get all available exchange rates for a base currency.
       * Returns Effect.fail with CurrencyConversionError if fetch fails.
       *
       * @param baseCurrency - The base currency code
       * @returns Record of currency codes to exchange rates
       */
      getRates: (baseCurrency: string) => getRates(baseCurrency),

      /**
       * Get the number of decimal places for a currency.
       *
       * @param currency - ISO 4217 currency code
       * @returns Number of decimal places (e.g., 2 for USD, 0 for JPY)
       */
      getExponent: (currency: string) => Effect.succeed(getExponent(currency)),

      /**
       * Clear the exchange rate cache (useful for testing or forcing refresh).
       */
      clearCache: Effect.sync(() => {
        ratesCache = null
      }),
    } as const
  }),
  accessors: true,
}) {}
