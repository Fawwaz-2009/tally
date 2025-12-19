/**
 * Data Transfer Objects for Expense operations.
 * These represent API inputs/outputs, derived from domain schemas.
 */
import { Schema } from 'effect'
import { PendingReviewExpenseSchema, ConfirmedExpenseSchema } from './schema'

// ============================================================================
// Capture (create new expense from image)
// ============================================================================

export interface CaptureExpenseInput {
  userId: string
  image: File
}

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
      }),
    ),
    error: Schema.NullOr(Schema.String),
    timing: Schema.NullOr(
      Schema.Struct({
        ocrMs: Schema.Number,
        llmMs: Schema.Number,
      }),
    ),
  }),
  needsReview: Schema.Boolean,
})
export type CaptureExpenseResult = Schema.Schema.Type<typeof CaptureExpenseResultSchema>

// ============================================================================
// Confirm (pending-review → confirmed)
// ============================================================================

/**
 * Payload for confirming a pending-review expense.
 * Picks editable fields from PendingReviewExpenseSchema + requires id.
 */
export const ConfirmExpensePayload = PendingReviewExpenseSchema.pick('id', 'amount', 'currency', 'merchant', 'description', 'categories', 'expenseDate')
export type ConfirmExpenseInput = Schema.Schema.Type<typeof ConfirmExpensePayload>

// ============================================================================
// Update (edit confirmed expense)
// ============================================================================

/**
 * Payload for updating a confirmed expense.
 * Picks editable fields from ConfirmedExpenseSchema, makes them partial, + requires id.
 */
export const UpdateExpensePayload = ConfirmedExpenseSchema.pick('amount', 'currency', 'merchant', 'description', 'categories', 'expenseDate')
  .pipe(Schema.partial)
  .pipe(Schema.extend(Schema.Struct({ id: Schema.String })))
export type UpdateExpenseInput = Schema.Schema.Type<typeof UpdateExpensePayload>

// ============================================================================
// Create Direct (create confirmed expense directly, bypassing extraction)
// ============================================================================

/**
 * Input for creating a confirmed expense directly (from iOS shortcut etc.)
 * Bypasses the extraction pipeline.
 */
export interface CreateDirectExpenseInput {
  userName: string // Will be trimmed and lowercased to match user ID
  merchant: string
  currency: string // Will be trimmed and uppercased (e.g., "USD", "IDR")
  amount: number // Amount in smallest unit (cents)
  image: File
  expenseDate?: Date // Optional, defaults to now
}
