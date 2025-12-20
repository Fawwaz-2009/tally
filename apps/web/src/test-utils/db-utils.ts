/**
 * E2E Test Database Utilities
 *
 * Provides functions to reset and seed the test database between tests.
 * Uses Drizzle for type-safe database operations.
 */
import * as path from 'node:path'
import { eq } from 'drizzle-orm'
import { createDb, expensesTable, merchantsTable, settingsTable, usersTable } from '@repo/data-ops/db'

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
  db.delete(merchantsTable).run()
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
  userId: string
  amount: number
  currency: string
  merchantName: string
  imageKey: string
  baseAmount: number
  baseCurrency: string
  expenseDate: Date
  category?: string
}): Promise<void> {
  const db = getTestDb()

  // Create or get merchant
  const normalizedName = expense.merchantName.toLowerCase()
  const merchantId = crypto.randomUUID()

  db.insert(merchantsTable)
    .values({
      id: merchantId,
      name: normalizedName,
      displayName: expense.merchantName,
      category: expense.category ?? null,
    })
    .onConflictDoNothing()
    .run()

  // Get the merchant id (might already exist)
  const merchant = db.select({ id: merchantsTable.id })
    .from(merchantsTable)
    .where(eq(merchantsTable.name, normalizedName))
    .get()

  db.insert(expensesTable).values({
    userId: expense.userId,
    merchantId: merchant?.id ?? merchantId,
    imageKey: expense.imageKey,
    amount: expense.amount,
    currency: expense.currency,
    baseAmount: expense.baseAmount,
    baseCurrency: expense.baseCurrency,
    expenseDate: expense.expenseDate,
  }).run()
}
