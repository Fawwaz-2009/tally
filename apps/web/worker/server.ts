// Custom server entry for Cloudflare Workers
// This allows us to initialize resources and add custom logic
import app from './hono'
import {
  initDatabase,
  initRuntimeEnvs,
  initBucket,
  initFullEnv,
} from '@repo/data-ops/layers'
import { createServerTRPCClient } from '@/integrations/trpc-server'
import { initTRPCClient } from '@/integrations/root-provider'

export default {
  fetch(request, env, ctx) {
    // Initialize Cloudflare bindings for this request
    initDatabase(env.DB)
    initBucket(env.BUCKET)
    initFullEnv(env)
    initRuntimeEnvs({
        BASE_FRONTEND_URL: env.VITE_BASE_FRONTEND_URL,
        NODE_ENV: env.NODE_ENV,
    })

    // Initialize tRPC client with server-side direct calls (avoids HTTP self-request)
    const serverTrpcClient = createServerTRPCClient()
    initTRPCClient(serverTrpcClient)

    return app.fetch(request, env, ctx)
  },
} satisfies ExportedHandler<ServiceBindings>
