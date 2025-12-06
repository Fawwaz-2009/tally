import { Effect, Data } from "effect";
import { ExpenseRepo } from "./repo";
import {
  type CaptureExpenseInput,
  type CompleteExpenseInput,
  type UpdateExpenseInput,
  type CaptureExpenseResult,
  type Expense,
  hasRequiredFields,
  getMissingFields,
} from "./schema";
import { CurrencyService } from "../currency";
import { SettingsService } from "../settings";
import { ExtractionService } from "../extraction";
import { BucketClient } from "../../layers";

// ============================================================================
// Domain Errors
// ============================================================================

export class ExpenseNotFoundError extends Data.TaggedError("ExpenseNotFoundError")<{
  id: string;
}> {}

export class ExpenseAlreadyCompleteError extends Data.TaggedError(
  "ExpenseAlreadyCompleteError"
)<{
  id: string;
}> {}

export class MissingRequiredFieldsError extends Data.TaggedError(
  "MissingRequiredFieldsError"
)<{
  id: string;
  missingFields: string[];
}> {}

// ============================================================================
// Service
// ============================================================================

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
        // ======================================================================
        // Domain Operations
        // ======================================================================

        /**
         * Capture a receipt and process it through the extraction pipeline.
         * Creates an expense in draft state, runs OCR/LLM, and determines if
         * the expense can be auto-completed or needs review.
         */
        capture: (
          input: CaptureExpenseInput
        ): Effect.Effect<CaptureExpenseResult, Error> =>
          Effect.gen(function* () {
            // 1. Decode base64 and generate storage key
            const imageBuffer = Buffer.from(input.imageBase64, "base64");
            const imageKey = `expenses/${Date.now()}-${input.fileName}`;

            // 2. Save image to bucket storage
            yield* bucket.put(imageKey, imageBuffer, {
              httpMetadata: { contentType: input.contentType },
            });

            // 3. Create expense in draft state with pending extraction
            const expense = yield* repo.create({
              userId: input.userId,
              receiptImageKey: imageKey,
              state: "draft",
              extractionStatus: "pending",
            });

            // 4. Mark extraction as processing
            yield* repo.setExtractionProcessing(expense.id);

            // 5. Run extraction with error handling
            const extractionResult = yield* extractionService
              .extractFromImage(imageBuffer)
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

            // 6. Apply extraction results
            if (extractionResult.success && extractionResult.data) {
              const { data, timing } = extractionResult;

              // Parse expense date from extraction
              const expenseDate = data.date ? new Date(data.date) : undefined;

              yield* repo.applyExtraction(expense.id, {
                extractionStatus: "done",
                extractionOcrText: extractionResult.ocrText ?? undefined,
                extractionOcrMs: timing?.ocrMs,
                extractionLlmMs: timing?.llmMs,
                amount: data.amount ?? undefined,
                currency: data.currency ?? undefined,
                merchant: data.merchant ?? undefined,
                categories: data.category,
                expenseDate,
              });

              // Check if we can auto-complete (all required fields present)
              const updatedExpense = yield* repo.getById(expense.id);

              if (updatedExpense && hasRequiredFields(updatedExpense)) {
                // Auto-complete: compute base currency and finalize
                const baseCurrency = yield* settingsService.getBaseCurrency();
                const baseAmount = yield* currencyService.convert(
                  updatedExpense.amount!,
                  updatedExpense.currency!,
                  baseCurrency
                );

                const completedExpense = yield* repo.complete(expense.id, {
                  amount: updatedExpense.amount!,
                  currency: updatedExpense.currency!,
                  baseAmount,
                  baseCurrency,
                  merchant: updatedExpense.merchant!,
                  expenseDate: updatedExpense.expenseDate!,
                  categories: updatedExpense.categories ?? undefined,
                });

                return {
                  expense: completedExpense!,
                  extraction: {
                    success: true,
                    data: {
                      amount: data.amount,
                      currency: data.currency,
                      merchant: data.merchant,
                      date: data.date,
                      categories: data.category,
                    },
                    error: null,
                    timing: timing
                      ? { ocrMs: timing.ocrMs, llmMs: timing.llmMs }
                      : null,
                  },
                  needsReview: false,
                };
              }

              // Needs review: return draft expense
              return {
                expense: updatedExpense!,
                extraction: {
                  success: true,
                  data: {
                    amount: data.amount,
                    currency: data.currency,
                    merchant: data.merchant,
                    date: data.date,
                    categories: data.category,
                  },
                  error: null,
                  timing: timing
                    ? { ocrMs: timing.ocrMs, llmMs: timing.llmMs }
                    : null,
                },
                needsReview: true,
              };
            } else {
              // Extraction failed
              yield* repo.applyExtraction(expense.id, {
                extractionStatus: "failed",
                extractionOcrText: extractionResult.ocrText ?? undefined,
                extractionError: extractionResult.error ?? "Extraction failed",
              });

              const failedExpense = yield* repo.getById(expense.id);

              return {
                expense: failedExpense!,
                extraction: {
                  success: false,
                  data: null,
                  error: extractionResult.error ?? "Extraction failed",
                  timing: null,
                },
                needsReview: true,
              };
            }
          }),

        /**
         * Complete a draft expense by validating required fields and
         * transitioning to complete state.
         */
        complete: (id: string, overrides?: CompleteExpenseInput) =>
          Effect.gen(function* () {
            // 1. Get the expense
            const expense = yield* repo.getById(id);
            if (!expense) {
              return yield* Effect.fail(new ExpenseNotFoundError({ id }));
            }

            // 2. Check if already complete
            if (expense.state === "complete") {
              return yield* Effect.fail(new ExpenseAlreadyCompleteError({ id }));
            }

            // 3. Merge overrides with existing data
            const amount = overrides?.amount ?? expense.amount;
            const currency = overrides?.currency ?? expense.currency;
            const merchant = overrides?.merchant ?? expense.merchant;
            const description = overrides?.description ?? expense.description;
            const categories = overrides?.categories ?? expense.categories;

            // For expenseDate: use override, then existing, then fall back to receiptCapturedAt
            const expenseDate =
              overrides?.expenseDate ??
              expense.expenseDate ??
              expense.receiptCapturedAt;

            // 4. Validate required fields
            const missingFields: string[] = [];
            if (amount === null || amount === undefined) missingFields.push("amount");
            if (!currency) missingFields.push("currency");
            if (!merchant) missingFields.push("merchant");

            if (missingFields.length > 0) {
              return yield* Effect.fail(
                new MissingRequiredFieldsError({ id, missingFields })
              );
            }

            // 5. Compute base currency conversion
            const baseCurrency = yield* settingsService.getBaseCurrency();
            const baseAmount = yield* currencyService.convert(
              amount!,
              currency!,
              baseCurrency
            );

            // 6. Complete the expense
            const completedExpense = yield* repo.complete(id, {
              amount: amount!,
              currency: currency!,
              baseAmount,
              baseCurrency,
              merchant: merchant!,
              expenseDate: expenseDate!,
              description: description ?? undefined,
              categories: categories ?? undefined,
            });

            return completedExpense!;
          }),

        /**
         * Update an expense's data. If the expense is complete and amount/currency
         * changes, recalculates baseAmount.
         */
        update: (
          id: string,
          data: UpdateExpenseInput
        ): Effect.Effect<Expense | null, Error> =>
          Effect.gen(function* () {
            const expense = yield* repo.getById(id);
            if (!expense) {
              return null;
            }

            // If amount or currency changed on a complete expense, recalculate base
            if (
              expense.state === "complete" &&
              (data.amount !== undefined || data.currency !== undefined)
            ) {
              const amount = data.amount ?? expense.amount!;
              const currency = data.currency ?? expense.currency!;
              const baseCurrency = yield* settingsService.getBaseCurrency();
              const baseAmount = yield* currencyService.convert(
                amount,
                currency,
                baseCurrency
              );

              return yield* repo.update(id, {
                ...data,
                baseAmount,
                baseCurrency,
              });
            }

            return yield* repo.update(id, data);
          }),

        // ======================================================================
        // Queries
        // ======================================================================

        /**
         * Get expense by ID
         */
        getById: (id: string) => repo.getById(id),

        /**
         * Get all expenses (both draft and complete)
         */
        listAll: () => repo.getAll(),

        /**
         * Get only complete expenses (for reports)
         */
        list: () => repo.getComplete(),

        /**
         * Get expenses by user
         */
        getByUser: (userId: string) => repo.getByUser(userId),

        /**
         * Get draft expenses pending review
         */
        getPendingReview: () => repo.getPendingReview(),

        /**
         * Get count of expenses pending review
         */
        pendingReviewCount: () => repo.countPendingReview(),

        /**
         * Delete an expense
         */
        delete: (id: string) => repo.delete(id),

        // ======================================================================
        // Domain Helpers
        // ======================================================================

        /**
         * Check if an expense needs review
         */
        needsReview: (expense: Expense): boolean => {
          return (
            expense.state === "draft" &&
            expense.extractionStatus === "done" &&
            !hasRequiredFields(expense)
          );
        },

        /**
         * Get missing fields for an expense
         */
        getMissingFields: (expense: Expense): string[] => {
          return getMissingFields(expense);
        },

        // ======================================================================
        // Extraction Health Check
        // ======================================================================

        /**
         * Check if the extraction service (Ollama) is available
         */
        checkExtractionHealth: () => extractionService.checkOllamaHealth(),
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
