// Node.js server entry for TanStack Start + Nitro
// This is the main entry point for the production server

// Import env first - validates and fails fast if missing
import { initBucket, initDatabase, initFullEnv, initRuntimeEnvs } from '@repo/data-ops/layers'
import app from './hono'
import { env } from '@/env'

import { createServerTRPCClient } from '@/integrations/trpc-server'
import { initTRPCClient } from '@/integrations/root-provider'

// Initialize all services at server startup
console.log('[Server] Initializing database...')
initDatabase(env.DATABASE_PATH)

console.log('[Server] Initializing bucket storage...')
initBucket(env.BUCKET_STORAGE_PATH)

console.log('[Server] Initializing environment...')
initFullEnv(env)
initRuntimeEnvs({
  BASE_FRONTEND_URL: env.BASE_FRONTEND_URL,
  NODE_ENV: env.NODE_ENV,
  OLLAMA_HOST: env.OLLAMA_HOST,
  OLLAMA_MODEL: env.OLLAMA_MODEL,
})

// Initialize tRPC client with server-side direct calls (avoids HTTP self-request)
const serverTrpcClient = createServerTRPCClient()
initTRPCClient(serverTrpcClient)

console.log('[Server] All services initialized successfully')

// Export the Hono app's fetch handler for Nitro
export default {
  fetch: app.fetch.bind(app),
}
