import { Hono } from 'hono'
import handler from '@tanstack/react-start/server-entry'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { getAuth } from '@repo/data-ops/lib'
import * as fs from 'node:fs'
import * as path from 'node:path'

import { trpcRouter } from './trpc/router/index'

// Environment type for Node.js
export interface NodeEnv {
  BETTER_AUTH_SECRET: string
  DATABASE_PATH: string
  BUCKET_STORAGE_PATH: string
  BASE_FRONTEND_URL: string
  NODE_ENV: string
}

// Get environment from process.env
function getEnv(): NodeEnv {
  if (!process.env.BETTER_AUTH_SECRET) {
    throw new Error('BETTER_AUTH_SECRET environment variable is required')
  }
  return {
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    DATABASE_PATH: process.env.DATABASE_PATH || './data/app.db',
    BUCKET_STORAGE_PATH: process.env.BUCKET_STORAGE_PATH || './data/uploads',
    BASE_FRONTEND_URL: process.env.BASE_FRONTEND_URL || 'http://localhost:3000',
    NODE_ENV: process.env.NODE_ENV || 'development',
  }
}

const app = new Hono()

// Health check endpoint for Docker/Kubernetes
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Better Auth routes
app.all('/api/auth/**', async (c) => {
  const env = getEnv()
  const auth = getAuth({ BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET })
  return auth.handler(c.req.raw)
})

// File serving endpoint for local filesystem storage
app.get('/api/files/:key{.+}', async (c) => {
  const key = c.req.param('key')
  const env = getEnv()

  if (!key) {
    return c.notFound()
  }

  const filePath = path.join(env.BUCKET_STORAGE_PATH, key)
  const metaPath = path.join(env.BUCKET_STORAGE_PATH, `${key}.meta.json`)

  if (!fs.existsSync(filePath)) {
    return c.notFound()
  }

  const fileBuffer = fs.readFileSync(filePath)

  // Read metadata if available
  let contentType = 'application/octet-stream'
  try {
    const metaContent = fs.readFileSync(metaPath, 'utf-8')
    const metadata = JSON.parse(metaContent)
    if (metadata.contentType) {
      contentType = metadata.contentType
    }
  } catch {
    // No metadata file, use default content type
  }

  return new Response(fileBuffer, {
    headers: {
      'content-type': contentType,
      'cache-control': 'public, max-age=31536000',
    },
  })
})

app.all('/api/trpc', async (c) => {
  const env = getEnv()
  const auth = getAuth({ BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET })
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: c.req.raw,
    router: trpcRouter,
    createContext: () => ({ env, session: session ?? null }),
  })
})

app.all('/api/trpc/*', async (c) => {
  const env = getEnv()
  const auth = getAuth({ BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET })
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: c.req.raw,
    router: trpcRouter,
    createContext: () => ({ env, session: session ?? null }),
  })
})

app.all('*', async (c) => {
  const env = getEnv()
  // TanStack Start expects the env wrapped in a context object
  return handler.fetch(c.req.raw, { context: { env } })
})

export default app
