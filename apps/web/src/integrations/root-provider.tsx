import { QueryClient } from '@tanstack/react-query'
import superjson from 'superjson'
import { createTRPCClient, httpBatchLink, isNonJsonSerializable, httpLink, splitLink } from '@trpc/client'
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query'

import { TRPCProvider } from '@/integrations/trpc-react'
import type { TRPCRouter } from '@server/trpc/router'

// Client-side tRPC client - uses HTTP links
function createHttpTRPCClient() {
  return createTRPCClient<TRPCRouter>({
    links: [
      splitLink({
        condition: (op) => isNonJsonSerializable(op.input),
        true: httpLink({ url: '/api/trpc', transformer: superjson }),
        false: httpBatchLink({ url: '/api/trpc', transformer: superjson }),
      }),
    ],
  })
}

// Type for the tRPC client
export type AppTRPCClient = ReturnType<typeof createHttpTRPCClient>

// Global client instance - set during initialization
let globalTrpcClient: AppTRPCClient | null = null

// Initialize the tRPC client - call this before rendering
// On server: pass the server client (from trpc-server.ts using unstable_localLink)
// On client: will auto-initialize with HTTP client
export function initTRPCClient(client?: AppTRPCClient) {
  globalTrpcClient = client ?? createHttpTRPCClient()
}

// Get the current tRPC client
export function getTRPCClient(): AppTRPCClient {
  if (!globalTrpcClient) {
    // Auto-initialize with HTTP client if not already initialized (client-side)
    globalTrpcClient = createHttpTRPCClient()
  }
  return globalTrpcClient
}

// Legacy export for compatibility
export const trpcClient = getTRPCClient()

export function getContext() {
  const client = getTRPCClient()

  const queryClient = new QueryClient({
    defaultOptions: {
      dehydrate: { serializeData: superjson.serialize },
      hydrate: { deserializeData: superjson.deserialize },
    },
  })

  const serverHelpers = createTRPCOptionsProxy({
    client,
    queryClient: queryClient,
  })

  return {
    queryClient,
    trpc: serverHelpers,
  }
}

export function Provider({ children, queryClient }: { children: React.ReactNode; queryClient: QueryClient }) {
  return (
    <TRPCProvider trpcClient={getTRPCClient()} queryClient={queryClient}>
      {children}
    </TRPCProvider>
  )
}
