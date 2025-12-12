/**
 * Data Transfer Objects for Expense operations.
 * These represent API inputs/outputs, not the core domain model.
 */
import { Schema } from "effect";
import {
  type PendingReviewExpense,
  type ConfirmedExpense,
  PendingReviewExpenseSchema,
  ConfirmedExpenseSchema,
} from "./schema";

// ============================================================================
// Operation Inputs
// ============================================================================

/**
 * Input for capturing a new expense from a receipt image.
 * Note: Keep as interface since File type differs between browser/Node.js
 */
export interface CaptureExpenseInput {
  userId: string;
  image: File;
}

/**
 * Confirm expense operation - transitions pending-review to confirmed state.
 * All required fields must be provided or already exist on the expense.
 */
export const ConfirmExpensePayload = PendingReviewExpenseSchema.pick("id", "amount", "currency", "merchant", "description", "categories", "expenseDate")
export type ConfirmExpenseInput = Schema.Schema.Type<typeof ConfirmExpensePayload>;

/**
 * Update expense operation - modifies a pending-review expense.
 * Derives from PendingReviewExpenseSchema with all fields optional except id.
 */
export const UpdateExpensePayload = PendingReviewExpenseSchema
  .pick("amount", "currency", "merchant", "description", "categories", "expenseDate")
  .pipe(Schema.partial)
  .pipe(Schema.extend(Schema.Struct({ id: Schema.String })));
export type UpdateExpenseInput = Schema.Schema.Type<typeof UpdateExpensePayload>;

// ============================================================================
// Operation Results
// ============================================================================

/**
 * Result of expense capture operation.
 * Returns either a PendingReviewExpense or ConfirmedExpense depending on
 * whether extraction was successful and auto-complete conditions were met.
 */
export const CaptureExpenseResultSchema = Schema.Struct({
  expense: Schema.Union(PendingReviewExpenseSchema, ConfirmedExpenseSchema),
  extraction: Schema.Struct({
    success: Schema.Boolean,
    data: Schema.NullOr(
      Schema.Struct({
        amount: Schema.NullOr(Schema.Number),
        currency: Schema.NullOr(Schema.String),
        merchant: Schema.NullOr(Schema.String),
        date: Schema.NullOr(Schema.String), // ISO date string
        categories: Schema.Array(Schema.String),
      })
    ),
    error: Schema.NullOr(Schema.String),
    timing: Schema.NullOr(
      Schema.Struct({
        ocrMs: Schema.Number,
        llmMs: Schema.Number,
      })
    ),
  }),
  needsReview: Schema.Boolean,
});

export interface CaptureExpenseResult {
  expense: PendingReviewExpense | ConfirmedExpense;
  extraction: {
    success: boolean;
    data: {
      amount: number | null;
      currency: string | null;
      merchant: string | null;
      date: string | null;
      categories: string[];
    } | null;
    error: string | null;
    timing: { ocrMs: number; llmMs: number } | null;
  };
  needsReview: boolean;
}
