import { Effect } from 'effect'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as crypto from 'node:crypto'

// Session data stored in memory
export interface ShortcutSession {
  sessionId: string
  imageKey: string
  contentType: string
  createdAt: number
}

// Session TTL: 10 minutes
const SESSION_TTL_MS = 10 * 60 * 1000

// In-memory session storage (module-level singleton)
const sessions = new Map<string, ShortcutSession>()

// Track if cleanup interval is started
let cleanupStarted = false

/**
 * Start the session cleanup interval.
 * Should be called once at server startup.
 */
export function startSessionCleanup(bucketPath: string) {
  if (cleanupStarted) return
  cleanupStarted = true

  setInterval(() => {
    const now = Date.now()
    for (const [sessionId, session] of sessions.entries()) {
      if (now - session.createdAt > SESSION_TTL_MS) {
        // Clean up the temporary file
        const filePath = path.join(bucketPath, session.imageKey)
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
        sessions.delete(sessionId)
      }
    }
  }, 60 * 1000) // Check every minute
}

// Response types for the service
export interface SessionInfo {
  sessionId: string
  imageUrl: string
  contentType: string
  createdAt: number
  expiresIn: number
}

export interface CreateSessionResult {
  sessionId: string
  imageKey: string
}

export class ShortcutSessionService extends Effect.Service<ShortcutSessionService>()(
  'ShortcutSessionService',
  {
    effect: Effect.gen(function* () {
      return {
        /**
         * Create a new session with the given image key.
         * Called from the Hono upload endpoint.
         */
        createSession: Effect.fn('shortcutSession.createSession')(function* (params: {
          imageKey: string
          contentType: string
        }) {
          const sessionId = crypto.randomUUID()
          const session: ShortcutSession = {
            sessionId,
            imageKey: params.imageKey,
            contentType: params.contentType,
            createdAt: Date.now(),
          }
          sessions.set(sessionId, session)
          return { sessionId, imageKey: params.imageKey } satisfies CreateSessionResult
        }),

        /**
         * Get a session by ID.
         * Returns null if session doesn't exist or is expired.
         */
        getSession: Effect.fn('shortcutSession.getSession')(function* (sessionId: string) {
          const session = sessions.get(sessionId)
          if (!session) return null

          const now = Date.now()
          const age = now - session.createdAt

          // Check if expired
          if (age > SESSION_TTL_MS) {
            sessions.delete(sessionId)
            return null
          }

          return {
            sessionId: session.sessionId,
            imageUrl: `/api/files/${session.imageKey}`,
            contentType: session.contentType,
            createdAt: session.createdAt,
            expiresIn: Math.max(0, SESSION_TTL_MS - age),
          } satisfies SessionInfo
        }),

        /**
         * List all pending (non-expired) sessions.
         * Sorted by creation time, newest first.
         */
        listSessions: Effect.fn('shortcutSession.listSessions')(function* () {
          const now = Date.now()
          const result: SessionInfo[] = []

          for (const [, session] of sessions.entries()) {
            const age = now - session.createdAt
            if (age > SESSION_TTL_MS) continue

            result.push({
              sessionId: session.sessionId,
              imageUrl: `/api/files/${session.imageKey}`,
              contentType: session.contentType,
              createdAt: session.createdAt,
              expiresIn: Math.max(0, SESSION_TTL_MS - age),
            })
          }

          // Sort by creation time, newest first
          result.sort((a, b) => b.createdAt - a.createdAt)
          return result
        }),

        /**
         * Delete a session (discard without completing).
         * Also cleans up the associated image file.
         */
        deleteSession: Effect.fn('shortcutSession.deleteSession')(function* (
          sessionId: string,
          bucketPath: string,
        ) {
          const session = sessions.get(sessionId)
          if (!session) return false

          // Clean up the temporary file
          const filePath = path.join(bucketPath, session.imageKey)
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

          sessions.delete(sessionId)
          return true
        }),

        /**
         * Mark a session as complete (after expense is created).
         * Same as delete - cleans up the session and image.
         */
        completeSession: Effect.fn('shortcutSession.completeSession')(function* (
          sessionId: string,
          bucketPath: string,
        ) {
          const session = sessions.get(sessionId)
          if (!session) return false

          // Clean up the temporary file
          const filePath = path.join(bucketPath, session.imageKey)
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

          sessions.delete(sessionId)
          return true
        }),
      } as const
    }),
    accessors: true,
  },
) {}
