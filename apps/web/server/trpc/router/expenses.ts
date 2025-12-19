import { Effect, Schema } from 'effect'
import { zfd } from 'zod-form-data'

import { frontendRuntime } from '@repo/data-ops/runtimes'
import { ExpenseRepo, ExpenseService, UpdateExpensePayload, UserRepo } from '@repo/data-ops/domain'
import { publicProcedure } from '../init'
import type { TRPCRouterRecord } from '@trpc/server'

// FormData schema for creating expense
const createFormDataSchema = zfd.formData({
  image: zfd.file(),
  userName: zfd.text(),
  merchant: zfd.text(),
  currency: zfd.text(),
  amount: zfd.numeric(),
  expenseDate: zfd.text().optional(), // ISO date string, optional
})

export const expensesRouter = {
  // ==========================================================================
  // Queries
  // ==========================================================================

  /**
   * List all expenses (ordered by expense date, most recent first).
   */
  list: publicProcedure.query(async () => {
    return frontendRuntime.runPromise(ExpenseRepo.getAll())
  }),

  /**
   * Get expense by ID.
   */
  getById: publicProcedure.input(Schema.decodeUnknownSync(Schema.Struct({ id: Schema.String }))).query(async ({ input }) => {
    return frontendRuntime.runPromise(ExpenseRepo.getById(input.id))
  }),

  /**
   * Get expenses by user.
   */
  getByUser: publicProcedure.input(Schema.decodeUnknownSync(Schema.Struct({ userId: Schema.String }))).query(async ({ input }) => {
    return frontendRuntime.runPromise(ExpenseRepo.getByUser(input.userId))
  }),

  /**
   * Get unique merchants sorted by most recent expense date.
   */
  getUniqueMerchants: publicProcedure.query(async () => {
    return frontendRuntime.runPromise(ExpenseRepo.getUniqueMerchants())
  }),

  /**
   * Get all user names for iOS shortcut.
   */
  getUsers: publicProcedure.query(async () => {
    const users = await frontendRuntime.runPromise(UserRepo.getAll())
    return users.map((u) => u.name)
  }),

  // ==========================================================================
  // Mutations
  // ==========================================================================

  /**
   * Create a new expense.
   * Accepts FormData with image file + expense details.
   */
  create: publicProcedure.input(createFormDataSchema).mutation(async ({ input }) => {
    const program = Effect.gen(function* () {
      const service = yield* ExpenseService
      return yield* service.create({
        userName: input.userName,
        merchant: input.merchant,
        currency: input.currency,
        amount: input.amount,
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
