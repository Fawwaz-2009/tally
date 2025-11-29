// Server-side tRPC client - uses localLink to call router directly
// This file should only be imported in server contexts (worker/server.ts)
import superjson from 'superjson'
import { createTRPCClient, unstable_localLink } from '@trpc/client'

import type { TRPCRouter } from '@worker/trpc/router'
import { trpcRouter } from '@worker/trpc/router'
import { getFullEnv } from '@repo/data-ops/layers'

export function createServerTRPCClient() {
  return createTRPCClient<TRPCRouter>({
    links: [
      unstable_localLink({
        router: trpcRouter,
        transformer: superjson,
        createContext: async () => {
          // Get the env from the global store (set in server.ts at request start)
          const env = getFullEnv<Env>()
          return { env, session: null }
        },
      }),
    ],
  })
}
