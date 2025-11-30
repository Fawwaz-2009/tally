/**
 * Database migration script using Drizzle's built-in migrator
 *
 * This script runs on container startup to apply any pending migrations.
 * It uses Drizzle's standard migration tracking and transaction handling.
 */

import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as fs from 'node:fs';
import * as path from 'node:path';

const dbPath = process.env.DATABASE_PATH || '/app/data/app.db';
const migrationsFolder = process.env.MIGRATIONS_PATH || '/app/migrations';

console.log('[Migrate] Starting database migration...');
console.log(`[Migrate] Database: ${dbPath}`);
console.log(`[Migrate] Migrations: ${migrationsFolder}`);

// Ensure data directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`[Migrate] Created directory: ${dbDir}`);
}

// Check if migrations folder exists
if (!fs.existsSync(migrationsFolder)) {
  console.log('[Migrate] No migrations folder found. Skipping.');
  process.exit(0);
}

try {
  const sqlite = new Database(dbPath);
  const db = drizzle(sqlite);

  // Run migrations using Drizzle's built-in migrator
  migrate(db, { migrationsFolder });

  console.log('[Migrate] All migrations applied successfully!');
  sqlite.close();
} catch (error) {
  console.error('[Migrate] Migration failed:', error);
  process.exit(1);
}
