import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import type { Session } from '@/lib/auth-client'
import type { NodeEnv } from '../hono'

// Context type for TRPC - includes Node.js env and auth session
export interface TRPCContext {
  env: NodeEnv
  session?: Session | null
}

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
})

export const createTRPCRouter = t.router
export const publicProcedure = t.procedure

// Protected procedure - requires authentication
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    })
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  })
})
