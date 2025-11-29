import { betterAuth, InferUserFromClient, InferUser } from "better-auth";
import { DrizzleDB, schema } from "../db";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";
import { getDb } from "../layers";

const statement = {
  ...defaultStatements,
  project: ["create", "share", "update", "delete"],
} as const;

const ac = createAccessControl(statement);

const adminRole = ac.newRole({
  project: ["create", "update"],
  ...adminAc.statements,
});

// Workaround for better-auth type portability issue
// See: https://github.com/better-auth/better-auth/issues/2123
// We use 'as any as ReturnType<typeof betterAuth>' to tell TypeScript the type is fine
// while preserving full type inference for consumers
export const getAuth = ({ BETTER_AUTH_SECRET }: { BETTER_AUTH_SECRET: string }): ReturnType<typeof betterAuth> => {
  const db = getDb();
  return betterAuth({
    secret: BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
    },
    onAPIError: {
      throw: true,
      onError: (error, ctx) => {
        // Custom error handling
        console.error("Auth error:", error);
      },
    },
    plugins: [],
  });
};

// Export a type alias for consumers
export type Auth = ReturnType<typeof getAuth>;
