import { defineConfig } from "drizzle-kit";
import { readdirSync } from "fs";
import { resolve } from "path";

// Find the local Wrangler D1 SQLite database
function findLocalD1Database(): string {
  // Relative path from this config file to the Wrangler D1 directory
  const wranglerD1Dir = resolve(process.cwd(), "../../apps/web/.wrangler/state/v3/d1/miniflare-D1DatabaseObject");

  try {
    const files = readdirSync(wranglerD1Dir);
    const sqliteFile = files.find((f) => f.endsWith(".sqlite"));

    if (!sqliteFile) {
      throw new Error("No .sqlite file found. Run 'pnpm dev' in apps/web first to create the local database.");
    }

    // Return absolute path for drizzle-kit
    return `file:${resolve(wranglerD1Dir, sqliteFile)}`;
  } catch (error) {
    throw new Error(`Could not find local D1 database at ${wranglerD1Dir}. Run 'pnpm dev' in apps/web first. Error: ${error}`);
  }
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: findLocalD1Database(),
  },
  verbose: true,
  strict: true,
});
