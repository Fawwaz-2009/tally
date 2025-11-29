import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config();

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.STAGING_CLOUDFLARE_D1_DB!,
    token: process.env.CLOUDFLARE_D1_TOKEN!,
  },
  verbose: true,
  strict: true,
});