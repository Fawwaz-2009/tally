import { z } from 'zod'
import { zfd } from 'zod-form-data'
import { Effect } from 'effect'
import { type TRPCRouterRecord } from '@trpc/server'
import { randomUUID } from 'node:crypto'

import { publicProcedure } from '../init'
import { frontendRuntime } from '@repo/data-ops/runtimes'
import { ExpenseService, ExtractionService } from '@repo/data-ops/domain'

// FormData schema for native tRPC file upload
const uploadFormDataSchema = zfd.formData({
  image: zfd.file(),
  userId: zfd.text(),
  caption: zfd.text().optional(),
})

export const expensesRouter = {
  list: publicProcedure.query(async () => {
    const program = Effect.gen(function* () {
      const service = yield* ExpenseService
      return yield* service.getAllExpenses()
    })
    return frontendRuntime.runPromise(program)
  }),

  create: publicProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        amount: z.number().int().positive().optional(),
        currency: z.string().length(3).optional(),
        merchant: z.string().optional(),
        description: z.string().optional(),
        categories: z.array(z.string()).optional(),
        screenshotPath: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const program = Effect.gen(function* () {
        const service = yield* ExpenseService
        return yield* service.createExpense(input)
      })
      return frontendRuntime.runPromise(program)
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const program = Effect.gen(function* () {
        const service = yield* ExpenseService
        return yield* service.getExpense(input.id)
      })
      return frontendRuntime.runPromise(program)
    }),

  getByUser: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const program = Effect.gen(function* () {
        const service = yield* ExpenseService
        return yield* service.getExpensesByUser(input.userId)
      })
      return frontendRuntime.runPromise(program)
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const program = Effect.gen(function* () {
        const service = yield* ExpenseService
        return yield* service.deleteExpense(input.id)
      })
      return frontendRuntime.runPromise(program)
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        amount: z.number().int().positive().optional(),
        currency: z.string().length(3).optional(),
        merchant: z.string().optional(),
        description: z.string().optional(),
        categories: z.array(z.string()).optional(),
        status: z
          .enum(['submitted', 'processing', 'needs-review', 'success'])
          .optional(),
        expenseDate: z.string().optional(), // ISO date string
      }),
    )
    .mutation(async ({ input }) => {
      const { id, expenseDate: expenseDateStr, ...data } = input
      const program = Effect.gen(function* () {
        const expenseService = yield* ExpenseService

        // Parse expense date if provided
        const expenseDate = expenseDateStr
          ? new Date(expenseDateStr)
          : undefined

        // Domain service handles currency conversion automatically
        return yield* expenseService.updateExpenseWithConversion(id, {
          ...data,
          expenseDate,
        })
      })
      return frontendRuntime.runPromise(program)
    }),

  // Upload screenshot and process with OCR + LLM extraction
  uploadAndProcess: publicProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        imageBase64: z.string(), // Base64 encoded image
        fileName: z.string(),
        contentType: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const program = Effect.gen(function* () {
        const expenseService = yield* ExpenseService

        // Generate unique key for the file
        const fileKey = `expenses/${Date.now()}-${input.fileName}`

        // Decode base64
        const imageBuffer = Buffer.from(input.imageBase64, 'base64')

        // Domain service handles the full workflow
        return yield* expenseService.ingest({
          userId: input.userId,
          imageBuffer,
          fileKey,
          contentType: input.contentType,
        })
      })

      return frontendRuntime.runPromise(program)
    }),

  // Upload expense via native FormData (for iOS Shortcuts and direct file uploads)
  // POST /api/trpc/expenses.uploadFromFormData - accepts multipart/form-data
  // Body: image (file), userId (string), caption (optional string - overrides userId if provided)
  uploadFromFormData: publicProcedure
    .input(uploadFormDataSchema)
    .mutation(async ({ input }) => {
      const { image, userId, caption } = input

      // Caption can override userId for attribution (e.g., "household" account)
      const effectiveUserId = caption?.trim() || userId

      // Generate expense ID for file naming
      const expenseId = randomUUID()

      // Determine file extension from content type
      const contentType = image.type || 'image/png'
      let extension = 'png'
      if (contentType.includes('jpeg') || contentType.includes('jpg')) {
        extension = 'jpg'
      } else if (contentType.includes('png')) {
        extension = 'png'
      } else if (contentType.includes('heic')) {
        extension = 'heic'
      } else if (contentType.includes('webp')) {
        extension = 'webp'
      }

      // Generate unique key for the file
      const fileKey = `expenses/${expenseId}.${extension}`

      // Convert File to Buffer
      const arrayBuffer = await image.arrayBuffer()
      const imageBuffer = Buffer.from(arrayBuffer)

      const program = Effect.gen(function* () {
        const expenseService = yield* ExpenseService

        // Domain service handles the full workflow
        return yield* expenseService.ingest({
          userId: effectiveUserId,
          imageBuffer,
          fileKey,
          contentType,
        })
      })

      const result = await frontendRuntime.runPromise(program)

      // Return consistent response format for iOS Shortcuts compatibility
      return {
        id: result.expense?.id ?? expenseId,
        status: result.expense?.status ?? 'needs-review',
        extraction: result.extraction.success
          ? {
              amount: result.extraction.data?.amount,
              currency: result.extraction.data?.currency,
              merchant: result.extraction.data?.merchant,
            }
          : { error: result.extraction.error },
      }
    }),

  // Check if Ollama is available for extraction
  checkOllamaHealth: publicProcedure.query(async () => {
    const program = Effect.gen(function* () {
      const service = yield* ExtractionService
      return yield* service.checkOllamaHealth()
    })
    return frontendRuntime.runPromise(program)
  }),

  // Get count of expenses needing review
  needsReviewCount: publicProcedure.query(async () => {
    const program = Effect.gen(function* () {
      const service = yield* ExpenseService
      const expenses = yield* service.getAllExpenses()
      return expenses.filter((e) => e.status === 'needs-review').length
    })
    return frontendRuntime.runPromise(program)
  }),

  // Get expenses by status
  getByStatus: publicProcedure
    .input(
      z.object({
        status: z.enum(['submitted', 'processing', 'needs-review', 'success']),
      }),
    )
    .query(async ({ input }) => {
      const program = Effect.gen(function* () {
        const service = yield* ExpenseService
        const expenses = yield* service.getAllExpenses()
        return expenses.filter((e) => e.status === input.status)
      })
      return frontendRuntime.runPromise(program)
    }),

  // Get all expenses that need attention (submitted, processing, or needs-review)
  getNeedsAttention: publicProcedure.query(async () => {
    const program = Effect.gen(function* () {
      const service = yield* ExpenseService
      const expenses = yield* service.getAllExpenses()
      return expenses.filter(
        (e) =>
          e.status === 'submitted' ||
          e.status === 'processing' ||
          e.status === 'needs-review',
      )
    })
    return frontendRuntime.runPromise(program)
  }),
} satisfies TRPCRouterRecord
