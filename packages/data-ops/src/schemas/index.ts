/**
 * Client-safe schema exports.
 * This module only exports types and pure utility functions
 * that can be safely bundled for browser use.
 *
 * Import from "@repo/data-ops/schemas" in frontend code.
 */

// Re-export types from domain schemas
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

// Re-export the aggregate class for static method access
export { ExpenseAggregate } from "../domain/expenses/schema";

// Re-export DTO types
export type {
  CaptureExpenseInput,
  CaptureExpenseResult,
  CompleteExpenseInput,
  UpdateExpenseInput,
} from "../domain/expenses/dto";
