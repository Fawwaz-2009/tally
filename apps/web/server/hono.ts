import { Hono } from 'hono'
import handler from '@tanstack/react-start/server-entry'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import * as fs from 'node:fs'
import * as path from 'node:path'

import { trpcRouter } from './trpc/router/index'
import { env } from '@/env'

// Export the env type for use in tRPC context
export type NodeEnv = typeof env

const app = new Hono()

// Health check endpoint for Docker/Kubernetes
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// File serving endpoint for local filesystem storage
app.get('/api/files/:key{.+}', async (c) => {
  const key = c.req.param('key')

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

  return new Response(new Uint8Array(fileBuffer), {
    headers: {
      'content-type': contentType,
      'cache-control': 'public, max-age=31536000',
    },
  })
})

app.all('/api/trpc', async (c) => {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: c.req.raw,
    router: trpcRouter,
    createContext: () => ({ env }),
  })
})

app.all('/api/trpc/*', async (c) => {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: c.req.raw,
    router: trpcRouter,
    createContext: () => ({ env }),
  })
})

app.all('*', async (c) => {
  // TanStack Start expects the env wrapped in a context object
  return handler.fetch(c.req.raw, { context: { env } })
})

export default app
