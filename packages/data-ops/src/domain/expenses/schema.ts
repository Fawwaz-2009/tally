/**
 * Expense domain schemas - simplified model without state machine.
 * Uses Effect Schema for runtime validation.
 */
import { Schema } from 'effect'
import { expensesTable } from '../../db/schema'

// ============================================================================
// Drizzle Inferred Types (source of truth for persistence)
// ============================================================================

export type ExpenseRow = typeof expensesTable.$inferSelect
export type ExpenseInsert = typeof expensesTable.$inferInsert

// ============================================================================
// Effect Schema for Expense
// ============================================================================

/**
 * Expense schema - all fields required (image, amount, currency, merchantId, date)
 */
export const ExpenseSchema = Schema.Struct({
  id: Schema.String,
  userId: Schema.String,
  merchantId: Schema.String,
  imageKey: Schema.String,
  amount: Schema.Number,
  currency: Schema.String,
  baseAmount: Schema.Number,
  baseCurrency: Schema.String,
  description: Schema.NullOr(Schema.String),
  expenseDate: Schema.DateFromSelf,
  createdAt: Schema.DateFromSelf,
})

// ============================================================================
// TypeScript Types (inferred from Effect Schema)
// ============================================================================

export type Expense = Schema.Schema.Type<typeof ExpenseSchema>
