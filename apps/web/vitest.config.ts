import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    viteTsConfigPaths({
      projects: [path.join(dirname, 'tsconfig.json')],
    }),
    tailwindcss(),
  ],
  define: {
    // Polyfill process.env for browser environment
    'process.env': JSON.stringify({
      NODE_ENV: 'test',
      DATABASE_PATH: '/tmp/test.db',
      BUCKET_STORAGE_PATH: '/tmp/buckets',
      BASE_FRONTEND_URL: 'http://localhost:3000',
      OLLAMA_HOST: 'http://localhost:11434',
      OLLAMA_MODEL: 'llava:13b',
    }),
  },
  test: {
    projects: [
      {
        extends: true,
        plugins: [
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
            // Run all stories (not just those with 'test' tag)
            tags: { include: [], exclude: [] },
          }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: 'playwright',
            instances: [{ browser: 'chromium' }],
          },
          setupFiles: ['.storybook/vitest.setup.ts'],
        },
      },
    ],
  },
})
