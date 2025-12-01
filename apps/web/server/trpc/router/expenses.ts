import { z } from 'zod'
import { Effect } from 'effect'
import { type TRPCRouterRecord } from '@trpc/server'

import { publicProcedure } from '../init'
import { frontendRuntime } from '@repo/data-ops/runtimes'
import { ExpenseService } from '@repo/data-ops/domain'

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
} satisfies TRPCRouterRecord
