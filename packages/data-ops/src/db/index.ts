import { drizzle, DrizzleD1Database } from "drizzle-orm/d1";

import * as appSchemas from "./schema";
import * as authSchemas from "./auth-schema";
export * from "./schema";
export * from "./auth-schema";

export const schema = {
  ...appSchemas,
  ...authSchemas,
};

// eslint-disable-next-line import/no-unused-modules
export type DrizzleDB = DrizzleD1Database<typeof schema>;

export function createDb(DB: D1Database) {
  return drizzle(DB, {
    schema: {
      ...schema,
    },
  });
}
