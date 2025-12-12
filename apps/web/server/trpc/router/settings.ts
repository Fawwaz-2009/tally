import { Effect, Schema } from 'effect'
import { type TRPCRouterRecord } from '@trpc/server'

import { publicProcedure } from '../init'
import { frontendRuntime } from '@repo/data-ops/runtimes'
import { SettingsService, SetBaseCurrencyInput, CompleteSetupInput } from '@repo/data-ops/domain'

export const settingsRouter = {
  isSetupComplete: publicProcedure.query(async () => {
    return frontendRuntime.runPromise(
      Effect.gen(function* () {
        const service = yield* SettingsService
        return yield* service.isSetupComplete()
      }),
    )
  }),

  getBaseCurrency: publicProcedure.query(async () => {
    return frontendRuntime.runPromise(
      Effect.gen(function* () {
        const service = yield* SettingsService
        return yield* service.getBaseCurrency()
      }),
    )
  }),

  setBaseCurrency: publicProcedure.input(Schema.decodeUnknownSync(SetBaseCurrencyInput)).mutation(async ({ input }) => {
    return frontendRuntime.runPromise(
      Effect.gen(function* () {
        const service = yield* SettingsService
        return yield* service.setBaseCurrency(input.currency)
      }),
    )
  }),

  completeSetup: publicProcedure.input(Schema.decodeUnknownSync(CompleteSetupInput)).mutation(async ({ input }) => {
    return frontendRuntime.runPromise(
      Effect.gen(function* () {
        const service = yield* SettingsService
        return yield* service.completeSetup(input)
      }),
    )
  }),
} satisfies TRPCRouterRecord
