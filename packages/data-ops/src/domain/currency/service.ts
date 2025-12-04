import { Effect } from "effect";

// Exchange rate cache with 24-hour TTL
interface CachedRates {
  rates: Record<string, number>;
  baseCurrency: string;
  fetchedAt: number;
}

// In-memory cache for exchange rates
let ratesCache: CachedRates | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const FETCH_TIMEOUT_MS = 5000; // 5 second timeout for API calls

/**
 * Fetches exchange rates from frankfurter.app API.
 * Returns rates relative to the specified base currency.
 * Has a 5-second timeout to prevent hanging.
 */
const fetchRatesFromAPI = (baseCurrency: string) =>
  Effect.gen(function* () {
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = yield* Effect.tryPromise({
        try: () =>
          fetch(`https://api.frankfurter.app/latest?from=${baseCurrency}`, {
            signal: controller.signal,
          }),
        catch: (error) =>
          new Error(
            `Failed to fetch exchange rates: ${error instanceof Error ? error.message : "Unknown error"}`
          ),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return yield* Effect.fail(
          new Error(`Exchange rate API returned ${response.status}`)
        );
      }

      const data = yield* Effect.tryPromise({
        try: () =>
          response.json() as Promise<{
            amount: number;
            base: string;
            date: string;
            rates: Record<string, number>;
          }>,
        catch: () => new Error("Failed to parse exchange rate response"),
      });

      return data.rates;
    } finally {
      clearTimeout(timeoutId);
    }
  });

/**
 * Gets exchange rates, using cache if available and not expired.
 */
const getRates = (baseCurrency: string) =>
  Effect.gen(function* () {
    const now = Date.now();

    // Check if we have valid cached rates for this base currency
    if (
      ratesCache &&
      ratesCache.baseCurrency === baseCurrency &&
      now - ratesCache.fetchedAt < CACHE_TTL_MS
    ) {
      return ratesCache.rates;
    }

    // Fetch fresh rates
    const rates = yield* fetchRatesFromAPI(baseCurrency).pipe(
      Effect.catchAll((error) => {
        // Log the error but return empty rates (will trigger 1:1 fallback)
        console.warn(
          `Currency API error: ${error instanceof Error ? error.message : "Unknown error"}`
        );
        return Effect.succeed<Record<string, number>>({});
      })
    );

    // Update cache
    ratesCache = {
      rates,
      baseCurrency,
      fetchedAt: now,
    };

    return rates;
  });

/**
 * Converts an amount from one currency to another.
 * Returns the original amount if conversion is not possible (same currency or missing rate).
 */
const convert = (
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Effect.Effect<number> =>
  Effect.gen(function* () {
    // Same currency - no conversion needed
    if (fromCurrency === toCurrency) {
      return amount;
    }

    // Get rates with toCurrency as base
    const rates = yield* getRates(toCurrency);

    // The rate from toCurrency to fromCurrency
    const rateFromBase = rates[fromCurrency];

    if (rateFromBase === undefined) {
      // Fallback: use 1:1 if rate is unavailable
      console.warn(
        `No exchange rate found for ${fromCurrency} to ${toCurrency}, using 1:1`
      );
      return amount;
    }

    // Convert: amount in fromCurrency / rate = amount in toCurrency
    // Since rates are "1 toCurrency = X fromCurrency", we divide
    return Math.round(amount / rateFromBase);
  });

/**
 * Gets the exchange rate between two currencies.
 * Returns 1 if the rate is unavailable.
 */
const getRate = (
  fromCurrency: string,
  toCurrency: string
): Effect.Effect<number> =>
  Effect.gen(function* () {
    if (fromCurrency === toCurrency) {
      return 1;
    }

    const rates = yield* getRates(toCurrency);
    const rate = rates[fromCurrency];

    if (rate === undefined) {
      console.warn(
        `No exchange rate found for ${fromCurrency} to ${toCurrency}, using 1:1`
      );
      return 1;
    }

    // Return the inverse rate (how many toCurrency per 1 fromCurrency)
    return 1 / rate;
  });

/**
 * CurrencyService provides currency conversion functionality.
 */
export class CurrencyService extends Effect.Service<CurrencyService>()(
  "CurrencyService",
  {
    effect: Effect.gen(function* () {
      return {
        /**
         * Convert an amount from one currency to another.
         * @param amount - The amount in smallest currency unit (cents)
         * @param fromCurrency - The source currency code (e.g., "USD")
         * @param toCurrency - The target currency code (e.g., "EUR")
         * @returns The converted amount in smallest currency unit
         */
        convert: (amount: number, fromCurrency: string, toCurrency: string) =>
          convert(amount, fromCurrency, toCurrency),

        /**
         * Get the exchange rate between two currencies.
         * @param fromCurrency - The source currency code
         * @param toCurrency - The target currency code
         * @returns The exchange rate (how many toCurrency per 1 fromCurrency)
         */
        getRate: (fromCurrency: string, toCurrency: string) =>
          getRate(fromCurrency, toCurrency),

        /**
         * Get all available exchange rates for a base currency.
         * @param baseCurrency - The base currency code
         * @returns Record of currency codes to exchange rates
         */
        getRates: (baseCurrency: string) => getRates(baseCurrency),

        /**
         * Clear the exchange rate cache (useful for testing or forcing refresh).
         */
        clearCache: Effect.sync(() => {
          ratesCache = null;
        }),
      } as const;
    }),
    accessors: true,
  }
) {}
