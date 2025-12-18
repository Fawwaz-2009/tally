/**
 * Playwright Test Fixtures for E2E Testing
 *
 * Simple approach:
 * - Reset test database before each test
 * - Server runs with E2E_TEST=1 (stubs Ollama extraction)
 * - No MSW, no client handlers, no bridge API
 */
import { test as base, expect } from '@playwright/test'
import { resetTestDatabase, seedExpense } from './db-utils'

// =============================================================================
// Fixtures
// =============================================================================

interface Fixtures {
  /** Reset database - runs automatically before each test */
  resetDb: void
  /** Seed an expense for testing */
  seedExpense: typeof seedExpense
}

export const test = base.extend<Fixtures>({
  // Auto-reset database before each test
  resetDb: [
    async (_, use) => {
      await resetTestDatabase()
      await use()
    },
    { auto: true },
  ],

  // Expose seedExpense helper for tests that need specific data
  seedExpense: async (_, use) => {
    await use(seedExpense)
  },
})

export { expect }
