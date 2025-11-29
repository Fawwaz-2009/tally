import { Hono } from 'hono'
import handler from '@tanstack/react-start/server-entry'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { getAuth } from '@repo/data-ops/lib'

import { trpcRouter } from './trpc/router/index'

// Use Cloudflare's generated Env type for bindings (includes DB: D1Database)
const app = new Hono<{ Bindings: Env }>()

// Better Auth routes
app.all('/api/auth/**', async (c) => {
  const auth = getAuth({ BETTER_AUTH_SECRET: c.env.BETTER_AUTH_SECRET })
  return auth.handler(c.req.raw)
})

// File serving endpoint for R2 bucket
app.get('/api/files/:key{.+}', async (c) => {
  const key = c.req.param('key')

  if (!key) {
    return c.notFound()
  }
  const object = await c.env.BUCKET.get(key)

  if (!object) {
    return c.notFound()
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('cache-control', 'public, max-age=31536000')

  return c.body(object.body, { headers })
})

app.all('/api/trpc', async (c) => {
  const auth = getAuth({ BETTER_AUTH_SECRET: c.env.BETTER_AUTH_SECRET })
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: c.req.raw,
    router: trpcRouter,
    createContext: () => ({ env: c.env, session: session ?? null }),
  })
})

app.all('/api/trpc/*', async (c) => {
  const auth = getAuth({ BETTER_AUTH_SECRET: c.env.BETTER_AUTH_SECRET })
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: c.req.raw,
    router: trpcRouter,
    createContext: () => ({ env: c.env, session: session ?? null }),
  })
})

app.all('*', async (c) => {
  // TanStack Start expects the env wrapped in a context object
  // c.env is now properly typed with our Cloudflare bindings (DB, etc.)
  return handler.fetch(c.req.raw, { context: { env: c.env } })
})

export default app
