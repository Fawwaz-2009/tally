import { Effect, Schema } from 'effect'

import { frontendRuntime } from '@repo/data-ops/runtimes'
import { CompleteSetupInput, SetBaseCurrencyInput, SettingsService } from '@repo/data-ops/domain'
import { publicProcedure } from '../init'
import type {TRPCRouterRecord} from '@trpc/server';

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
