import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
export * from "./auth-schema";

// Tally: Users table
export const usersTable = sqliteTable("users", {
  id: text("id").primaryKey(), // e.g., "john", "sarah", "household"
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

// Tally: Settings table (singleton row with explicit columns)
export const settingsTable = sqliteTable("settings", {
  id: integer("id").primaryKey().default(1), // Singleton - always id=1
  baseCurrency: text("base_currency").notNull().default("USD"),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

// Tally: Expense status
export const expenseStatus = [
  "submitted",
  "processing",
  "success",
  "needs-review",
] as const;
export type ExpenseStatus = (typeof expenseStatus)[number];

// Tally: Expenses table
export const expensesTable = sqliteTable("expenses", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  status: text("status", { enum: expenseStatus }).notNull().default("submitted"),

  // Extracted data
  amount: integer("amount"), // Store as cents/smallest unit to avoid floating point issues
  currency: text("currency"), // e.g., "USD", "EUR"
  baseAmount: integer("base_amount"), // Converted to base currency
  baseCurrency: text("base_currency"),
  merchant: text("merchant"),
  description: text("description"),
  categories: text("categories", { mode: "json" }).$type<string[]>(), // JSON array

  // Attribution
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id),

  // Source
  screenshotPath: text("screenshot_path"),

  // Error handling
  errorMessage: text("error_message"),

  // Timestamps
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  processedAt: integer("processed_at", { mode: "timestamp" }),
});

// Tally: Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  expenses: many(expensesTable),
}));

export const expensesRelations = relations(expensesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [expensesTable.userId],
    references: [usersTable.id],
  }),
}));
