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
 * Categories field schema (array of strings)
 */
const CategoriesSchema = Schema.mutable(Schema.Array(Schema.String))

/**
 * Expense schema - all fields required (image, amount, currency, merchant, date)
 */
export const ExpenseSchema = Schema.Struct({
  id: Schema.String,
  userId: Schema.String,
  imageKey: Schema.String,
  amount: Schema.Number,
  currency: Schema.String,
  baseAmount: Schema.Number,
  baseCurrency: Schema.String,
  merchant: Schema.String,
  description: Schema.NullOr(Schema.String),
  categories: CategoriesSchema,
  expenseDate: Schema.DateFromSelf,
  createdAt: Schema.DateFromSelf,
})

// ============================================================================
// TypeScript Types (inferred from Effect Schema)
// ============================================================================

export type Expense = Schema.Schema.Type<typeof ExpenseSchema>
