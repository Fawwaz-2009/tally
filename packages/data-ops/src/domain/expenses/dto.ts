/**
 * Data Transfer Objects for Expense operations.
 * These represent API inputs/outputs, derived from domain schemas.
 */
import { Schema } from 'effect'
import { ExpenseSchema } from './schema'

// ============================================================================
// Create (create new expense)
// ============================================================================

/**
 * Input for creating a new expense.
 * Used by both web app and iOS shortcuts.
 */
export interface CreateExpenseInput {
  userName: string // Will be trimmed and lowercased to match user ID
  merchant: string
  currency: string // Will be trimmed and uppercased (e.g., "USD", "IDR")
  amount: number // Amount in smallest unit (cents)
  image: File
  expenseDate?: Date // Optional, defaults to now
}

// ============================================================================
// Update (edit existing expense)
// ============================================================================

/**
 * Payload for updating an existing expense.
 * Picks editable fields from ExpenseSchema, makes them partial, + requires id.
 */
export const UpdateExpensePayload = ExpenseSchema.pick('amount', 'currency', 'merchant', 'description', 'categories', 'expenseDate')
  .pipe(Schema.partial)
  .pipe(Schema.extend(Schema.Struct({ id: Schema.String })))
export type UpdateExpenseInput = Schema.Schema.Type<typeof UpdateExpensePayload>
