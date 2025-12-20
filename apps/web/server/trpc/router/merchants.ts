import { Schema } from 'effect'

import { frontendRuntime } from '@repo/data-ops/runtimes'
import { MerchantRepo } from '@repo/data-ops/domain'
import { publicProcedure } from '../init'
import type { TRPCRouterRecord } from '@trpc/server'

export const merchantsRouter = {
  // ==========================================================================
  // Queries
  // ==========================================================================

  /**
   * List all merchants ordered by usage (for autocomplete).
   */
  list: publicProcedure.query(async () => {
    return frontendRuntime.runPromise(MerchantRepo.getAllByRecentUsage())
  }),

  /**
   * Get merchant by ID.
   */
  getById: publicProcedure.input(Schema.decodeUnknownSync(Schema.Struct({ id: Schema.String }))).query(async ({ input }) => {
    return frontendRuntime.runPromise(MerchantRepo.getById(input.id))
  }),

  // ==========================================================================
  // Mutations
  // ==========================================================================

  /**
   * Update merchant category.
   */
  updateCategory: publicProcedure
    .input(
      Schema.decodeUnknownSync(
        Schema.Struct({
          id: Schema.String,
          category: Schema.NullOr(Schema.String),
        })
      )
    )
    .mutation(async ({ input }) => {
      return frontendRuntime.runPromise(MerchantRepo.updateCategory(input.id, input.category))
    }),
} satisfies TRPCRouterRecord
