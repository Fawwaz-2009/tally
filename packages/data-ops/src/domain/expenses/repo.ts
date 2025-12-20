import { Effect } from 'effect'
import { eq, desc } from 'drizzle-orm'
import { expensesTable, merchantsTable } from '../../db'
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
       * Get expense by ID with merchant info (for display)
       */
      getByIdWithMerchant: Effect.fn('expenseRepo.getByIdWithMerchant')(function* (id: string) {
        const result = yield* withDbTryPromise(
          db
            .select({
              id: expensesTable.id,
              userId: expensesTable.userId,
              merchantId: expensesTable.merchantId,
              imageKey: expensesTable.imageKey,
              amount: expensesTable.amount,
              currency: expensesTable.currency,
              baseAmount: expensesTable.baseAmount,
              baseCurrency: expensesTable.baseCurrency,
              description: expensesTable.description,
              expenseDate: expensesTable.expenseDate,
              createdAt: expensesTable.createdAt,
              merchantName: merchantsTable.displayName,
              category: merchantsTable.category,
            })
            .from(expensesTable)
            .innerJoin(merchantsTable, eq(expensesTable.merchantId, merchantsTable.id))
            .where(eq(expensesTable.id, id))
            .get()
        )
        return result ?? undefined
      }),

      /**
       * Get all expenses ordered by expense date (most recent first)
       */
      getAll: Effect.fn('expenseRepo.getAll')(function* () {
        const results = yield* withDbTryPromise(db.select().from(expensesTable).orderBy(desc(expensesTable.expenseDate)).all())
        return results.map(fromRow)
      }),

      /**
       * Get all expenses with merchant info (for display)
       */
      getAllWithMerchants: Effect.fn('expenseRepo.getAllWithMerchants')(function* () {
        const results = yield* withDbTryPromise(
          db
            .select({
              id: expensesTable.id,
              userId: expensesTable.userId,
              merchantId: expensesTable.merchantId,
              imageKey: expensesTable.imageKey,
              amount: expensesTable.amount,
              currency: expensesTable.currency,
              baseAmount: expensesTable.baseAmount,
              baseCurrency: expensesTable.baseCurrency,
              description: expensesTable.description,
              expenseDate: expensesTable.expenseDate,
              createdAt: expensesTable.createdAt,
              merchantName: merchantsTable.displayName,
              category: merchantsTable.category,
            })
            .from(expensesTable)
            .innerJoin(merchantsTable, eq(expensesTable.merchantId, merchantsTable.id))
            .orderBy(desc(expensesTable.expenseDate))
            .all()
        )
        return results
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
    } as const
  }),
  accessors: true,
  dependencies: [DbClient.Default],
}) {}
