import { relations } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

// Tally: Users table
export const usersTable = sqliteTable('users', {
  id: text('id').primaryKey(), // e.g., "john", "sarah", "household"
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date())
    .notNull(),
})

// Tally: Settings table (singleton row with explicit columns)
export const settingsTable = sqliteTable('settings', {
  id: integer('id').primaryKey().default(1), // Singleton - always id=1
  baseCurrency: text('base_currency').notNull().default('USD'),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date())
    .notNull(),
})

// Tally: Merchants table
export const merchantsTable = sqliteTable('merchants', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull().unique(), // Normalized (lowercase) for lookups
  displayName: text('display_name').notNull(), // Original casing for display
  category: text('category'), // Nullable - assigned via settings
  createdAt: integer('created_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date())
    .notNull(),
})

// Tally: Expenses table (simplified - no state machine)
export const expensesTable = sqliteTable('expenses', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id),
  merchantId: text('merchant_id')
    .notNull()
    .references(() => merchantsTable.id),

  // Receipt image (required)
  imageKey: text('image_key').notNull(),

  // Expense data (all required)
  amount: integer('amount').notNull(), // Store as cents/smallest unit
  currency: text('currency').notNull(), // e.g., "USD", "EUR"
  baseAmount: integer('base_amount').notNull(), // Converted to base currency
  baseCurrency: text('base_currency').notNull(),

  // Optional fields
  description: text('description'),
  expenseDate: integer('expense_date', { mode: 'timestamp' }).notNull(),

  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date())
    .notNull(),
})

// Tally: Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  expenses: many(expensesTable),
}))

export const merchantsRelations = relations(merchantsTable, ({ many }) => ({
  expenses: many(expensesTable),
}))

export const expensesRelations = relations(expensesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [expensesTable.userId],
    references: [usersTable.id],
  }),
  merchant: one(merchantsTable, {
    fields: [expensesTable.merchantId],
    references: [merchantsTable.id],
  }),
}))
