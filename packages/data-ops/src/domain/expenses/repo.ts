import { Effect } from "effect";
import { eq, desc, and, isNull } from "drizzle-orm";
import { expensesTable } from "../../db";
import { DbClient } from "../../layers";
import type { ExpenseState, ExtractionStatus } from "./schema";
import { withDbTryPromise } from "../shared/utils";

/**
 * Input for creating a new expense record
 */
interface CreateExpenseInput {
  userId: string;
  receiptImageKey?: string;
  state?: ExpenseState;
  extractionStatus?: ExtractionStatus;
}

/**
 * Input for applying extraction results
 */
interface ApplyExtractionInput {
  extractionStatus: ExtractionStatus;
  extractionOcrText?: string;
  extractionError?: string;
  extractionOcrMs?: number;
  extractionLlmMs?: number;
  amount?: number;
  currency?: string;
  merchant?: string;
  categories?: string[];
  expenseDate?: Date;
}

/**
 * Input for completing an expense (transition to complete state)
 */
interface CompleteExpenseInput {
  amount: number;
  currency: string;
  baseAmount: number;
  baseCurrency: string;
  merchant: string;
  expenseDate: Date;
  description?: string;
  categories?: string[];
}

/**
 * Input for updating expense data
 */
interface UpdateExpenseInput {
  amount?: number;
  currency?: string;
  baseAmount?: number;
  baseCurrency?: string;
  merchant?: string;
  description?: string;
  categories?: string[];
  expenseDate?: Date;
}

export class ExpenseRepo extends Effect.Service<ExpenseRepo>()("ExpenseRepo", {
  effect: Effect.gen(function* () {
    const db = yield* DbClient;

    return {
      // ========================================================================
      // Basic CRUD
      // ========================================================================

      /**
       * Create a new expense in draft state
       */
      create: Effect.fn("expenseRepo.create")(function* (
        data: CreateExpenseInput
      ) {
        return yield* withDbTryPromise(
          db
            .insert(expensesTable)
            .values({
              userId: data.userId,
              receiptImageKey: data.receiptImageKey,
              state: data.state ?? "draft",
              extractionStatus: data.extractionStatus ?? "pending",
            })
            .returning()
            .get()
        );
      }),

      /**
       * Get expense by ID
       */
      getById: Effect.fn("expenseRepo.getById")(function* (id: string) {
        return yield* withDbTryPromise(
          db.select().from(expensesTable).where(eq(expensesTable.id, id)).get()
        );
      }),

      /**
       * Get all expenses ordered by creation date
       */
      getAll: Effect.fn("expenseRepo.getAll")(function* () {
        return yield* withDbTryPromise(
          db
            .select()
            .from(expensesTable)
            .orderBy(desc(expensesTable.createdAt))
            .all()
        );
      }),

      /**
       * Get expenses by user
       */
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

      /**
       * Delete an expense
       */
      delete: Effect.fn("expenseRepo.delete")(function* (id: string) {
        return yield* withDbTryPromise(
          db
            .delete(expensesTable)
            .where(eq(expensesTable.id, id))
            .returning()
            .get()
        );
      }),

      // ========================================================================
      // State Queries
      // ========================================================================

      /**
       * Get all complete expenses (for reports)
       */
      getComplete: Effect.fn("expenseRepo.getComplete")(function* () {
        return yield* withDbTryPromise(
          db
            .select()
            .from(expensesTable)
            .where(eq(expensesTable.state, "complete"))
            .orderBy(desc(expensesTable.expenseDate))
            .all()
        );
      }),

      /**
       * Get draft expenses pending review (extraction done but missing required fields)
       */
      getPendingReview: Effect.fn("expenseRepo.getPendingReview")(function* () {
        return yield* withDbTryPromise(
          db
            .select()
            .from(expensesTable)
            .where(
              and(
                eq(expensesTable.state, "draft"),
                eq(expensesTable.extractionStatus, "done")
              )
            )
            .orderBy(desc(expensesTable.createdAt))
            .all()
        );
      }),

      /**
       * Get draft expenses where extraction failed
       */
      getExtractionFailed: Effect.fn("expenseRepo.getExtractionFailed")(
        function* () {
          return yield* withDbTryPromise(
            db
              .select()
              .from(expensesTable)
              .where(
                and(
                  eq(expensesTable.state, "draft"),
                  eq(expensesTable.extractionStatus, "failed")
                )
              )
              .orderBy(desc(expensesTable.createdAt))
              .all()
          );
        }
      ),

      /**
       * Get next expense needing extraction (pending status)
       */
      getNextForExtraction: Effect.fn("expenseRepo.getNextForExtraction")(
        function* () {
          return yield* withDbTryPromise(
            db
              .select()
              .from(expensesTable)
              .where(
                and(
                  eq(expensesTable.state, "draft"),
                  eq(expensesTable.extractionStatus, "pending")
                )
              )
              .limit(1)
              .get()
          );
        }
      ),

      // ========================================================================
      // State Transitions
      // ========================================================================

      /**
       * Update extraction status (pending -> processing)
       */
      setExtractionProcessing: Effect.fn("expenseRepo.setExtractionProcessing")(
        function* (id: string) {
          return yield* withDbTryPromise(
            db
              .update(expensesTable)
              .set({ extractionStatus: "processing" })
              .where(eq(expensesTable.id, id))
              .returning()
              .get()
          );
        }
      ),

      /**
       * Apply extraction results
       */
      applyExtraction: Effect.fn("expenseRepo.applyExtraction")(function* (
        id: string,
        data: ApplyExtractionInput
      ) {
        return yield* withDbTryPromise(
          db
            .update(expensesTable)
            .set({
              extractionStatus: data.extractionStatus,
              extractionOcrText: data.extractionOcrText,
              extractionError: data.extractionError,
              extractionOcrMs: data.extractionOcrMs,
              extractionLlmMs: data.extractionLlmMs,
              amount: data.amount,
              currency: data.currency,
              merchant: data.merchant,
              categories: data.categories,
              expenseDate: data.expenseDate,
            })
            .where(eq(expensesTable.id, id))
            .returning()
            .get()
        );
      }),

      /**
       * Complete an expense (transition draft -> complete)
       */
      complete: Effect.fn("expenseRepo.complete")(function* (
        id: string,
        data: CompleteExpenseInput
      ) {
        return yield* withDbTryPromise(
          db
            .update(expensesTable)
            .set({
              state: "complete",
              amount: data.amount,
              currency: data.currency,
              baseAmount: data.baseAmount,
              baseCurrency: data.baseCurrency,
              merchant: data.merchant,
              description: data.description,
              categories: data.categories,
              expenseDate: data.expenseDate,
              completedAt: new Date(),
            })
            .where(eq(expensesTable.id, id))
            .returning()
            .get()
        );
      }),

      /**
       * Update expense data
       */
      update: Effect.fn("expenseRepo.update")(function* (
        id: string,
        data: UpdateExpenseInput
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
              .where(
                and(
                  eq(expensesTable.state, "draft"),
                  eq(expensesTable.extractionStatus, "done")
                )
              )
              .all()
          );
          return results.length;
        }
      ),
    } as const;
  }),
  accessors: true,
  dependencies: [DbClient.Default],
}) {}
