import { Effect, Schema } from 'effect'

import { frontendRuntime } from '@repo/data-ops/runtimes'
import { CreateUserSchema, UserService } from '@repo/data-ops/domain'
import { publicProcedure } from '../init'
import type {TRPCRouterRecord} from '@trpc/server';

export const usersRouter = {
  list: publicProcedure.query(async () => {
    return frontendRuntime.runPromise(
      Effect.gen(function* () {
        const service = yield* UserService
        return yield* service.getAllUsers()
      }),
    )
  }),

  create: publicProcedure.input(Schema.decodeUnknownSync(CreateUserSchema)).mutation(async ({ input }) => {
    return frontendRuntime.runPromise(
      Effect.gen(function* () {
        const service = yield* UserService
        return yield* service.createUser(input)
      }),
    )
  }),
} satisfies TRPCRouterRecord
