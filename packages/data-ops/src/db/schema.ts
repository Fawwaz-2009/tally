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

// Tally: Expense state (draft = being processed/reviewed, complete = finalized)
export const expenseState = ["draft", "complete"] as const;
export type ExpenseState = (typeof expenseState)[number];

// Tally: Extraction status (tracks the OCR/LLM pipeline progress)
export const extractionStatus = ["pending", "processing", "done", "failed"] as const;
export type ExtractionStatus = (typeof extractionStatus)[number];

// Tally: Expenses table (aggregate root with embedded Receipt and Extraction value objects)
export const expensesTable = sqliteTable("expenses", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id),
  state: text("state", { enum: expenseState }).notNull().default("draft"),

  // Receipt (embedded value object)
  receiptImageKey: text("receipt_image_key"),
  receiptCapturedAt: integer("receipt_captured_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),

  // Extraction (embedded value object)
  extractionStatus: text("extraction_status", { enum: extractionStatus })
    .notNull()
    .default("pending"),
  extractionOcrText: text("extraction_ocr_text"),
  extractionError: text("extraction_error"),
  extractionOcrMs: integer("extraction_ocr_ms"),
  extractionLlmMs: integer("extraction_llm_ms"),

  // Expense data (nullable in draft, required for complete)
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
  completedAt: integer("completed_at", { mode: "timestamp" }),
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
