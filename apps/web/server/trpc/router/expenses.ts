import { Effect, Schema } from 'effect'
import { zfd } from 'zod-form-data'

import { frontendRuntime } from '@repo/data-ops/runtimes'
import { ExpenseRepo, ExpenseService, MerchantRepo, UpdateExpensePayload, UserRepo } from '@repo/data-ops/domain'
import { toSmallestUnit } from '@repo/isomorphic/money'
import { publicProcedure } from '../init'
import type { TRPCRouterRecord } from '@trpc/server'

// FormData schema for creating expense
const createFormDataSchema = zfd.formData({
  image: zfd.file(),
  userName: zfd.text(),
  merchantName: zfd.text(),
  currency: zfd.text(),
  amount: zfd.numeric(), // Display amount (e.g., 300 for 300 SAR)
  expenseDate: zfd.text().optional(), // ISO date string, optional
})

export const expensesRouter = {
  // ==========================================================================
  // Queries
  // ==========================================================================

  /**
   * List all expenses with merchant info (ordered by expense date, most recent first).
   */
  list: publicProcedure.query(async () => {
    return frontendRuntime.runPromise(ExpenseRepo.getAllWithMerchants())
  }),

  /**
   * Get expense by ID with merchant info.
   */
  getById: publicProcedure.input(Schema.decodeUnknownSync(Schema.Struct({ id: Schema.String }))).query(async ({ input }) => {
    return frontendRuntime.runPromise(ExpenseRepo.getByIdWithMerchant(input.id))
  }),

  /**
   * Get expenses by user.
   */
  getByUser: publicProcedure.input(Schema.decodeUnknownSync(Schema.Struct({ userId: Schema.String }))).query(async ({ input }) => {
    return frontendRuntime.runPromise(ExpenseRepo.getByUser(input.userId))
  }),

  /**
   * Get all user names for iOS shortcut.
   */
  getUsers: publicProcedure.query(async () => {
    const users = await frontendRuntime.runPromise(UserRepo.getAll())
    return users.map((u) => u.name)
  }),

  /**
   * Get unique merchants for iOS shortcut (deprecated, use merchants.list instead).
   * Returns merchant display names for backward compatibility.
   */
  getUniqueMerchants: publicProcedure.query(async () => {
    const merchants = await frontendRuntime.runPromise(MerchantRepo.getAllByRecentUsage())
    return merchants.map((m) => m.displayName)
  }),

  // ==========================================================================
  // Mutations
  // ==========================================================================

  /**
   * Create a new expense.
   * Accepts FormData with image file + expense details.
   * Amount is expected as a display value (e.g., 300 for 300 SAR) and will be converted to smallest units.
   */
  create: publicProcedure.input(createFormDataSchema).mutation(async ({ input }) => {
    // Convert display amount to smallest unit based on currency
    const amountInSmallestUnit = toSmallestUnit(input.amount, input.currency.trim().toUpperCase())

    const program = Effect.gen(function* () {
      const service = yield* ExpenseService
      return yield* service.create({
        userName: input.userName,
        merchantName: input.merchantName,
        currency: input.currency,
        amount: amountInSmallestUnit,
        image: input.image,
        expenseDate: input.expenseDate ? new Date(input.expenseDate) : undefined,
      })
    })
    return frontendRuntime.runPromise(program)
  }),

  /**
   * Update an existing expense.
   */
  update: publicProcedure.input(Schema.decodeUnknownSync(UpdateExpensePayload)).mutation(async ({ input }) => {
    const program = Effect.gen(function* () {
      const service = yield* ExpenseService
      return yield* service.update(input)
    })
    return frontendRuntime.runPromise(program)
  }),

  /**
   * Delete an expense.
   */
  delete: publicProcedure.input(Schema.decodeUnknownSync(Schema.Struct({ id: Schema.String }))).mutation(async ({ input }) => {
    return frontendRuntime.runPromise(ExpenseRepo.delete(input.id))
  }),
} satisfies TRPCRouterRecord
