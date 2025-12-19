/**
 * Client-safe schema exports.
 * This module only exports types that can be safely used in frontend code.
 *
 * Import from "@repo/data-ops/schemas" in frontend code.
 */

// =============================================================================
// Expense Types
// =============================================================================

export type { Expense, ExpenseRow, ExpenseInsert } from '../domain/expenses/schema'

// =============================================================================
// DTO Types
// =============================================================================

export type { CreateExpenseInput, UpdateExpenseInput } from '../domain/expenses/dto'
