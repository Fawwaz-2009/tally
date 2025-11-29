import { env } from '@/env'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL:
    typeof window !== 'undefined'
      ? window.location.origin
      : env.VITE_BASE_FRONTEND_URL,
  basePath: '/api/auth',
})

export type Session = typeof authClient.$Infer.Session
export type User = (typeof authClient.$Infer.Session)['user']
