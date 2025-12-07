import { z } from 'zod'
import { zfd } from 'zod-form-data'
import { Effect } from 'effect'
import { type TRPCRouterRecord } from '@trpc/server'

import { publicProcedure } from '../init'
import { frontendRuntime } from '@repo/data-ops/runtimes'
import { ExpenseService } from '@repo/data-ops/domain'

// FormData schema for native tRPC file upload
const uploadFormDataSchema = zfd.formData({
  image: zfd.file(),
  userId: zfd.text(),
  caption: zfd.text().optional(),
})

export const expensesRouter = {
  // ==========================================================================
  // Domain Operations
  // ==========================================================================

  /**
   * Capture a receipt image and process it through OCR/LLM extraction.
   * Returns the created expense and extraction results.
   */
  capture: publicProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        imageBase64: z.string(),
        fileName: z.string(),
        contentType: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const program = Effect.gen(function* () {
        const service = yield* ExpenseService
        return yield* service.capture(input)
      })

      return frontendRuntime.runPromise(program)
    }),

  /**
   * Capture receipt via FormData (for iOS Shortcuts and direct file uploads).
   * POST /api/trpc/expenses.captureFromFormData - accepts multipart/form-data
   */
  captureFromFormData: publicProcedure.input(uploadFormDataSchema).mutation(async ({ input }) => {
    const { image, userId, caption } = input

    // Caption can override userId for attribution (e.g., "household" account)
    const effectiveUserId = caption?.trim() || userId

    // Convert File to base64 (transport adaptation)
    const arrayBuffer = await image.arrayBuffer()
    const imageBase64 = Buffer.from(arrayBuffer).toString('base64')

    const program = Effect.gen(function* () {
      const service = yield* ExpenseService

      return yield* service.capture({
        userId: effectiveUserId,
        imageBase64,
        fileName: image.name || 'upload.png',
        contentType: image.type || 'image/png',
      })
    })

    const result = await frontendRuntime.runPromise(program)

    // Return consistent response format for iOS Shortcuts compatibility
    return {
      id: result.expense.id,
      state: result.expense.state,
      needsReview: result.needsReview,
      extraction: result.extraction.success
        ? {
            amount: result.extraction.data?.amount,
            currency: result.extraction.data?.currency,
            merchant: result.extraction.data?.merchant,
          }
        : { error: result.extraction.error },
    }
  }),

  /**
   * Complete a draft expense with optional overrides.
   * Validates required fields and transitions to complete state.
   */
  complete: publicProcedure
    .input(
      z.object({
        id: z.string(),
        amount: z.number().int().positive().optional(),
        currency: z.string().length(3).optional(),
        merchant: z.string().optional(),
        description: z.string().optional(),
        categories: z.array(z.string()).optional(),
        expenseDate: z.coerce.date().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...overrides } = input

      const program = Effect.gen(function* () {
        const service = yield* ExpenseService
        return yield* service.complete(id, overrides)
      })

      return frontendRuntime.runPromise(program)
    }),

  // ==========================================================================
  // Queries
  // ==========================================================================

  /**
   * List complete expenses (for reports/dashboard).
   */
  list: publicProcedure.query(async () => {
    const program = Effect.gen(function* () {
      const service = yield* ExpenseService
      return yield* service.list()
    })
    return frontendRuntime.runPromise(program)
  }),

  /**
   * List all expenses (both draft and complete).
   */
  listAll: publicProcedure.query(async () => {
    const program = Effect.gen(function* () {
      const service = yield* ExpenseService
      return yield* service.listAll()
    })
    return frontendRuntime.runPromise(program)
  }),

  /**
   * Get expense by ID.
   */
  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const program = Effect.gen(function* () {
      const service = yield* ExpenseService
      return yield* service.getById(input.id)
    })
    return frontendRuntime.runPromise(program)
  }),

  /**
   * Get expenses by user.
   */
  getByUser: publicProcedure.input(z.object({ userId: z.string() })).query(async ({ input }) => {
    const program = Effect.gen(function* () {
      const service = yield* ExpenseService
      return yield* service.getByUser(input.userId)
    })
    return frontendRuntime.runPromise(program)
  }),

  /**
   * Get draft expenses pending review.
   */
  getPendingReview: publicProcedure.query(async () => {
    const program = Effect.gen(function* () {
      const service = yield* ExpenseService
      return yield* service.getPendingReview()
    })
    return frontendRuntime.runPromise(program)
  }),

  /**
   * Get count of expenses pending review.
   */
  pendingReviewCount: publicProcedure.query(async () => {
    const program = Effect.gen(function* () {
      const service = yield* ExpenseService
      return yield* service.pendingReviewCount()
    })
    return frontendRuntime.runPromise(program)
  }),

  // ==========================================================================
  // Mutations
  // ==========================================================================

  /**
   * Update expense data.
   */
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        amount: z.number().int().positive().optional(),
        currency: z.string().length(3).optional(),
        merchant: z.string().optional(),
        description: z.string().optional(),
        categories: z.array(z.string()).optional(),
        expenseDate: z.coerce.date().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input

      const program = Effect.gen(function* () {
        const service = yield* ExpenseService
        return yield* service.update(id, data)
      })

      return frontendRuntime.runPromise(program)
    }),

  /**
   * Delete an expense.
   */
  delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const program = Effect.gen(function* () {
      const service = yield* ExpenseService
      return yield* service.delete(input.id)
    })
    return frontendRuntime.runPromise(program)
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
} satisfies TRPCRouterRecord
