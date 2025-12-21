#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read configuration
const configPath = path.join(__dirname, '..', '.config.json');
if (!fs.existsSync(configPath)) {
  console.error(JSON.stringify({
    error: 'Skill not configured. Run setup first.',
    code: 'NOT_CONFIGURED'
  }));
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Get SQL query from command line
const query = process.argv[2];
if (!query) {
  console.error(JSON.stringify({
    error: 'No query provided. Usage: node query.js "SELECT * FROM table"',
    code: 'NO_QUERY'
  }));
  process.exit(1);
}

// Check read-only mode
if (config.readOnly) {
  const writeOperations = [
    'INSERT', 'UPDATE', 'DELETE', 'DROP',
    'ALTER', 'TRUNCATE', 'CREATE', 'REPLACE'
  ];

  const upperQuery = query.toUpperCase().trim();
  const isWriteOperation = writeOperations.some(op =>
    upperQuery.startsWith(op) || upperQuery.includes(` ${op} `)
  );

  if (isWriteOperation) {
    console.error(JSON.stringify({
      error: 'Write operations are blocked in read-only mode',
      code: 'READ_ONLY_VIOLATION',
      query: query
    }));
    process.exit(1);
  }
}

// Resolve drizzle config path (relative to project root, which is 4 levels up from scripts/)
// scripts/ -> drizzle-db/ -> skills/ -> .claude/ -> project root
const projectRoot = path.resolve(__dirname, '../../../..');
const drizzleConfigPath = path.resolve(projectRoot, config.drizzleConfigPath);

if (!fs.existsSync(drizzleConfigPath)) {
  console.error(JSON.stringify({
    error: `Drizzle config not found at ${drizzleConfigPath}`,
    code: 'CONFIG_NOT_FOUND',
    configPath: config.drizzleConfigPath
  }));
  process.exit(1);
}

// Load drizzle config using tsx (handles TypeScript)
async function loadDrizzleConfig(configPath) {
  try {
    // Use tsx to load the TypeScript config
    // tsx must be installed in the project: npm install -D tsx
    const { register } = require('tsx/cjs/api');
    const tsxCleanup = register();

    // Change to the config's directory before loading
    // This ensures process.cwd() resolves correctly in the config
    const originalCwd = process.cwd();
    const configDir = path.dirname(configPath);
    process.chdir(configDir);

    const drizzleConfig = require(configPath);
    const config = drizzleConfig.default || drizzleConfig;

    // Restore original directory
    process.chdir(originalCwd);

    tsxCleanup();
    return config;
  } catch (err) {
    // Provide helpful error message if tsx is not installed
    if (err.code === 'MODULE_NOT_FOUND' && err.message.includes('tsx')) {
      console.error(JSON.stringify({
        error: 'tsx is required to load TypeScript configs. Install it: npm install -D tsx',
        code: 'TSX_NOT_FOUND'
      }));
    } else {
      console.error(JSON.stringify({
        error: `Failed to load drizzle config: ${err.message}`,
        code: 'CONFIG_LOAD_FAILED',
        stack: err.stack
      }));
    }
    process.exit(1);
  }
}

async function executeQuery() {
  try {
    // Load drizzle config
    const drizzleConfig = await loadDrizzleConfig(drizzleConfigPath);

    const driver = drizzleConfig.driver || drizzleConfig.dialect;
    const dbCredentials = drizzleConfig.dbCredentials || {};

    let db;

    let sqliteConnection;
    if (driver === 'better-sqlite3' || driver === 'sqlite') {
      // SQLite
      const { drizzle } = await import('drizzle-orm/better-sqlite3');
      const Database = (await import('better-sqlite3')).default;

      let dbPath = dbCredentials.url || dbCredentials.database;
      // Strip file: prefix if present
      dbPath = dbPath.replace(/^file:/, '');
      // If absolute path, use as-is; if relative, resolve from project root
      dbPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(projectRoot, dbPath);

      sqliteConnection = new Database(dbPath);
      db = drizzle(sqliteConnection);

    } else if (driver === 'pg' || driver === 'postgres-js') {
      // PostgreSQL
      const { drizzle } = await import('drizzle-orm/postgres-js');
      const postgres = (await import('postgres')).default;

      const sql = postgres(dbCredentials.connectionString || {
        host: dbCredentials.host,
        port: dbCredentials.port,
        database: dbCredentials.database,
        username: dbCredentials.user || dbCredentials.username,
        password: dbCredentials.password,
      });

      db = drizzle(sql);

    } else if (driver === 'mysql2' || driver === 'mysql') {
      // MySQL
      const { drizzle } = await import('drizzle-orm/mysql2');
      const mysql = await import('mysql2/promise');

      const connection = await mysql.createConnection({
        host: dbCredentials.host,
        port: dbCredentials.port,
        database: dbCredentials.database,
        user: dbCredentials.user || dbCredentials.username,
        password: dbCredentials.password,
      });

      db = drizzle(connection);

    } else {
      throw new Error(`Unsupported driver: ${driver}`);
    }

    // Execute query
    let result;
    if (driver === 'better-sqlite3' || driver === 'sqlite') {
      // Use raw better-sqlite3 for SQL queries
      const stmt = sqliteConnection.prepare(query);
      result = stmt.all();
    } else {
      // For PostgreSQL/MySQL, use Drizzle's execute
      const execResult = await db.execute(query);
      result = execResult.rows || execResult;
    }

    console.log(JSON.stringify({
      success: true,
      rows: result,
      rowCount: result.length,
      query: query
    }, null, 2));

  } catch (err) {
    console.error(JSON.stringify({
      error: err.message,
      code: 'QUERY_FAILED',
      query: query,
      stack: err.stack
    }));
    process.exit(1);
  }
}

// Set timeout
const timeout = setTimeout(() => {
  console.error(JSON.stringify({
    error: 'Query timeout (30s)',
    code: 'TIMEOUT',
    query: query
  }));
  process.exit(1);
}, 30000);

executeQuery()
  .then(() => {
    clearTimeout(timeout);
    process.exit(0);
  })
  .catch((err) => {
    clearTimeout(timeout);
    console.error(JSON.stringify({
      error: err.message,
      code: 'EXECUTION_FAILED',
      stack: err.stack
    }));
    process.exit(1);
  });
