import { initTRPC } from '@trpc/server'
import superjson from 'superjson'
import type { NodeEnv } from '../hono'

// Context type for TRPC - includes Node.js env
export interface TRPCContext {
  env: NodeEnv
}

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
})

export const createTRPCRouter = t.router
export const publicProcedure = t.procedure
