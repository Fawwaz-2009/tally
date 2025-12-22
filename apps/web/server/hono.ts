import * as fs from 'node:fs'
import * as path from 'node:path'
import * as crypto from 'node:crypto'
import { Hono } from 'hono'
import handler from '@tanstack/react-start/server-entry'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'

import { trpcRouter } from './trpc/router/index'
import { env } from '@/env'

// Export the env type for use in tRPC context
export type NodeEnv = typeof env

// Session storage for shortcut uploads (in-memory with TTL)
// In production, consider using Redis or a database
interface ShortcutSession {
  imageKey: string
  contentType: string
  createdAt: number
}

const shortcutSessions = new Map<string, ShortcutSession>()

// Clean up expired sessions (older than 10 minutes)
const SESSION_TTL_MS = 10 * 60 * 1000
setInterval(() => {
  const now = Date.now()
  for (const [sessionId, session] of shortcutSessions.entries()) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      // Also clean up the temporary file
      const filePath = path.join(env.BUCKET_STORAGE_PATH, session.imageKey)
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      } catch {
        // Ignore cleanup errors
      }
      shortcutSessions.delete(sessionId)
    }
  }
}, 60 * 1000) // Check every minute

const app = new Hono()

// Health check endpoint for Docker/Kubernetes
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// =============================================================================
// iOS Shortcut Integration Endpoints
// =============================================================================

/**
 * Upload endpoint for iOS Shortcuts.
 * Accepts an image and returns a session ID that can be used to open the PWA.
 *
 * iOS Shortcut Flow:
 * 1. User shares image → Shortcut receives it
 * 2. Shortcut POSTs image to this endpoint
 * 3. Server returns { sessionId, url }
 * 4. Shortcut opens the URL in Safari
 * 5. PWA loads with image pre-populated
 */
app.post('/api/shortcut/upload', async (c) => {
  try {
    const formData = await c.req.formData()
    const image = formData.get('image') as File | null

    if (!image) {
      return c.json({ error: 'No image provided' }, 400)
    }

    // Generate session ID and file key
    const sessionId = crypto.randomUUID()
    const extension = image.name.split('.').pop() || 'jpg'
    const imageKey = `shortcut-sessions/${sessionId}.${extension}`

    // Save the image temporarily
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
    fs.writeFileSync(metaPath, JSON.stringify({ contentType: image.type || 'image/jpeg' }))

    // Store session
    shortcutSessions.set(sessionId, {
      imageKey,
      contentType: image.type || 'image/jpeg',
      createdAt: Date.now(),
    })

    // Build the PWA URL
    const host = c.req.header('host') || 'localhost:3000'
    const protocol = c.req.header('x-forwarded-proto') || 'http'
    const pwaUrl = `${protocol}://${host}/quick-add?session=${sessionId}`

    return c.json({
      success: true,
      sessionId,
      url: pwaUrl,
    })
  } catch (error) {
    console.error('Shortcut upload error:', error)
    return c.json({ error: 'Failed to process image' }, 500)
  }
})

/**
 * Get session data for the PWA.
 * Returns the image URL and session metadata.
 */
app.get('/api/shortcut/session/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId')

  if (!sessionId) {
    return c.json({ error: 'Session ID required' }, 400)
  }

  const session = shortcutSessions.get(sessionId)

  if (!session) {
    return c.json({ error: 'Session not found or expired' }, 404)
  }

  // Check if session is expired
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    shortcutSessions.delete(sessionId)
    return c.json({ error: 'Session expired' }, 410)
  }

  return c.json({
    success: true,
    imageUrl: `/api/files/${session.imageKey}`,
    contentType: session.contentType,
    expiresIn: Math.max(0, SESSION_TTL_MS - (Date.now() - session.createdAt)),
  })
})

/**
 * List all pending sessions.
 * Used by PWA to check if there are sessions to process on app launch.
 * Returns sessions sorted by creation time (newest first).
 */
app.get('/api/shortcut/sessions', async (c) => {
  const now = Date.now()
  const sessions: Array<{
    sessionId: string
    imageUrl: string
    contentType: string
    createdAt: number
    expiresIn: number
  }> = []

  for (const [sessionId, session] of shortcutSessions.entries()) {
    // Skip expired sessions
    if (now - session.createdAt > SESSION_TTL_MS) {
      continue
    }

    sessions.push({
      sessionId,
      imageUrl: `/api/files/${session.imageKey}`,
      contentType: session.contentType,
      createdAt: session.createdAt,
      expiresIn: Math.max(0, SESSION_TTL_MS - (now - session.createdAt)),
    })
  }

  // Sort by creation time, newest first
  sessions.sort((a, b) => b.createdAt - a.createdAt)

  return c.json({
    success: true,
    sessions,
    count: sessions.length,
  })
})

/**
 * Delete/dismiss a session without completing it.
 * Used when user wants to cancel a pending quick-add.
 */
app.delete('/api/shortcut/session/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId')

  if (!sessionId) {
    return c.json({ error: 'Session ID required' }, 400)
  }

  const session = shortcutSessions.get(sessionId)

  if (!session) {
    return c.json({ error: 'Session not found' }, 404)
  }

  // Clean up the temporary file
  const filePath = path.join(env.BUCKET_STORAGE_PATH, session.imageKey)
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    const metaPath = `${filePath}.meta.json`
    if (fs.existsSync(metaPath)) {
      fs.unlinkSync(metaPath)
    }
  } catch {
    // Ignore cleanup errors
  }
  shortcutSessions.delete(sessionId)

  return c.json({ success: true })
})

/**
 * Mark session as used (after expense is created).
 * This allows early cleanup of the temporary image.
 */
app.post('/api/shortcut/session/:sessionId/complete', async (c) => {
  const sessionId = c.req.param('sessionId')

  if (!sessionId) {
    return c.json({ error: 'Session ID required' }, 400)
  }

  const session = shortcutSessions.get(sessionId)

  if (session) {
    // Clean up the temporary file
    const filePath = path.join(env.BUCKET_STORAGE_PATH, session.imageKey)
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
      const metaPath = `${filePath}.meta.json`
      if (fs.existsSync(metaPath)) {
        fs.unlinkSync(metaPath)
      }
    } catch {
      // Ignore cleanup errors
    }
    shortcutSessions.delete(sessionId)
  }

  return c.json({ success: true })
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
