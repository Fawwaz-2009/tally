import { drizzle as drizzleBetterSqlite, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";

import * as appSchemas from "./schema";
import * as authSchemas from "./auth-schema";
export * from "./schema";
export * from "./auth-schema";

export const schema = {
  ...appSchemas,
  ...authSchemas,
};

// eslint-disable-next-line import/no-unused-modules
export type DrizzleDB = BetterSQLite3Database<typeof schema>;

export function createDb(dbPath: string) {
  const sqlite = new Database(dbPath);
  return drizzleBetterSqlite(sqlite, {
    schema: {
      ...schema,
    },
  });
}
