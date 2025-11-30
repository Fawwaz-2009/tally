import { defineConfig } from "drizzle-kit";
import { resolve } from "path";

// Default path to the local SQLite database
const dbPath = process.env.DATABASE_PATH || resolve(process.cwd(), "../../apps/web/data/app.db");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: `file:${dbPath}`,
  },
  verbose: true,
  strict: true,
});
