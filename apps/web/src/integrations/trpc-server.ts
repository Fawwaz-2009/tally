// Server-side tRPC client - uses localLink to call router directly
// This file should only be imported in server contexts (server/server.ts)
import superjson from 'superjson'
import { createTRPCClient, unstable_localLink } from '@trpc/client'

import { trpcRouter } from '@server/trpc/router'
import { getFullEnv } from '@repo/data-ops/layers'
import type { TRPCRouter } from '@server/trpc/router'
import type { NodeEnv } from '@server/hono'

export function createServerTRPCClient() {
  return createTRPCClient<TRPCRouter>({
    links: [
      unstable_localLink({
        router: trpcRouter,
        transformer: superjson,
        createContext: async () => {
          // Get the env from the global store (set in server.ts at request start)
          const env = getFullEnv<NodeEnv>()
          return { env, session: null }
        },
      }),
    ],
  })
}
