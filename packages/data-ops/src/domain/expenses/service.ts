import { Effect, Data } from "effect";
import { ExpenseRepo } from "./repo";
import { ExpenseAggregate, type Expense } from "./schema";
import {
  type CaptureExpenseInput,
  type CompleteExpenseInput,
  type UpdateExpenseInput,
  type CaptureExpenseResult,
} from "./dto";
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
            // 1. Convert File to Buffer and generate storage key
            const arrayBuffer = yield* Effect.promise(() =>
              input.image.arrayBuffer()
            );
            const imageBuffer = Buffer.from(arrayBuffer);
            const fileName = input.image.name || "upload.png";
            const contentType = input.image.type || "image/png";
            const imageKey = `expenses/${Date.now()}-${fileName}`;

            // 2. Save image to bucket storage
            yield* bucket.put(imageKey, imageBuffer, {
              httpMetadata: { contentType },
            });

            // 3. Create expense aggregate and save
            let expense = ExpenseAggregate.createDraft({
              userId: input.userId,
              receiptImageKey: imageKey,
            });
            expense = yield* repo.save(expense);

            // 4. Start extraction and save
            expense = expense.startExtraction();
            expense = yield* repo.save(expense);

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

            // 6. Handle extraction failure (fail early)
            if (!extractionResult.success || !extractionResult.data) {
              expense = expense.applyExtraction({
                status: "failed",
                ocrText: extractionResult.ocrText ?? null,
                error: extractionResult.error ?? "Extraction failed",
              });
              expense = yield* repo.save(expense);

              return {
                expense,
                extraction: {
                  success: false,
                  data: null,
                  error: extractionResult.error ?? "Extraction failed",
                  timing: null,
                },
                needsReview: true,
              };
            }

            // 7. Apply successful extraction data
            const { data, timing } = extractionResult;
            const expenseDate = data.date ? new Date(data.date) : undefined;

            expense = expense.applyExtraction({
              status: "done",
              ocrText: extractionResult.ocrText ?? null,
              timing: timing ? { ocrMs: timing.ocrMs, llmMs: timing.llmMs } : null,
              amount: data.amount ?? null,
              currency: data.currency ?? null,
              merchant: data.merchant ?? null,
              categories: data.category ?? null,
              expenseDate: expenseDate ?? null,
            });

            // 8. Auto-complete if all required fields present
            if (expense.isValidExpense()) {
              const baseCurrency = yield* settingsService.getBaseCurrency();
              const baseAmount = yield* currencyService.convert(
                expense.amount!,
                expense.currency!,
                baseCurrency
              );

              expense = expense.complete({
                baseAmount,
                baseCurrency,
              });
            }

            // 9. Save and return
            expense = yield* repo.save(expense);

            return {
              expense,
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
                timing: timing ? { ocrMs: timing.ocrMs, llmMs: timing.llmMs } : null,
              },
              needsReview: expense.state === "draft",
            };
          }),

        /**
         * Complete a draft expense by validating required fields and
         * transitioning to complete state.
         */
        complete: (input: CompleteExpenseInput) =>
          Effect.gen(function* () {
            const { id, ...overrides } = input;

            // 1. Get the expense
            let expense = yield* repo.getById(id);
            if (!expense) {
              return yield* Effect.fail(new ExpenseNotFoundError({ id }));
            }

            // 2. Check if already complete
            if (expense.state === "complete") {
              return yield* Effect.fail(new ExpenseAlreadyCompleteError({ id }));
            }

            // 3. Merge overrides with existing data
            const amount = overrides.amount ?? expense.amount;
            const currency = overrides.currency ?? expense.currency;
            const merchant = overrides.merchant ?? expense.merchant;
            const description = overrides.description ?? expense.description;
            const categories = overrides.categories ?? expense.categories;
            const expenseDate = overrides.expenseDate ?? expense.expenseDate;

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

            // 6. Complete via aggregate method and save
            expense = expense.complete({
              amount: amount!,
              currency: currency!,
              baseAmount,
              baseCurrency,
              merchant: merchant!,
              expenseDate,
              description: description ?? undefined,
              categories: categories ?? undefined,
            });

            return yield* repo.save(expense);
          }),

        /**
         * Update an expense's data. If the expense is complete and amount/currency
         * changes, recalculates baseAmount.
         */
        update: (input: UpdateExpenseInput): Effect.Effect<Expense | null, Error> =>
          Effect.gen(function* () {
            const { id, ...data } = input;

            let expense = yield* repo.getById(id);
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

              expense = expense.update({
                ...data,
                baseAmount,
                baseCurrency,
              });
            } else {
              expense = expense.update(data);
            }

            return yield* repo.save(expense);
          }),

        // ======================================================================
        // Domain Helpers
        // ======================================================================

        /**
         * Check if an expense needs review
         */
        needsReview: (expense: Expense): boolean => {
          return ExpenseAggregate.needsReview(expense);
        },

        /**
         * Get missing fields for an expense
         */
        getMissingFields: (expense: Expense): string[] => {
          return ExpenseAggregate.getMissingFields(expense);
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
