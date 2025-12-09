/**
 * Data Transfer Objects for Expense operations.
 * These represent API inputs/outputs, not the core domain model.
 */
import { Schema } from "effect";
import { ExpenseAggregate } from "./schema";

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
 * Complete expense operation - transitions draft to complete state.
 * Note: id is required since we need an existing expense to complete.
 */
export const CompleteExpensePayload = Schema.Struct({
  id: Schema.String,
  ...Schema.Struct({...ExpenseAggregate.fields}).pick("amount", "currency", "merchant", "description", "categories", "expenseDate").fields,
});
export type CompleteExpenseInput = Schema.Schema.Type<typeof CompleteExpensePayload>;

/**
 * Update expense operation - modifies existing expense.
 * Note: id is required since we need an existing expense to update.
 */
export const UpdateExpensePayload = Schema.Struct({
  id: Schema.String,
  ...Schema.Struct({...ExpenseAggregate.fields}).pick("amount", "currency", "merchant", "description", "categories", "expenseDate").fields,
});
export type UpdateExpenseInput = Schema.Schema.Type<typeof UpdateExpensePayload>;

// ============================================================================
// Operation Results
// ============================================================================

/**
 * Extraction data returned from OCR/LLM processing.
 */
const ExtractionDataSchema = Schema.Struct({
  amount: Schema.NullOr(Schema.Number),
  currency: Schema.NullOr(Schema.String),
  merchant: Schema.NullOr(Schema.String),
  date: Schema.NullOr(Schema.String), // ISO date string
  categories: Schema.Array(Schema.String),
});

/**
 * Result of expense capture operation.
 */
export const CaptureExpenseResultSchema = Schema.Struct({
  expense: Schema.Struct({...ExpenseAggregate.fields}),
  extraction: Schema.Struct({
    success: Schema.Boolean,
    data: Schema.NullOr(ExtractionDataSchema),
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
export type CaptureExpenseResult = Schema.Schema.Type<typeof CaptureExpenseResultSchema>;
