import { Effect } from 'effect'
import { ExpenseRepo } from './repo'
import { type Expense } from './schema'
import { type CreateExpenseInput, type UpdateExpenseInput } from './dto'
import { CurrencyService } from '../currency'
import { SettingsService } from '../settings'
import { UserRepo } from '../users'
import { BucketClient } from '../../layers'
import { UserNotFoundError } from '../../errors'

// ============================================================================
// Service
// ============================================================================

export class ExpenseService extends Effect.Service<ExpenseService>()('ExpenseService', {
  effect: Effect.gen(function* () {
    const repo = yield* ExpenseRepo
    const userRepo = yield* UserRepo
    const currencyService = yield* CurrencyService
    const settingsService = yield* SettingsService
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

    // ========================================================================
    // Public API
    // ========================================================================

    return {
      /**
       * Create a new expense.
       * Used by both web app and iOS shortcuts.
       */
      create: (input: CreateExpenseInput) =>
        Effect.gen(function* () {
          // Normalize inputs
          const userName = input.userName.trim().toLowerCase()
          const currency = input.currency.trim().toUpperCase()
          const merchant = input.merchant.trim()
          const expenseDate = input.expenseDate ?? new Date()

          // Look up user by name (case-insensitive)
          const user = yield* userRepo.getByName(userName)
          if (!user) {
            return yield* Effect.fail(new UserNotFoundError({ userName }))
          }
          const userId = user.id

          // Validate currency by trying to get its exponent
          // This will throw if the currency code is invalid
          yield* currencyService.getExponent(currency)

          // Save the image
          const { key: imageKey } = yield* saveImage(input.image)

          // Get base currency and convert
          const baseCurrency = yield* settingsService.getBaseCurrency()
          const baseAmount = yield* currencyService.convert(input.amount, currency, baseCurrency)

          const now = new Date()
          const expense: Expense = {
            id: crypto.randomUUID(),
            userId,
            imageKey,
            amount: input.amount,
            currency,
            baseAmount,
            baseCurrency,
            merchant,
            description: null,
            categories: [],
            expenseDate,
            createdAt: now,
          }

          return yield* repo.save(expense)
        }),

      /**
       * Update an existing expense.
       */
      update: (input: UpdateExpenseInput) =>
        Effect.gen(function* () {
          const { id, ...data } = input

          const expense = yield* repo.getById(id)
          if (!expense) {
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

          const updated: Expense = {
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
    } as const
  }),
  dependencies: [ExpenseRepo.Default, UserRepo.Default, CurrencyService.Default, SettingsService.Default, BucketClient.Default],
  accessors: true,
}) {}
