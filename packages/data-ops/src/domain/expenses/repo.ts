import { Effect } from 'effect'
import { eq, desc } from 'drizzle-orm'
import { expensesTable } from '../../db'
import { DbClient } from '../../layers'
import { type Expense } from './schema'
import { fromRow, toRow } from './utils'
import { withDbTryPromise } from '../shared/utils'

export class ExpenseRepo extends Effect.Service<ExpenseRepo>()('ExpenseRepo', {
  effect: Effect.gen(function* () {
    const db = yield* DbClient

    return {
      // ========================================================================
      // Persistence
      // ========================================================================

      /**
       * Save an expense (upsert).
       * Returns the saved expense.
       */
      save: Effect.fn('expenseRepo.save')(function* (expense: Expense) {
        const row = toRow(expense)

        // Check if expense exists
        const existing = yield* withDbTryPromise(db.select().from(expensesTable).where(eq(expensesTable.id, expense.id)).get())

        if (!existing) {
          // INSERT - new expense
          const result = yield* withDbTryPromise(db.insert(expensesTable).values(row).returning().get())
          return fromRow(result)
        } else {
          // UPDATE - existing expense
          const result = yield* withDbTryPromise(db.update(expensesTable).set(row).where(eq(expensesTable.id, expense.id)).returning().get())
          return fromRow(result!)
        }
      }),

      // ========================================================================
      // Queries
      // ========================================================================

      /**
       * Get expense by ID
       */
      getById: Effect.fn('expenseRepo.getById')(function* (id: string) {
        const result = yield* withDbTryPromise(db.select().from(expensesTable).where(eq(expensesTable.id, id)).get())
        return result ? fromRow(result) : undefined
      }),

      /**
       * Get all expenses ordered by expense date (most recent first)
       */
      getAll: Effect.fn('expenseRepo.getAll')(function* () {
        const results = yield* withDbTryPromise(db.select().from(expensesTable).orderBy(desc(expensesTable.expenseDate)).all())
        return results.map(fromRow)
      }),

      /**
       * Get expenses by user
       */
      getByUser: Effect.fn('expenseRepo.getByUser')(function* (userId: string) {
        const results = yield* withDbTryPromise(db.select().from(expensesTable).where(eq(expensesTable.userId, userId)).orderBy(desc(expensesTable.expenseDate)).all())
        return results.map(fromRow)
      }),

      /**
       * Delete an expense
       */
      delete: Effect.fn('expenseRepo.delete')(function* (id: string) {
        const result = yield* withDbTryPromise(db.delete(expensesTable).where(eq(expensesTable.id, id)).returning().get())
        return result ? fromRow(result) : undefined
      }),

      /**
       * Get unique merchants sorted by most recent expense date
       */
      getUniqueMerchants: Effect.fn('expenseRepo.getUniqueMerchants')(function* () {
        const results = yield* withDbTryPromise(
          db
            .selectDistinct({ merchant: expensesTable.merchant })
            .from(expensesTable)
            .orderBy(desc(expensesTable.expenseDate))
            .all(),
        )
        // Filter out null/empty merchants and extract unique names
        return results
          .map((r) => r.merchant)
          .filter((m): m is string => m !== null && m !== undefined && m.trim() !== '')
      }),
    } as const
  }),
  accessors: true,
  dependencies: [DbClient.Default],
}) {}
