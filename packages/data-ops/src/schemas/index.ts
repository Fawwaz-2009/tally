/**
 * Client-safe schema exports.
 * This module only exports types that can be safely used in frontend code.
 *
 * Import from "@repo/data-ops/schemas" in frontend code.
 */

// =============================================================================
// Expense Types
// =============================================================================

export type {
  Expense,
  ExpenseInsert,
  ExpenseSelect,
  ExpenseState,
  ExtractionStatus,
  ApplyExtractionData,
  CompleteOverrides,
  UpdateChanges,
} from "../domain/expenses/schema";

export { ExpenseAggregate } from "../domain/expenses/schema";

// =============================================================================
// DTO Types
// =============================================================================

export type {
  CaptureExpenseInput,
  CaptureExpenseResult,
  CompleteExpenseInput,
  UpdateExpenseInput,
} from "../domain/expenses/dto";
