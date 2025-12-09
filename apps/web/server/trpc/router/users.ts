import { Schema, Effect } from 'effect'
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
      Schema.decodeUnknownSync(
        Schema.Struct({
          id: Schema.String.pipe(
            Schema.minLength(1),
            Schema.maxLength(50),
            Schema.pattern(/^[a-z0-9-]+$/, { message: () => 'ID must be lowercase alphanumeric with hyphens' })
          ),
          name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
        })
      )
    )
    .mutation(async ({ input }) => {
      const program = Effect.gen(function* () {
        const service = yield* UserService
        return yield* service.createUser(input)
      })
      return frontendRuntime.runPromise(program)
    }),
} satisfies TRPCRouterRecord
