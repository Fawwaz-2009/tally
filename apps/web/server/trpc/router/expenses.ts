import { Effect, Schema } from 'effect'
import { zfd } from 'zod-form-data'

import { frontendRuntime } from '@repo/data-ops/runtimes'
import { ExpenseRepo, ExpenseService, PendingReviewExpenseSchema, UpdateExpensePayload, UserRepo } from '@repo/data-ops/domain'
import { publicProcedure } from '../init'
import type {TRPCRouterRecord} from '@trpc/server';

// FormData schema - zod-form-data is a thin adapter for parsing FormData
// Effect Schema doesn't have a File primitive, so we keep this as Zod
const captureFormDataSchema = zfd.formData({
  image: zfd.file(),
  userId: zfd.text(),
})

// FormData schema for creating expense directly (iOS shortcut)
const createDirectFormDataSchema = zfd.formData({
  image: zfd.file(),
  userName: zfd.text(),
  merchant: zfd.text(),
  currency: zfd.text(),
  amount: zfd.numeric(),
  expenseDate: zfd.text().optional(), // ISO date string, optional
})

export const expensesRouter = {
  // ==========================================================================
  // Domain Operations
  // ==========================================================================

  /**
   * Capture a receipt image and process it through OCR/LLM extraction.
   * Accepts FormData with image file - the domain service handles all transformation.
   */
  capture: publicProcedure.input(captureFormDataSchema).mutation(async ({ input }) => {
    const program = Effect.gen(function* () {
      const service = yield* ExpenseService
      return yield* service.capture({
        userId: input.userId,
        image: input.image,
      })
    })
    return frontendRuntime.runPromise(program)
  }),

  /**
   * Confirm a pending-review expense with optional overrides.
   * Validates required fields and transitions to confirmed state.
   */
  confirm: publicProcedure
    .input(Schema.decodeUnknownSync(PendingReviewExpenseSchema.pick('id', 'amount', 'currency', 'merchant', 'description', 'categories', 'expenseDate')))
    .mutation(async ({ input }) => {
      const program = Effect.gen(function* () {
        const service = yield* ExpenseService
        return yield* service.confirm(input)
      })
      return frontendRuntime.runPromise(program)
    }),

  // ==========================================================================
  // Queries (use repo directly - no business logic needed)
  // ==========================================================================

  /**
   * List confirmed expenses (for reports/dashboard).
   */
  list: publicProcedure.query(async () => {
    return frontendRuntime.runPromise(ExpenseRepo.getConfirmed())
  }),

  /**
   * List all expenses (pending, pending-review, and confirmed).
   */
  listAll: publicProcedure.query(async () => {
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
   * Get expenses pending review.
   */
  getPendingReview: publicProcedure.query(async () => {
    return frontendRuntime.runPromise(ExpenseRepo.getPendingReview())
  }),

  /**
   * Get count of expenses pending review.
   */
  pendingReviewCount: publicProcedure.query(async () => {
    return frontendRuntime.runPromise(ExpenseRepo.countPendingReview())
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
   * Update a pending-review expense's data.
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

  // ==========================================================================
  // Health Checks
  // ==========================================================================

  /**
   * Check if extraction service (Ollama) is available.
   */
  checkExtractionHealth: publicProcedure.query(async () => {
    const program = Effect.gen(function* () {
      const service = yield* ExpenseService
      return yield* service.checkExtractionHealth()
    })
    return frontendRuntime.runPromise(program)
  }),

  /**
   * Create a confirmed expense directly, bypassing extraction.
   * Used for iOS shortcuts and other external integrations.
   * Accepts FormData with image file + expense details.
   */
  createDirect: publicProcedure.input(createDirectFormDataSchema).mutation(async ({ input }) => {
    const program = Effect.gen(function* () {
      const service = yield* ExpenseService
      return yield* service.createDirect({
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
} satisfies TRPCRouterRecord
