import { Effect, Schema } from 'effect'

import { ShortcutSessionService } from '@repo/data-ops/domain'
import { frontendRuntime } from '@repo/data-ops/runtimes'
import { publicProcedure } from '../init'
import type { TRPCRouterRecord } from '@trpc/server'
import { env } from '@/env'

// Input schemas
const SessionIdInput = Schema.Struct({
  sessionId: Schema.String,
})

export const shortcutRouter = {
  /**
   * List all pending sessions.
   * Used by PWA to check if there are sessions to process on app launch.
   */
  listSessions: publicProcedure.query(async () => {
    return frontendRuntime.runPromise(
      Effect.gen(function* () {
        const service = yield* ShortcutSessionService
        return yield* service.listSessions()
      }),
    )
  }),

  /**
   * Get a single session by ID.
   * Returns session data including image URL.
   */
  getSession: publicProcedure
    .input(Schema.decodeUnknownSync(SessionIdInput))
    .query(async ({ input }) => {
      return frontendRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ShortcutSessionService
          return yield* service.getSession(input.sessionId)
        }),
      )
    }),

  /**
   * Delete/discard a session without completing it.
   * Cleans up the associated image file.
   */
  deleteSession: publicProcedure
    .input(Schema.decodeUnknownSync(SessionIdInput))
    .mutation(async ({ input }) => {
      return frontendRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ShortcutSessionService
          return yield* service.deleteSession(input.sessionId, env.BUCKET_STORAGE_PATH)
        }),
      )
    }),

  /**
   * Mark a session as complete after expense is created.
   * Cleans up the session and associated image file.
   */
  completeSession: publicProcedure
    .input(Schema.decodeUnknownSync(SessionIdInput))
    .mutation(async ({ input }) => {
      return frontendRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ShortcutSessionService
          return yield* service.completeSession(input.sessionId, env.BUCKET_STORAGE_PATH)
        }),
      )
    }),
} satisfies TRPCRouterRecord
