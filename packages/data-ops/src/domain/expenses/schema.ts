/**
 * Expense domain schemas - always-valid discriminated union model.
 * Uses Effect Schema for runtime validation and type narrowing.
 */
import { Schema } from "effect";
import {
  expensesTable,
  expenseState,
  type ExpenseState,
  type ExtractionMetadata,
} from "../../db/schema";

// Re-export domain types
export { expenseState, type ExpenseState, type ExtractionMetadata };

// ============================================================================
// Drizzle Inferred Types (source of truth for persistence)
// ============================================================================

export type ExpenseRow = typeof expensesTable.$inferSelect;
export type ExpenseInsert = typeof expensesTable.$inferInsert;

// ============================================================================
// Effect Schemas for Discriminated Union
// ============================================================================

/**
 * Schema for extraction metadata (stored as JSON in DB)
 */
export const ExtractionMetadataSchema = Schema.Struct({
  ocrText: Schema.NullOr(Schema.String),
  error: Schema.NullOr(Schema.String),
  timing: Schema.NullOr(
    Schema.Struct({
      ocrMs: Schema.Number,
      llmMs: Schema.Number,
    })
  ),
});

/**
 * Categories field schema (array of strings)
 */
const CategoriesSchema = Schema.mutable(Schema.Array(Schema.String));

/**
 * Pending: receipt captured, extraction not yet applied.
 * Minimal data - just identity and receipt info.
 */
export const PendingExpenseSchema = Schema.Struct({
  state: Schema.Literal("pending"),
  id: Schema.String,
  userId: Schema.String,
  imageKey: Schema.NullOr(Schema.String),
  capturedAt: Schema.DateFromSelf,
  createdAt: Schema.DateFromSelf,
});

/**
 * PendingReview: extraction applied, needs user review.
 * All expense fields nullable - filled by extraction or user.
 */
export const PendingReviewExpenseSchema = Schema.Struct({
  state: Schema.Literal("pending-review"),
  id: Schema.String,
  userId: Schema.String,
  imageKey: Schema.NullOr(Schema.String),
  capturedAt: Schema.DateFromSelf,
  createdAt: Schema.DateFromSelf,
  // Expense data - nullable, filled by extraction or user
  amount: Schema.NullOr(Schema.Number),
  currency: Schema.NullOr(Schema.String),
  merchant: Schema.NullOr(Schema.String),
  description: Schema.NullOr(Schema.String),
  categories: CategoriesSchema,
  expenseDate: Schema.NullOr(Schema.DateFromSelf),
  // Extraction results for display during review
  extractionMetadata: Schema.NullOr(ExtractionMetadataSchema),
});

/**
 * Confirmed: all required fields present, finalized.
 * Required fields enforced by type - no nulls for core data.
 */
export const ConfirmedExpenseSchema = Schema.Struct({
  state: Schema.Literal("confirmed"),
  id: Schema.String,
  userId: Schema.String,
  imageKey: Schema.NullOr(Schema.String),
  capturedAt: Schema.DateFromSelf,
  createdAt: Schema.DateFromSelf,
  confirmedAt: Schema.DateFromSelf,
  // Required expense data - NOT nullable
  amount: Schema.Number,
  currency: Schema.String,
  baseAmount: Schema.Number,
  baseCurrency: Schema.String,
  merchant: Schema.String,
  // Optional fields
  description: Schema.NullOr(Schema.String),
  categories: CategoriesSchema,
  expenseDate: Schema.DateFromSelf,
  extractionMetadata: Schema.NullOr(ExtractionMetadataSchema),
});

/**
 * Discriminated union of all expense states.
 */
export const ExpenseSchema = Schema.Union(
  PendingExpenseSchema,
  PendingReviewExpenseSchema,
  ConfirmedExpenseSchema
);

// ============================================================================
// TypeScript Types (inferred from Effect Schema)
// ============================================================================

export type PendingExpense = Schema.Schema.Type<typeof PendingExpenseSchema>;
export type PendingReviewExpense = Schema.Schema.Type<typeof PendingReviewExpenseSchema>;
export type ConfirmedExpense = Schema.Schema.Type<typeof ConfirmedExpenseSchema>;
export type Expense = Schema.Schema.Type<typeof ExpenseSchema>;

