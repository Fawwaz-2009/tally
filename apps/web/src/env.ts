import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'production', 'test']),
    DATABASE_PATH: z.string().min(1),
    BUCKET_STORAGE_PATH: z.string().min(1),
    BASE_FRONTEND_URL: z.string().url(),
    OLLAMA_HOST: z.string().url(),
    OLLAMA_MODEL: z.string().min(1),
  },

  /**
   * The prefix that client-side variables must have. This is enforced both at
   * a type-level and at runtime.
   */
  clientPrefix: 'VITE_',

  client: {
    VITE_APP_TITLE: z.string().min(1).optional(),
    VITE_BASE_FRONTEND_URL: z.string().url().optional(),
  },

  /**
   * What object holds the environment variables at runtime.
   * Server variables use process.env, client variables use import.meta.env
   */
  runtimeEnv: {
    // Server variables (from process.env)
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_PATH: process.env.DATABASE_PATH,
    BUCKET_STORAGE_PATH: process.env.BUCKET_STORAGE_PATH,
    BASE_FRONTEND_URL: process.env.BASE_FRONTEND_URL,
    OLLAMA_HOST: process.env.OLLAMA_HOST,
    OLLAMA_MODEL: process.env.OLLAMA_MODEL,
    // Client variables (from import.meta.env)
    VITE_APP_TITLE: import.meta.env.VITE_APP_TITLE,
    VITE_BASE_FRONTEND_URL: import.meta.env.VITE_BASE_FRONTEND_URL,
  },

  emptyStringAsUndefined: true,

  /**
   * Skip validation in client-side code where server env vars aren't available
   */
  skipValidation: typeof window !== 'undefined',
})
