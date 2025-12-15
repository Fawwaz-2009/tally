import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Test database path - absolute paths for consistency
const testDataDir = path.join(__dirname, '.test-data')
const testDbPath = path.join(testDataDir, 'test.db')
const testBucketPath = path.join(testDataDir, 'bucket')

export default defineConfig({
  testDir: './src',
  testMatch: '**/-tests/**/*.spec.ts',
  fullyParallel: false, // Sequential for database consistency
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1, // Single worker for database consistency
  reporter: 'html',
  timeout: 30000,
  expect: { timeout: 10000 },

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: false, // Always start fresh for tests
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      E2E_TEST: '1',
      DATABASE_PATH: testDbPath,
      BUCKET_STORAGE_PATH: testBucketPath,
    },
  },
})
