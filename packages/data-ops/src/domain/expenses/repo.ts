import { Effect } from "effect";
import { eq, desc, and, isNull } from "drizzle-orm";
import { expensesTable } from "../../db";
import { DbClient } from "../../layers";
import {
  ExpenseAggregate,
  type ExpenseState,
  type ExtractionStatus,
} from "./schema";
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
      // Unified Persistence
      // ========================================================================

      /**
       * Save an expense aggregate (upsert).
       * - If aggregate has no ID: INSERT and return aggregate with assigned ID
       * - If aggregate has ID: UPDATE and return aggregate
       */
      save: Effect.fn("expenseRepo.save")(function* (
        aggregate: ExpenseAggregate,
      ) {
        const row = aggregate.toPersistence();

        if (row.id === undefined || row.id === null) {
          // INSERT - new expense
          const result = yield* withDbTryPromise(
            db.insert(expensesTable).values(row).returning().get(),
          );
          return ExpenseAggregate.fromPersistence(result);
        } else {
          // UPDATE - existing expense
          const result = yield* withDbTryPromise(
            db
              .update(expensesTable)
              .set(row)
              .where(eq(expensesTable.id, row.id))
              .returning()
              .get(),
          );
          return ExpenseAggregate.fromPersistence(result!);
        }
      }),

      // ========================================================================
      // Basic CRUD
      // ========================================================================

      /**
       * @deprecated Use repo.save(ExpenseAggregate.createDraft({...})) instead
       */
      create: Effect.fn("expenseRepo.create")(function* (
        data: CreateExpenseInput,
      ) {
        return ExpenseAggregate.fromPersistence(
          yield* withDbTryPromise(
            db
              .insert(expensesTable)
              .values({
                userId: data.userId,
                receiptImageKey: data.receiptImageKey,
                state: data.state ?? "draft",
                extractionStatus: data.extractionStatus ?? "pending",
              })
              .returning()
              .get(),
          ),
        );
      }),

      /**
       * Get expense by ID
       */
       getById: Effect.fn("expenseRepo.getById")(function* (id: string) {
               const result = yield* withDbTryPromise(
                 db.select().from(expensesTable).where(eq(expensesTable.id, id)).get(),
               );
               return result ? ExpenseAggregate.fromPersistence(result) : undefined;
             }),

      /**
       * Get all expenses ordered by creation date
       */
      getAll: Effect.fn("expenseRepo.getAll")(function* () {
        const results =  yield* withDbTryPromise(
          db
            .select()
            .from(expensesTable)
            .orderBy(desc(expensesTable.createdAt))
            .all(),
        );
        return results.map(ExpenseAggregate.fromPersistence);
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
        return results.map(ExpenseAggregate.fromPersistence);
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
        return result ? ExpenseAggregate.fromPersistence(result) : undefined;
      }),

      // ========================================================================
      // State Queries
      // ========================================================================

      /**
       * Get all complete expenses (for reports)
       */
      getComplete: Effect.fn("expenseRepo.getComplete")(function* () {
        const results = yield* withDbTryPromise(
          db
            .select()
            .from(expensesTable)
            .where(eq(expensesTable.state, "complete"))
            .orderBy(desc(expensesTable.expenseDate))
            .all(),
        );
        return results.map(ExpenseAggregate.fromPersistence);
      }),

      /**
       * Get draft expenses pending review (extraction done but missing required fields)
       */
      getPendingReview: Effect.fn("expenseRepo.getPendingReview")(function* () {
        const results = yield* withDbTryPromise(
          db
            .select()
            .from(expensesTable)
            .where(
              and(
                eq(expensesTable.state, "draft"),
                eq(expensesTable.extractionStatus, "done"),
              ),
            )
            .orderBy(desc(expensesTable.createdAt))
            .all(),
        );
        return results.map(ExpenseAggregate.fromPersistence);
      }),

      /**
       * Get draft expenses where extraction failed
       */
      getExtractionFailed: Effect.fn("expenseRepo.getExtractionFailed")(
        function* () {
          const results = yield* withDbTryPromise(
            db
              .select()
              .from(expensesTable)
              .where(
                and(
                  eq(expensesTable.state, "draft"),
                  eq(expensesTable.extractionStatus, "failed"),
                ),
              )
              .orderBy(desc(expensesTable.createdAt))
              .all(),
          );
          return results.map(ExpenseAggregate.fromPersistence);
        },
      ),

      /**
       * Get next expense needing extraction (pending status)
       */
      getNextForExtraction: Effect.fn("expenseRepo.getNextForExtraction")(
        function* () {
          const result = yield* withDbTryPromise(
            db
              .select()
              .from(expensesTable)
              .where(
                and(
                  eq(expensesTable.state, "draft"),
                  eq(expensesTable.extractionStatus, "pending"),
                ),
              )
              .limit(1)
              .get(),
          );
          return result ? ExpenseAggregate.fromPersistence(result) : undefined;
        },
      ),

      // ========================================================================
      // State Transitions (DEPRECATED - use aggregate methods + save())
      // ========================================================================

      /**
       * @deprecated Use expense.startExtraction() + repo.save(expense) instead
       */
      setExtractionProcessing: Effect.fn("expenseRepo.setExtractionProcessing")(
        function* (id: string) {
          return yield* withDbTryPromise(
            db
              .update(expensesTable)
              .set({ extractionStatus: "processing" })
              .where(eq(expensesTable.id, id))
              .returning()
              .get(),
          );
        },
      ),

      /**
       * @deprecated Use expense.applyExtraction(data) + repo.save(expense) instead
       */
      applyExtraction: Effect.fn("expenseRepo.applyExtraction")(function* (
        id: string,
        data: ApplyExtractionInput,
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
            .get(),
        );
      }),

      /**
       * @deprecated Use expense.complete(overrides) + repo.save(expense) instead
       */
      complete: Effect.fn("expenseRepo.complete")(function* (
        id: string,
        data: CompleteExpenseInput,
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
            .get(),
        );
      }),

      /**
       * @deprecated Use expense.update(changes) + repo.save(expense) instead
       */
      update: Effect.fn("expenseRepo.update")(function* (
        id: string,
        data: UpdateExpenseInput,
      ) {
        return yield* withDbTryPromise(
          db
            .update(expensesTable)
            .set(data)
            .where(eq(expensesTable.id, id))
            .returning()
            .get(),
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
                  eq(expensesTable.extractionStatus, "done"),
                ),
              )
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
