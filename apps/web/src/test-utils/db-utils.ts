/**
 * E2E Test Database Utilities
 *
 * Provides functions to reset and seed the test database between tests.
 * Uses Drizzle for type-safe database operations.
 */
import * as path from 'node:path'
import { createDb, expensesTable, settingsTable, usersTable } from '@repo/data-ops/db'

// Test database path - must match playwright.config.ts
const TEST_DB_DIR = path.join(process.cwd(), '.test-data')
const TEST_DB_PATH = path.join(TEST_DB_DIR, 'test.db')

/**
 * Get a Drizzle client for the test database
 */
function getTestDb() {
  return createDb(TEST_DB_PATH)
}

/**
 * Reset the test database to a clean state
 * Deletes all data and re-seeds defaults
 */
export async function resetTestDatabase(): Promise<void> {
  const db = getTestDb()

  // Clear all tables (order matters due to foreign keys)
  db.delete(expensesTable).run()
  db.delete(usersTable).run()
  db.delete(settingsTable).run()

  // Seed default user
  db.insert(usersTable).values({
    id: 'user-1',
    name: 'Test User',
  }).run()

  // Seed default settings
  db.insert(settingsTable).values({
    id: 1,
    baseCurrency: 'USD',
  }).run()
}

/**
 * Seed a specific expense for testing
 */
export async function seedExpense(expense: {
  id: string
  userId: string
  state: 'pending' | 'pending-review' | 'confirmed'
  amount?: number
  currency?: string
  merchant?: string
}): Promise<void> {
  const db = getTestDb()

  db.insert(expensesTable).values({
    id: expense.id,
    userId: expense.userId,
    state: expense.state,
    amount: expense.amount ?? null,
    currency: expense.currency ?? null,
    merchant: expense.merchant ?? null,
  }).run()
}
