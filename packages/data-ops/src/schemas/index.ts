/**
 * Client-safe schema exports.
 * This module only exports types that can be safely used in frontend code.
 *
 * Import from "@repo/data-ops/schemas" in frontend code.
 */

// =============================================================================
// Expense Types (Discriminated Union)
// =============================================================================

export type {
  Expense,
  PendingExpense,
  PendingReviewExpense,
  ConfirmedExpense,
  ExpenseState,
  ExtractionMetadata,
  ExpenseRow,
  ExpenseInsert,
  ConfirmInput,
  UpdateInput,
} from "../domain/expenses/schema";

// Type guards
export {
  isPending,
  isPendingReview,
  isConfirmed,
} from "../domain/expenses/schema";

// Query helpers
export {
  getMissingFields,
  canConfirm,
  getDisplayAmount,
  getDisplayDate,
} from "../domain/expenses/schema";

// =============================================================================
// DTO Types
// =============================================================================

export type {
  CaptureExpenseInput,
  CaptureExpenseResult,
  ConfirmExpenseInput,
  UpdateExpenseInput,
} from "../domain/expenses/dto";
