import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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

// Tally: Expense state (lifecycle phases)
// - pending: receipt captured, extraction not yet applied
// - pending-review: extraction applied, needs user review
// - confirmed: all required fields present, finalized
export const expenseState = ["pending", "pending-review", "confirmed"] as const;
export type ExpenseState = (typeof expenseState)[number];

// Extraction metadata (stored as JSON, available on pending-review and confirmed)
export interface ExtractionMetadata {
  ocrText: string | null;
  error: string | null;
  timing: { ocrMs: number; llmMs: number } | null;
}

// Tally: Expenses table (discriminated union based on state)
export const expensesTable = sqliteTable("expenses", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id),
  state: text("state", { enum: expenseState }).notNull().default("pending"),

  // Receipt data
  imageKey: text("image_key"),
  capturedAt: integer("captured_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),

  // Extraction metadata (JSON, available after extraction)
  extractionMetadata: text("extraction_metadata", { mode: "json" }).$type<ExtractionMetadata | null>(),

  // Expense data (nullable in pending/pending-review, required for confirmed)
  amount: integer("amount"), // Store as cents/smallest unit
  currency: text("currency"), // e.g., "USD", "EUR"
  baseAmount: integer("base_amount"), // Converted to base currency
  baseCurrency: text("base_currency"),
  merchant: text("merchant"),
  description: text("description"),
  categories: text("categories", { mode: "json" }).$type<string[]>(),
  expenseDate: integer("expense_date", { mode: "timestamp" }),

  // Timestamps
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  confirmedAt: integer("confirmed_at", { mode: "timestamp" }),
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
