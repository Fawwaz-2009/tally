/**
 * Playwright Global Setup
 *
 * Runs once before all tests to set up the test database.
 * Uses drizzle-kit push to create the schema (same as dev workflow).
 */
import { execSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import Database from 'better-sqlite3'

const testDataDir = path.join(process.cwd(), '.test-data')
const testDbPath = path.join(testDataDir, 'test.db')
const testBucketPath = path.join(testDataDir, 'bucket')

export default async function globalSetup() {
  console.log('[Global Setup] Setting up test database...')

  // Ensure test directories exist
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true })
  }
  if (!fs.existsSync(testBucketPath)) {
    fs.mkdirSync(testBucketPath, { recursive: true })
  }

  // Remove existing test database to start fresh
  if (fs.existsSync(testDbPath)) {
    console.log('[Global Setup] Removing existing test database...')
    fs.unlinkSync(testDbPath)
    // Also clean up WAL files if they exist
    const walPath = `${testDbPath}-wal`
    const shmPath = `${testDbPath}-shm`
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath)
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath)
  }

  // Push Drizzle schema to test database
  // --force auto-approves the schema changes (no interactive prompt)
  console.log('[Global Setup] Pushing Drizzle schema to test database...')
  try {
    execSync('npx drizzle-kit push --force', {
      cwd: path.join(process.cwd(), '../../packages/data-ops'),
      env: {
        ...process.env,
        DATABASE_PATH: testDbPath,
      },
      stdio: 'inherit',
    })
  } catch (error) {
    console.error('[Global Setup] Failed to push database schema:', error)
    throw error
  }

  // Seed default data
  console.log('[Global Setup] Seeding default data...')
  const db = new Database(testDbPath)
  try {
    db.exec(`
      INSERT INTO users (id, name, created_at)
      VALUES ('user-1', 'Test User', unixepoch());

      INSERT INTO settings (id, base_currency, updated_at)
      VALUES (1, 'USD', unixepoch());
    `)
  } finally {
    db.close()
  }

  console.log('[Global Setup] Test database ready!')
}
