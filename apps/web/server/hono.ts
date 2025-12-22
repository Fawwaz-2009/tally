import * as fs from 'node:fs'
import * as path from 'node:path'
import { Effect } from 'effect'
import { Hono } from 'hono'
import handler from '@tanstack/react-start/server-entry'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'

import { ShortcutSessionService, startSessionCleanup } from '@repo/data-ops/domain'
import { frontendRuntime } from '@repo/data-ops/runtimes'
import { trpcRouter } from './trpc/router/index'
import { env } from '@/env'

// Export the env type for use in tRPC context
export type NodeEnv = typeof env

// Start the session cleanup interval
startSessionCleanup(env.BUCKET_STORAGE_PATH)

const app = new Hono()

// Health check endpoint for Docker/Kubernetes
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// =============================================================================
// iOS Shortcut Integration - Upload Endpoint Only
// Other session operations are handled via tRPC (shortcut router)
// =============================================================================

/**
 * Upload endpoint for iOS Shortcuts.
 * Accepts an image and returns a session ID that can be used to open the PWA.
 *
 * This endpoint must remain as Hono because iOS Shortcuts sends multipart/form-data
 * from outside the React app. Other session operations use tRPC.
 *
 * iOS Shortcut Flow:
 * 1. User shares image → Shortcut receives it
 * 2. Shortcut POSTs image to this endpoint
 * 3. Server returns { sessionId, url }
 * 4. Shortcut opens the URL in Safari
 * 5. PWA loads and detects pending sessions
 */
app.post('/api/shortcut/upload', async (c) => {
  try {
    const formData = await c.req.formData()
    const image = formData.get('image') as File | null

    if (!image) {
      return c.json({ error: 'No image provided' }, 400)
    }

    // Generate file key
    const extension = image.name.split('.').pop() || 'jpg'
    const tempId = crypto.randomUUID()
    const imageKey = `shortcut-sessions/${tempId}.${extension}`
    const contentType = image.type || 'image/jpeg'

    // Save the image to the bucket
    const arrayBuffer = await image.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const dir = path.join(env.BUCKET_STORAGE_PATH, 'shortcut-sessions')
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const filePath = path.join(env.BUCKET_STORAGE_PATH, imageKey)
    fs.writeFileSync(filePath, buffer)

    // Save metadata
    const metaPath = `${filePath}.meta.json`
    fs.writeFileSync(metaPath, JSON.stringify({ contentType }))

    // Create session using the Effect service
    const result = await frontendRuntime.runPromise(
      Effect.gen(function* () {
        const service = yield* ShortcutSessionService
        return yield* service.createSession({ imageKey, contentType })
      }),
    )

    // Build the PWA URL (though iOS Shortcuts can't deep link, we return it anyway)
    const host = c.req.header('host') || 'localhost:3000'
    const protocol = c.req.header('x-forwarded-proto') || 'http'
    const pwaUrl = `${protocol}://${host}/quick-add?session=${result.sessionId}`

    return c.json({
      success: true,
      sessionId: result.sessionId,
      url: pwaUrl,
    })
  } catch (error) {
    console.error('Shortcut upload error:', error)
    return c.json({ error: 'Failed to process image' }, 500)
  }
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
