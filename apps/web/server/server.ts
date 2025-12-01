// Node.js server entry for TanStack Start + Nitro
// This is the main entry point for the production server
import app from './hono'
import {
  initDatabase,
  initRuntimeEnvs,
  initBucket,
  initFullEnv,
} from '@repo/data-ops/layers'
import { createServerTRPCClient } from '@/integrations/trpc-server'
import { initTRPCClient } from '@/integrations/root-provider'

import type { NodeEnv } from './hono'

const env: NodeEnv = {
  DATABASE_PATH: process.env.DATABASE_PATH || './data/app.db',
  BUCKET_STORAGE_PATH: process.env.BUCKET_STORAGE_PATH || './data/uploads',
  BASE_FRONTEND_URL: process.env.BASE_FRONTEND_URL || 'http://localhost:3000',
  NODE_ENV: process.env.NODE_ENV || 'development',
}

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
})

// Initialize tRPC client with server-side direct calls (avoids HTTP self-request)
const serverTrpcClient = createServerTRPCClient()
initTRPCClient(serverTrpcClient)

console.log('[Server] All services initialized successfully')

// Export the Hono app's fetch handler for Nitro
export default {
  fetch: app.fetch.bind(app),
}
