import { Effect } from "effect";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { expensesTable } from "../../db";
import { DbClient } from "../../layers";
import { CreateExpense, UpdateExpense, type ExpenseStatus } from "./schema";
import { withDbTryPromise } from "../shared/utils";

export class ExpenseRepo extends Effect.Service<ExpenseRepo>()("ExpenseRepo", {
  effect: Effect.gen(function* () {
    const db = yield* DbClient;

    return {
      create: Effect.fn("expenseRepo.create")(function* (
        data: CreateExpense & { status?: ExpenseStatus }
      ) {
        return yield* withDbTryPromise(
          db
            .insert(expensesTable)
            .values({
              userId: data.userId,
              screenshotPath: data.screenshotPath,
              amount: data.amount,
              currency: data.currency,
              merchant: data.merchant,
              description: data.description,
              categories: data.categories,
              status: data.status,
            })
            .returning()
            .get()
        );
      }),

      getById: Effect.fn("expenseRepo.getById")(function* (id: string) {
        return yield* withDbTryPromise(
          db.select().from(expensesTable).where(eq(expensesTable.id, id)).get()
        );
      }),

      getAll: Effect.fn("expenseRepo.getAll")(function* () {
        return yield* withDbTryPromise(
          db.select().from(expensesTable).orderBy(desc(expensesTable.createdAt)).all()
        );
      }),

      getByUser: Effect.fn("expenseRepo.getByUser")(function* (userId: string) {
        return yield* withDbTryPromise(
          db
            .select()
            .from(expensesTable)
            .where(eq(expensesTable.userId, userId))
            .orderBy(desc(expensesTable.createdAt))
            .all()
        );
      }),

      getByStatus: Effect.fn("expenseRepo.getByStatus")(function* (
        status: ExpenseStatus
      ) {
        return yield* withDbTryPromise(
          db
            .select()
            .from(expensesTable)
            .where(eq(expensesTable.status, status))
            .orderBy(desc(expensesTable.createdAt))
            .all()
        );
      }),

      getByDateRange: Effect.fn("expenseRepo.getByDateRange")(function* (
        from: Date,
        to: Date
      ) {
        return yield* withDbTryPromise(
          db
            .select()
            .from(expensesTable)
            .where(
              and(
                gte(expensesTable.createdAt, from),
                lte(expensesTable.createdAt, to)
              )
            )
            .orderBy(desc(expensesTable.createdAt))
            .all()
        );
      }),

      // Get next expense in queue for AI processing
      getNextSubmitted: Effect.fn("expenseRepo.getNextSubmitted")(function* () {
        return yield* withDbTryPromise(
          db
            .select()
            .from(expensesTable)
            .where(eq(expensesTable.status, "submitted"))
            .limit(1)
            .get()
        );
      }),

      update: Effect.fn("expenseRepo.update")(function* (
        id: string,
        data: UpdateExpense
      ) {
        return yield* withDbTryPromise(
          db
            .update(expensesTable)
            .set(data)
            .where(eq(expensesTable.id, id))
            .returning()
            .get()
        );
      }),

      // Mark as being processed by worker
      markProcessing: Effect.fn("expenseRepo.markProcessing")(function* (
        id: string
      ) {
        return yield* withDbTryPromise(
          db
            .update(expensesTable)
            .set({ status: "processing" })
            .where(eq(expensesTable.id, id))
            .returning()
            .get()
        );
      }),

      // Mark as successfully processed
      markSuccess: Effect.fn("expenseRepo.markSuccess")(function* (
        id: string,
        data: {
          amount: number;
          currency: string;
          baseAmount?: number;
          baseCurrency?: string;
          merchant?: string;
          categories?: string[];
          expenseDate?: Date;
        }
      ) {
        return yield* withDbTryPromise(
          db
            .update(expensesTable)
            .set({
              status: "success",
              amount: data.amount,
              currency: data.currency,
              baseAmount: data.baseAmount,
              baseCurrency: data.baseCurrency,
              merchant: data.merchant,
              categories: data.categories,
              expenseDate: data.expenseDate,
              processedAt: new Date(),
            })
            .where(eq(expensesTable.id, id))
            .returning()
            .get()
        );
      }),

      // Mark as needing human review
      markNeedsReview: Effect.fn("expenseRepo.markNeedsReview")(function* (
        id: string,
        errorMessage: string
      ) {
        return yield* withDbTryPromise(
          db
            .update(expensesTable)
            .set({
              status: "needs-review",
              errorMessage,
              processedAt: new Date(),
            })
            .where(eq(expensesTable.id, id))
            .returning()
            .get()
        );
      }),

      delete: Effect.fn("expenseRepo.delete")(function* (id: string) {
        return yield* withDbTryPromise(
          db.delete(expensesTable).where(eq(expensesTable.id, id)).returning().get()
        );
      }),
    } as const;
  }),
  accessors: true,
  dependencies: [DbClient.Default],
}) {}
