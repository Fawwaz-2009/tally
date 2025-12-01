import { z } from 'zod'
import { Effect } from 'effect'
import { type TRPCRouterRecord } from '@trpc/server'

import { publicProcedure } from '../init'
import { frontendRuntime } from '@repo/data-ops/runtimes'
import { UserService } from '@repo/data-ops/domain'

export const usersRouter = {
  list: publicProcedure.query(async () => {
    const program = Effect.gen(function* () {
      const service = yield* UserService
      return yield* service.getAllUsers()
    })
    return frontendRuntime.runPromise(program)
  }),

  create: publicProcedure
    .input(
      z.object({
        id: z
          .string()
          .min(1)
          .max(50)
          .regex(
            /^[a-z0-9-]+$/,
            'ID must be lowercase alphanumeric with hyphens',
          ),
        name: z.string().min(1).max(100),
      }),
    )
    .mutation(async ({ input }) => {
      const program = Effect.gen(function* () {
        const service = yield* UserService
        return yield* service.createUser(input)
      })
      return frontendRuntime.runPromise(program)
    }),
} satisfies TRPCRouterRecord
