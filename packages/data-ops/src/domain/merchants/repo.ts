import { Effect } from 'effect'
import { eq, sql, desc } from 'drizzle-orm'
import { merchantsTable, expensesTable } from '../../db'
import { DbClient } from '../../layers'
import { withDbTryPromise } from '../shared/utils'

export class MerchantRepo extends Effect.Service<MerchantRepo>()('MerchantRepo', {
  effect: Effect.gen(function* () {
    const db = yield* DbClient

    return {
      getById: Effect.fn('merchantRepo.getById')(function* (id: string) {
        return yield* withDbTryPromise(db.select().from(merchantsTable).where(eq(merchantsTable.id, id)).get())
      }),

      getByName: Effect.fn('merchantRepo.getByName')(function* (name: string) {
        // Case-insensitive lookup using the normalized name column
        return yield* withDbTryPromise(
          db.select().from(merchantsTable).where(eq(merchantsTable.name, name.toLowerCase())).get()
        )
      }),

      /**
       * Get or create a merchant by name.
       * Returns existing merchant if found, otherwise creates new one.
       */
      getOrCreate: Effect.fn('merchantRepo.getOrCreate')(function* (displayName: string) {
        const normalizedName = displayName.trim().toLowerCase()

        // Try to find existing
        const existing = yield* withDbTryPromise(
          db.select().from(merchantsTable).where(eq(merchantsTable.name, normalizedName)).get()
        )

        if (existing) {
          return existing
        }

        // Create new merchant (no category initially)
        return yield* withDbTryPromise(
          db
            .insert(merchantsTable)
            .values({
              name: normalizedName,
              displayName: displayName.trim(),
              category: null,
            })
            .returning()
            .get()
        )
      }),

      /**
       * Get all merchants ordered by most recently used (based on expense count).
       */
      getAllByRecentUsage: Effect.fn('merchantRepo.getAllByRecentUsage')(function* () {
        // Get merchants with their expense counts, ordered by usage
        const result = yield* withDbTryPromise(
          db
            .select({
              id: merchantsTable.id,
              name: merchantsTable.name,
              displayName: merchantsTable.displayName,
              category: merchantsTable.category,
              createdAt: merchantsTable.createdAt,
              expenseCount: sql<number>`COUNT(${expensesTable.id})`.as('expense_count'),
            })
            .from(merchantsTable)
            .leftJoin(expensesTable, eq(merchantsTable.id, expensesTable.merchantId))
            .groupBy(merchantsTable.id)
            .orderBy(desc(sql`expense_count`), desc(merchantsTable.createdAt))
            .all()
        )

        return result
      }),

      getAll: Effect.fn('merchantRepo.getAll')(function* () {
        return yield* withDbTryPromise(db.select().from(merchantsTable).orderBy(merchantsTable.displayName).all())
      }),

      updateCategory: Effect.fn('merchantRepo.updateCategory')(function* (id: string, category: string | null) {
        return yield* withDbTryPromise(
          db.update(merchantsTable).set({ category }).where(eq(merchantsTable.id, id)).returning().get()
        )
      }),
    } as const
  }),
  accessors: true,
  dependencies: [DbClient.Default],
}) {}
