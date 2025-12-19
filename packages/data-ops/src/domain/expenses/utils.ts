/**
 * Expense domain utilities - persistence mapping.
 */
import type { Expense, ExpenseRow, ExpenseInsert } from './schema'

// ============================================================================
// Persistence Mapping
// ============================================================================

/**
 * Parse a database row into an expense.
 */
export const fromRow = (row: ExpenseRow): Expense => {
  return {
    id: row.id,
    userId: row.userId,
    imageKey: row.imageKey,
    amount: row.amount,
    currency: row.currency,
    baseAmount: row.baseAmount,
    baseCurrency: row.baseCurrency,
    merchant: row.merchant,
    description: row.description,
    categories: row.categories ?? [],
    expenseDate: row.expenseDate,
    createdAt: row.createdAt,
  }
}

/**
 * Convert an expense to a database row for persistence.
 */
export const toRow = (expense: Expense): ExpenseInsert => {
  return {
    id: expense.id,
    userId: expense.userId,
    imageKey: expense.imageKey,
    amount: expense.amount,
    currency: expense.currency,
    baseAmount: expense.baseAmount,
    baseCurrency: expense.baseCurrency,
    merchant: expense.merchant,
    description: expense.description,
    categories: expense.categories,
    expenseDate: expense.expenseDate,
    createdAt: expense.createdAt,
  }
}
