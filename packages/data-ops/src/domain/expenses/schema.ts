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

// ============================================================================
// Type Guards
// ============================================================================

export const isPending = (expense: Expense): expense is PendingExpense =>
  expense.state === "pending";

export const isPendingReview = (expense: Expense): expense is PendingReviewExpense =>
  expense.state === "pending-review";

export const isConfirmed = (expense: Expense): expense is ConfirmedExpense =>
  expense.state === "confirmed";

// ============================================================================
// Persistence Mapping
// ============================================================================

/**
 * Parse a database row into the appropriate expense variant.
 * Validates and narrows the type based on the state discriminator.
 */
export const fromRow = (row: ExpenseRow): Expense => {
  switch (row.state) {
    case "pending":
      return {
        state: "pending",
        id: row.id,
        userId: row.userId,
        imageKey: row.imageKey,
        capturedAt: row.capturedAt,
        createdAt: row.createdAt,
      };

    case "pending-review":
      return {
        state: "pending-review",
        id: row.id,
        userId: row.userId,
        imageKey: row.imageKey,
        capturedAt: row.capturedAt,
        createdAt: row.createdAt,
        amount: row.amount,
        currency: row.currency,
        merchant: row.merchant,
        description: row.description,
        categories: row.categories ?? [],
        expenseDate: row.expenseDate,
        extractionMetadata: row.extractionMetadata,
      };

    case "confirmed":
      // Confirmed expenses must have all required fields
      if (
        row.amount === null ||
        row.currency === null ||
        row.baseAmount === null ||
        row.baseCurrency === null ||
        row.merchant === null ||
        row.confirmedAt === null ||
        row.expenseDate === null
      ) {
        throw new Error(
          `Confirmed expense ${row.id} is missing required fields`
        );
      }
      return {
        state: "confirmed",
        id: row.id,
        userId: row.userId,
        imageKey: row.imageKey,
        capturedAt: row.capturedAt,
        createdAt: row.createdAt,
        confirmedAt: row.confirmedAt,
        amount: row.amount,
        currency: row.currency,
        baseAmount: row.baseAmount,
        baseCurrency: row.baseCurrency,
        merchant: row.merchant,
        description: row.description,
        categories: row.categories ?? [],
        expenseDate: row.expenseDate,
        extractionMetadata: row.extractionMetadata,
      };
  }
};

/**
 * Convert an expense variant to a database row for persistence.
 */
export const toRow = (expense: Expense): ExpenseInsert => {
  switch (expense.state) {
    case "pending":
      return {
        id: expense.id,
        userId: expense.userId,
        state: "pending",
        imageKey: expense.imageKey,
        capturedAt: expense.capturedAt,
        createdAt: expense.createdAt,
        extractionMetadata: null,
        amount: null,
        currency: null,
        baseAmount: null,
        baseCurrency: null,
        merchant: null,
        description: null,
        categories: [],
        expenseDate: null,
        confirmedAt: null,
      };

    case "pending-review":
      return {
        id: expense.id,
        userId: expense.userId,
        state: "pending-review",
        imageKey: expense.imageKey,
        capturedAt: expense.capturedAt,
        createdAt: expense.createdAt,
        extractionMetadata: expense.extractionMetadata,
        amount: expense.amount,
        currency: expense.currency,
        baseAmount: null,
        baseCurrency: null,
        merchant: expense.merchant,
        description: expense.description,
        categories: expense.categories,
        expenseDate: expense.expenseDate,
        confirmedAt: null,
      };

    case "confirmed":
      return {
        id: expense.id,
        userId: expense.userId,
        state: "confirmed",
        imageKey: expense.imageKey,
        capturedAt: expense.capturedAt,
        createdAt: expense.createdAt,
        confirmedAt: expense.confirmedAt,
        extractionMetadata: expense.extractionMetadata,
        amount: expense.amount,
        currency: expense.currency,
        baseAmount: expense.baseAmount,
        baseCurrency: expense.baseCurrency,
        merchant: expense.merchant,
        description: expense.description,
        categories: expense.categories,
        expenseDate: expense.expenseDate,
      };
  }
};

// ============================================================================
// Pure Transition Functions
// ============================================================================

/**
 * Create a new pending expense from a receipt capture.
 */
export const createPending = (params: {
  userId: string;
  imageKey?: string | null;
}): PendingExpense => ({
  state: "pending",
  id: crypto.randomUUID(),
  userId: params.userId,
  imageKey: params.imageKey ?? null,
  capturedAt: new Date(),
  createdAt: new Date(),
});

/**
 * Apply extraction results to a pending expense.
 * Transitions: pending → pending-review
 */
export const applyExtraction = (
  expense: PendingExpense,
  data: {
    amount?: number | null;
    currency?: string | null;
    merchant?: string | null;
    categories?: string[] | null;
    expenseDate?: Date | null;
    extractionMetadata: ExtractionMetadata | null;
  }
): PendingReviewExpense => ({
  state: "pending-review",
  id: expense.id,
  userId: expense.userId,
  imageKey: expense.imageKey,
  capturedAt: expense.capturedAt,
  createdAt: expense.createdAt,
  amount: data.amount ?? null,
  currency: data.currency ?? null,
  merchant: data.merchant ?? null,
  description: null,
  categories: data.categories ?? [],
  expenseDate: data.expenseDate ?? null,
  extractionMetadata: data.extractionMetadata,
});

/**
 * Input for confirming an expense.
 */
export interface ConfirmInput {
  amount: number;
  currency: string;
  baseAmount: number;
  baseCurrency: string;
  merchant: string;
  description?: string | null;
  categories?: string[];
  expenseDate: Date;
}

/**
 * Confirm a pending-review expense.
 * Transitions: pending-review → confirmed
 * All required fields must be provided.
 */
export const confirm = (
  expense: PendingReviewExpense,
  input: ConfirmInput
): ConfirmedExpense => ({
  state: "confirmed",
  id: expense.id,
  userId: expense.userId,
  imageKey: expense.imageKey,
  capturedAt: expense.capturedAt,
  createdAt: expense.createdAt,
  confirmedAt: new Date(),
  amount: input.amount,
  currency: input.currency,
  baseAmount: input.baseAmount,
  baseCurrency: input.baseCurrency,
  merchant: input.merchant,
  description: input.description ?? null,
  categories: input.categories ?? expense.categories,
  expenseDate: input.expenseDate,
  extractionMetadata: expense.extractionMetadata,
});

/**
 * Input for updating a pending-review expense.
 */
export interface UpdateInput {
  amount?: number | null;
  currency?: string | null;
  merchant?: string | null;
  description?: string | null;
  categories?: string[];
  expenseDate?: Date | null;
}

/**
 * Update a pending-review expense.
 * Only pending-review expenses can be updated.
 */
export const update = (
  expense: PendingReviewExpense,
  changes: UpdateInput
): PendingReviewExpense => ({
  ...expense,
  amount: changes.amount !== undefined ? changes.amount : expense.amount,
  currency: changes.currency !== undefined ? changes.currency : expense.currency,
  merchant: changes.merchant !== undefined ? changes.merchant : expense.merchant,
  description: changes.description !== undefined ? changes.description : expense.description,
  categories: changes.categories !== undefined ? changes.categories : expense.categories,
  expenseDate: changes.expenseDate !== undefined ? changes.expenseDate : expense.expenseDate,
});

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * Get list of missing required fields for confirmation.
 */
export const getMissingFields = (
  expense: PendingReviewExpense
): ("amount" | "currency" | "merchant" | "expenseDate")[] => {
  const missing: ("amount" | "currency" | "merchant" | "expenseDate")[] = [];
  if (expense.amount === null) missing.push("amount");
  if (expense.currency === null) missing.push("currency");
  if (expense.merchant === null) missing.push("merchant");
  if (expense.expenseDate === null) missing.push("expenseDate");
  return missing;
};

/**
 * Check if a pending-review expense has all required fields for confirmation.
 */
export const canConfirm = (expense: PendingReviewExpense): boolean =>
  getMissingFields(expense).length === 0;

/**
 * Get display amount (prefer base currency conversion).
 */
export const getDisplayAmount = (expense: Expense): number | null => {
  if (isConfirmed(expense)) {
    return expense.baseAmount;
  }
  if (isPendingReview(expense)) {
    return expense.amount;
  }
  return null;
};

/**
 * Get display date (expense date or captured date).
 */
export const getDisplayDate = (expense: Expense): Date => {
  if (isConfirmed(expense)) {
    return expense.expenseDate;
  }
  if (isPendingReview(expense) && expense.expenseDate) {
    return expense.expenseDate;
  }
  return expense.capturedAt;
};
