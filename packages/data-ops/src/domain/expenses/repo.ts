import { Effect } from "effect";
import { eq, desc } from "drizzle-orm";
import { expensesTable } from "../../db";
import { DbClient } from "../../layers";
import {
  type Expense,
  type PendingReviewExpense,
  type ConfirmedExpense,
  fromRow,
  toRow,
  isPendingReview,
  isConfirmed,
} from "./schema";
import { withDbTryPromise } from "../shared/utils";

export class ExpenseRepo extends Effect.Service<ExpenseRepo>()("ExpenseRepo", {
  effect: Effect.gen(function* () {
    const db = yield* DbClient;

    return {
      // ========================================================================
      // Unified Persistence
      // ========================================================================

      /**
       * Save an expense (upsert).
       * Returns the saved expense.
       */
      save: Effect.fn("expenseRepo.save")(function* (expense: Expense) {
        const row = toRow(expense);

        // Check if expense exists
        const existing = yield* withDbTryPromise(
          db.select().from(expensesTable).where(eq(expensesTable.id, expense.id)).get(),
        );

        if (!existing) {
          // INSERT - new expense
          const result = yield* withDbTryPromise(
            db.insert(expensesTable).values(row).returning().get(),
          );
          return fromRow(result);
        } else {
          // UPDATE - existing expense
          const result = yield* withDbTryPromise(
            db
              .update(expensesTable)
              .set(row)
              .where(eq(expensesTable.id, expense.id))
              .returning()
              .get(),
          );
          return fromRow(result!);
        }
      }),

      // ========================================================================
      // Basic CRUD
      // ========================================================================

      /**
       * Get expense by ID
       */
      getById: Effect.fn("expenseRepo.getById")(function* (id: string) {
        const result = yield* withDbTryPromise(
          db.select().from(expensesTable).where(eq(expensesTable.id, id)).get(),
        );
        return result ? fromRow(result) : undefined;
      }),

      /**
       * Get all expenses ordered by creation date
       */
      getAll: Effect.fn("expenseRepo.getAll")(function* () {
        const results = yield* withDbTryPromise(
          db
            .select()
            .from(expensesTable)
            .orderBy(desc(expensesTable.createdAt))
            .all(),
        );
        return results.map(fromRow);
      }),

      /**
       * Get expenses by user
       */
      getByUser: Effect.fn("expenseRepo.getByUser")(function* (userId: string) {
        const results = yield* withDbTryPromise(
          db
            .select()
            .from(expensesTable)
            .where(eq(expensesTable.userId, userId))
            .orderBy(desc(expensesTable.createdAt))
            .all(),
        );
        return results.map(fromRow);
      }),

      /**
       * Delete an expense
       */
      delete: Effect.fn("expenseRepo.delete")(function* (id: string) {
        const result = yield* withDbTryPromise(
          db
            .delete(expensesTable)
            .where(eq(expensesTable.id, id))
            .returning()
            .get(),
        );
        return result ? fromRow(result) : undefined;
      }),

      // ========================================================================
      // State-Specific Queries
      // ========================================================================

      /**
       * Get all confirmed expenses (for reports/dashboard)
       */
      getConfirmed: Effect.fn("expenseRepo.getConfirmed")(function* () {
        const results = yield* withDbTryPromise(
          db
            .select()
            .from(expensesTable)
            .where(eq(expensesTable.state, "confirmed"))
            .orderBy(desc(expensesTable.expenseDate))
            .all(),
        );
        return results.map(fromRow).filter(isConfirmed) as ConfirmedExpense[];
      }),

      /**
       * Get expenses pending review
       */
      getPendingReview: Effect.fn("expenseRepo.getPendingReview")(function* () {
        const results = yield* withDbTryPromise(
          db
            .select()
            .from(expensesTable)
            .where(eq(expensesTable.state, "pending-review"))
            .orderBy(desc(expensesTable.createdAt))
            .all(),
        );
        return results.map(fromRow).filter(isPendingReview) as PendingReviewExpense[];
      }),

      // ========================================================================
      // Counts
      // ========================================================================

      /**
       * Count expenses pending review
       */
      countPendingReview: Effect.fn("expenseRepo.countPendingReview")(
        function* () {
          const results = yield* withDbTryPromise(
            db
              .select()
              .from(expensesTable)
              .where(eq(expensesTable.state, "pending-review"))
              .all(),
          );
          return results.length;
        },
      ),
    } as const;
  }),
  accessors: true,
  dependencies: [DbClient.Default],
}) {}
