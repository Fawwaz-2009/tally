import { Effect } from "effect";
import { ExpenseRepo } from "./repo";
import { CreateExpense, UpdateExpense, type ExpenseStatus } from "./schema";
import { CurrencyService } from "../currency";
import { SettingsService } from "../settings";
import { ExtractionService } from "../extraction";
import { BucketClient } from "../../layers";

/**
 * Input for updating an expense with automatic base currency conversion
 */
export interface UpdateExpenseInput {
  amount?: number;
  currency?: string;
  merchant?: string;
  description?: string;
  categories?: string[];
  status?: ExpenseStatus;
  expenseDate?: Date;
}

/**
 * Input for ingesting a new expense from an image
 */
export interface IngestExpenseInput {
  userId: string;
  imageBuffer: Buffer;
  fileKey: string;
  contentType: string;
}

/**
 * Result of expense ingestion
 */
export interface IngestExpenseResult {
  expense: {
    id: string;
    status: string;
    amount: number | null;
    currency: string | null;
    merchant: string | null;
  } | null;
  extraction: {
    success: boolean;
    data: {
      amount: number | null;
      currency: string | null;
      merchant: string | null;
      date: string | null;
    } | null;
    error: string | null;
    timing: {
      ocrMs: number;
      llmMs: number;
    } | null;
  };
}

export class ExpenseService extends Effect.Service<ExpenseService>()(
  "ExpenseService",
  {
    effect: Effect.gen(function* () {
      const repo = yield* ExpenseRepo;
      const currencyService = yield* CurrencyService;
      const settingsService = yield* SettingsService;
      const extractionService = yield* ExtractionService;
      const bucket = yield* BucketClient;

      return {
        // Create a new expense
        // If amount is provided, mark as success; otherwise submitted for processing
        createExpense: (data: CreateExpense) =>
          repo.create({
            ...data,
            status: data.amount ? "success" : "submitted",
          }),

        // Get expense by ID
        getExpense: (id: string) => repo.getById(id),

        // Get all expenses
        getAllExpenses: repo.getAll,

        // Get expenses by user
        getExpensesByUser: (userId: string) => repo.getByUser(userId),

        // Get expenses by status
        getExpensesByStatus: (status: ExpenseStatus) => repo.getByStatus(status),

        // Get expenses in a date range
        getExpensesByDateRange: (from: Date, to: Date) =>
          repo.getByDateRange(from, to),

        // Update expense (low-level, no currency conversion)
        updateExpense: (id: string, data: UpdateExpense) => repo.update(id, data),

        /**
         * Update expense with automatic base currency conversion.
         * If amount or currency changes, recalculates baseAmount in base currency.
         */
        updateExpenseWithConversion: (
          id: string,
          data: UpdateExpenseInput
        ): Effect.Effect<
          {
            id: string;
            userId: string;
            amount: number | null;
            currency: string | null;
            baseAmount: number | null;
            baseCurrency: string | null;
            merchant: string | null;
            description: string | null;
            categories: string[] | null;
            screenshotPath: string | null;
            status: string;
            errorMessage: string | null;
            expenseDate: Date | null;
            createdAt: Date;
            processedAt: Date | null;
          } | null,
          Error
        > =>
          Effect.gen(function* () {
            // Get current expense to check what changed
            const currentExpense = yield* repo.getById(id);
            if (!currentExpense) {
              return null;
            }

            // Determine final amount and currency
            const amount = data.amount ?? currentExpense.amount;
            const currency = data.currency ?? currentExpense.currency ?? "USD";

            // Recalculate baseAmount if amount or currency changed
            let baseAmount = currentExpense.baseAmount;
            let baseCurrency = currentExpense.baseCurrency;

            const amountChanged = data.amount !== undefined;
            const currencyChanged = data.currency !== undefined;

            if (amount !== null && (amountChanged || currencyChanged)) {
              baseCurrency = yield* settingsService.getBaseCurrency();
              baseAmount = yield* currencyService.convert(
                amount,
                currency,
                baseCurrency
              );
            }

            // Build update payload
            const updateData: UpdateExpense = {
              ...data,
              baseAmount: baseAmount ?? undefined,
              baseCurrency: baseCurrency ?? undefined,
            };

            return yield* repo.update(id, updateData);
          }),

        // Delete expense
        deleteExpense: (id: string) => repo.delete(id),

        // Worker methods
        getNextForProcessing: repo.getNextSubmitted,
        markProcessing: (id: string) => repo.markProcessing(id),
        markSuccess: (
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
        ) => repo.markSuccess(id, data),
        markNeedsReview: (id: string, error: string) =>
          repo.markNeedsReview(id, error),

        /**
         * Ingest a new expense from an image.
         * Handles the full workflow: save → create → extract → convert → update
         */
        ingest: (input: IngestExpenseInput): Effect.Effect<IngestExpenseResult, Error> =>
          Effect.gen(function* () {
            // 1. Save image to bucket storage
            yield* bucket.put(input.fileKey, input.imageBuffer, {
              httpMetadata: { contentType: input.contentType },
            });

            // 2. Create expense record in "submitted" status
            const expense = yield* repo.create({
              userId: input.userId,
              screenshotPath: input.fileKey,
              status: "submitted",
            });

            // 3. Mark as processing
            yield* repo.markProcessing(expense.id);

            // 4. Run extraction with error handling to prevent stuck "processing" status
            const extractionResult = yield* extractionService
              .extractFromImage(input.imageBuffer)
              .pipe(
                Effect.catchAll((error) =>
                  Effect.succeed({
                    success: false as const,
                    data: null,
                    ocrText: null,
                    rawLlmResponse: null,
                    timing: null,
                    error:
                      error instanceof Error
                        ? error.message
                        : String((error as { _tag?: string })._tag ?? error),
                  })
                )
              );

            // 5. Update expense based on extraction result
            if (extractionResult.success && extractionResult.data) {
              const { data } = extractionResult;
              const amount = data.amount ?? 0;
              const currency = data.currency ?? "USD";

              // Get base currency and convert
              const baseCurrency = yield* settingsService.getBaseCurrency();
              const baseAmount = yield* currencyService.convert(
                amount,
                currency,
                baseCurrency
              );

              // Parse expense date from extraction if available
              const expenseDate = data.date ? new Date(data.date) : undefined;

              yield* repo.markSuccess(expense.id, {
                amount,
                currency,
                baseAmount,
                baseCurrency,
                merchant: data.merchant ?? undefined,
                categories: data.category,
                expenseDate,
              });
            } else {
              yield* repo.markNeedsReview(
                expense.id,
                extractionResult.error ?? "Extraction failed"
              );
            }

            // 6. Return updated expense
            const updatedExpense = yield* repo.getById(expense.id);

            return {
              expense: updatedExpense
                ? {
                    id: updatedExpense.id,
                    status: updatedExpense.status,
                    amount: updatedExpense.amount,
                    currency: updatedExpense.currency,
                    merchant: updatedExpense.merchant,
                  }
                : null,
              extraction: {
                success: extractionResult.success,
                data: extractionResult.data
                  ? {
                      amount: extractionResult.data.amount,
                      currency: extractionResult.data.currency,
                      merchant: extractionResult.data.merchant,
                      date: extractionResult.data.date ?? null,
                    }
                  : null,
                error: extractionResult.error,
                timing: extractionResult.timing,
              },
            };
          }),
      } as const;
    }),
    dependencies: [
      ExpenseRepo.Default,
      CurrencyService.Default,
      SettingsService.Default,
      ExtractionService.Default,
      BucketClient.Default,
    ],
    accessors: true,
  }
) {}
