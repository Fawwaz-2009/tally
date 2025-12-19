import { Effect, Option } from 'effect'
import { ExpenseRepo } from './repo'
import { type Expense, type PendingReviewExpense, type ConfirmedExpense, type ExtractionMetadata } from './schema'
import { canConfirm, getMissingFields, isPendingReview, isConfirmed } from './utils'
import { type CaptureExpenseInput, type CaptureExpenseResult, type ConfirmExpenseInput, type UpdateExpenseInput, type CreateDirectExpenseInput } from './dto'
import { CurrencyService } from '../currency'
import { SettingsService } from '../settings'
import { ExtractionService, type ExtractionResult } from '../extraction'
import { BucketClient } from '../../layers'
import { ExpenseNotFoundError, ExpenseAlreadyConfirmedError, ExpenseNotPendingReviewError, MissingRequiredFieldsError } from '../../errors'

// ============================================================================
// Service
// ============================================================================

export class ExpenseService extends Effect.Service<ExpenseService>()('ExpenseService', {
  effect: Effect.gen(function* () {
    const repo = yield* ExpenseRepo
    const currencyService = yield* CurrencyService
    const settingsService = yield* SettingsService
    const extractionService = yield* ExtractionService
    const bucket = yield* BucketClient

    // ========================================================================
    // Internal Helpers
    // ========================================================================

    const saveImage = (image: File) =>
      Effect.gen(function* () {
        const arrayBuffer = yield* Effect.promise(() => image.arrayBuffer())
        const buffer = Buffer.from(arrayBuffer)
        const fileName = image.name || 'upload.png'
        const contentType = image.type || 'image/png'
        const key = `expenses/${Date.now()}-${fileName}`

        yield* bucket.put(key, buffer, { httpMetadata: { contentType } })

        return { key, buffer }
      })

    const buildPendingReview = (userId: string, imageKey: string, extractionOption: Option.Option<ExtractionResult>): PendingReviewExpense => {
      const now = new Date()

      if (Option.isNone(extractionOption)) {
        // Extraction failed - create expense with null fields
        return {
          state: 'pending-review',
          id: crypto.randomUUID(),
          userId,
          imageKey,
          capturedAt: now,
          createdAt: now,
          amount: null,
          currency: null,
          merchant: null,
          description: null,
          categories: [],
          expenseDate: null,
          extractionMetadata: null,
        }
      }

      const extraction = extractionOption.value
      const extractionMetadata: ExtractionMetadata = {
        ocrText: extraction.ocrText,
        error: extraction.error,
        timing: { ocrMs: extraction.timing.ocrMs, llmMs: extraction.timing.llmMs },
      }

      return {
        state: 'pending-review',
        id: crypto.randomUUID(),
        userId,
        imageKey,
        capturedAt: now,
        createdAt: now,
        amount: extraction.data?.amount ?? null,
        currency: extraction.data?.currency ?? null,
        merchant: extraction.data?.merchant ?? null,
        description: null,
        categories: extraction.data?.category ?? [],
        expenseDate: extraction.data?.date ? new Date(extraction.data.date) : null,
        extractionMetadata,
      }
    }

    const tryAutoConfirm = (pendingReview: PendingReviewExpense) =>
      Effect.gen(function* () {
        if (!canConfirm(pendingReview)) {
          yield* repo.save(pendingReview)
          return { expense: pendingReview, needsReview: true }
        }

        const baseCurrency = yield* settingsService.getBaseCurrency()
        const baseAmount = yield* currencyService.convert(pendingReview.amount!, pendingReview.currency!, baseCurrency)

        const confirmed: ConfirmedExpense = {
          state: 'confirmed',
          id: pendingReview.id,
          userId: pendingReview.userId,
          imageKey: pendingReview.imageKey,
          capturedAt: pendingReview.capturedAt,
          createdAt: pendingReview.createdAt,
          confirmedAt: new Date(),
          amount: pendingReview.amount!,
          currency: pendingReview.currency!,
          baseAmount,
          baseCurrency,
          merchant: pendingReview.merchant!,
          description: pendingReview.description,
          categories: pendingReview.categories,
          expenseDate: pendingReview.expenseDate!,
          extractionMetadata: pendingReview.extractionMetadata,
        }

        yield* repo.save(confirmed)
        return { expense: confirmed, needsReview: false }
      })

    const buildExtractionResponse = (extractionOption: Option.Option<ExtractionResult>): CaptureExpenseResult['extraction'] => {
      if (Option.isNone(extractionOption)) {
        return {
          success: false,
          data: null,
          error: 'Extraction failed',
          timing: null,
        }
      }

      const extraction = extractionOption.value
      return {
        success: extraction.success,
        data: extraction.data
          ? {
              amount: extraction.data.amount ?? null,
              currency: extraction.data.currency ?? null,
              merchant: extraction.data.merchant ?? null,
              date: extraction.data.date ?? null,
              categories: extraction.data.category ?? [],
            }
          : null,
        error: extraction.error ?? null,
        timing: { ocrMs: extraction.timing.ocrMs, llmMs: extraction.timing.llmMs },
      }
    }

    // ========================================================================
    // Public API
    // ========================================================================

    return {
      /**
       * Capture a receipt and process it through the extraction pipeline.
       */
      capture: (input: CaptureExpenseInput) =>
        Effect.gen(function* () {
          const { key: imageKey, buffer: imageBuffer } = yield* saveImage(input.image)
          const extraction = yield* Effect.option(extractionService.extractFromImage(imageBuffer))
          const pendingReview = buildPendingReview(input.userId, imageKey, extraction)
          const { expense, needsReview } = yield* tryAutoConfirm(pendingReview)

          return {
            expense,
            extraction: buildExtractionResponse(extraction),
            needsReview,
          } satisfies CaptureExpenseResult
        }),

      /**
       * Confirm a pending-review expense by validating required fields and
       * transitioning to confirmed state.
       */
      confirm: (input: ConfirmExpenseInput) =>
        Effect.gen(function* () {
          const { id, ...overrides } = input

          const expense = yield* repo.getById(id)
          if (!expense) {
            return yield* Effect.fail(new ExpenseNotFoundError({ id }))
          }

          if (!isPendingReview(expense)) {
            if (expense.state === 'confirmed') {
              return yield* Effect.fail(new ExpenseAlreadyConfirmedError({ id }))
            }
            return yield* Effect.fail(new ExpenseNotPendingReviewError({ id, currentState: expense.state }))
          }

          // Merge overrides with existing data
          const merged: PendingReviewExpense = {
            ...expense,
            amount: overrides.amount ?? expense.amount,
            currency: overrides.currency ?? expense.currency,
            merchant: overrides.merchant ?? expense.merchant,
            description: overrides.description ?? expense.description,
            categories: overrides.categories ?? expense.categories,
            expenseDate: overrides.expenseDate ?? expense.expenseDate,
          }

          // Validate required fields
          const missingFields = getMissingFields(merged)
          if (missingFields.length > 0) {
            return yield* Effect.fail(new MissingRequiredFieldsError({ id, missingFields }))
          }

          // Compute base currency conversion
          const baseCurrency = yield* settingsService.getBaseCurrency()
          const baseAmount = yield* currencyService.convert(merged.amount!, merged.currency!, baseCurrency)

          const confirmed: ConfirmedExpense = {
            state: 'confirmed',
            id: merged.id,
            userId: merged.userId,
            imageKey: merged.imageKey,
            capturedAt: merged.capturedAt,
            createdAt: merged.createdAt,
            confirmedAt: new Date(),
            amount: merged.amount!,
            currency: merged.currency!,
            baseAmount,
            baseCurrency,
            merchant: merged.merchant!,
            description: merged.description,
            categories: merged.categories,
            expenseDate: merged.expenseDate!,
            extractionMetadata: merged.extractionMetadata,
          }

          return yield* repo.save(confirmed)
        }),

      /**
       * Update a confirmed expense's data.
       */
      update: (input: UpdateExpenseInput) =>
        Effect.gen(function* () {
          const { id, ...data } = input

          const expense = yield* repo.getById(id)
          if (!expense || !isConfirmed(expense)) {
            return null
          }

          // Check if amount or currency changed - need to recalculate baseAmount
          const amountChanged = data.amount !== undefined && data.amount !== expense.amount
          const currencyChanged = data.currency !== undefined && data.currency !== expense.currency

          const newAmount = data.amount ?? expense.amount
          const newCurrency = data.currency ?? expense.currency

          let baseAmount = expense.baseAmount
          let baseCurrency = expense.baseCurrency

          if (amountChanged || currencyChanged) {
            baseCurrency = yield* settingsService.getBaseCurrency()
            baseAmount = yield* currencyService.convert(newAmount, newCurrency, baseCurrency)
          }

          const updated: ConfirmedExpense = {
            ...expense,
            amount: newAmount,
            currency: newCurrency,
            merchant: data.merchant ?? expense.merchant,
            description: data.description !== undefined ? data.description : expense.description,
            categories: data.categories ? [...data.categories] : expense.categories,
            expenseDate: data.expenseDate ?? expense.expenseDate,
            baseAmount,
            baseCurrency,
          }

          return yield* repo.save(updated)
        }),

      /**
       * Get missing fields for an expense
       */
      getMissingFields: (expense: Expense): string[] => {
        if (isPendingReview(expense)) {
          return getMissingFields(expense)
        }
        return []
      },

      /**
       * Check if the extraction service (Ollama) is available
       */
      checkExtractionHealth: () => extractionService.checkOllamaHealth(),

      /**
       * Create a confirmed expense directly, bypassing the extraction pipeline.
       * Used for iOS shortcuts and other external integrations.
       */
      createDirect: (input: CreateDirectExpenseInput) =>
        Effect.gen(function* () {
          // Normalize inputs
          const userId = input.userName.trim().toLowerCase()
          const currency = input.currency.trim().toUpperCase()
          const merchant = input.merchant.trim()
          const expenseDate = input.expenseDate ?? new Date()

          // Validate currency by trying to get its exponent
          // This will throw if the currency code is invalid
          yield* currencyService.getExponent(currency)

          // Save the image
          const { key: imageKey } = yield* saveImage(input.image)

          // Get base currency and convert
          const baseCurrency = yield* settingsService.getBaseCurrency()
          const baseAmount = yield* currencyService.convert(input.amount, currency, baseCurrency)

          const now = new Date()
          const confirmed: ConfirmedExpense = {
            state: 'confirmed',
            id: crypto.randomUUID(),
            userId,
            imageKey,
            capturedAt: now,
            createdAt: now,
            confirmedAt: now,
            amount: input.amount,
            currency,
            baseAmount,
            baseCurrency,
            merchant,
            description: null,
            categories: [],
            expenseDate,
            extractionMetadata: null,
          }

          return yield* repo.save(confirmed)
        }),
    } as const
  }),
  dependencies: [ExpenseRepo.Default, CurrencyService.Default, SettingsService.Default, BucketClient.Default],
  accessors: true,
}) {}
