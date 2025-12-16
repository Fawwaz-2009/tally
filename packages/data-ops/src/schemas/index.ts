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
} from "../domain/expenses/schema";

// Type guards and query helpers
export {
  isPending,
  isPendingReview,
  isConfirmed,
  getMissingFields,
  canConfirm,
  getDisplayAmount,
  getDisplayDate,
} from "../domain/expenses/utils";

// =============================================================================
// DTO Types
// =============================================================================

export type {
  CaptureExpenseInput,
  CaptureExpenseResult,
  ConfirmExpenseInput,
  UpdateExpenseInput,
} from "../domain/expenses/dto";
