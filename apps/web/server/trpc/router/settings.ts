import { Schema, Effect } from 'effect'
import { type TRPCRouterRecord } from '@trpc/server'

import { publicProcedure } from '../init'
import { frontendRuntime } from '@repo/data-ops/runtimes'
import { SettingsService } from '@repo/data-ops/domain'

export const settingsRouter = {
  isSetupComplete: publicProcedure.query(async () => {
    const program = Effect.gen(function* () {
      const service = yield* SettingsService
      return yield* service.isSetupComplete()
    })
    return frontendRuntime.runPromise(program)
  }),

  getBaseCurrency: publicProcedure.query(async () => {
    const program = Effect.gen(function* () {
      const service = yield* SettingsService
      return yield* service.getBaseCurrency()
    })
    return frontendRuntime.runPromise(program)
  }),

  setBaseCurrency: publicProcedure
    .input(Schema.decodeUnknownSync(Schema.Struct({ currency: Schema.String.pipe(Schema.length(3)) })))
    .mutation(async ({ input }) => {
      const program = Effect.gen(function* () {
        const service = yield* SettingsService
        return yield* service.setBaseCurrency(input.currency)
      })
      return frontendRuntime.runPromise(program)
    }),

  completeSetup: publicProcedure
    .input(
      Schema.decodeUnknownSync(
        Schema.Struct({
          userName: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
          currency: Schema.String.pipe(Schema.length(3)),
        })
      )
    )
    .mutation(async ({ input }) => {
      const program = Effect.gen(function* () {
        const service = yield* SettingsService
        return yield* service.completeSetup(input)
      })
      return frontendRuntime.runPromise(program)
    }),
} satisfies TRPCRouterRecord
