import { Effect, Data } from "effect";
import { ExpenseRepo } from "./repo";
import {
  type Expense,
  type PendingExpense,
  type PendingReviewExpense,
  type ConfirmedExpense,
  type ExtractionMetadata,
  createPending,
  applyExtraction,
  confirm as confirmExpense,
  update as updateExpense,
  canConfirm,
  getMissingFields,
  isPendingReview,
} from "./schema";
import {
  type CaptureExpenseInput,
  type ConfirmExpenseInput,
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

export class ExpenseAlreadyConfirmedError extends Data.TaggedError(
  "ExpenseAlreadyConfirmedError"
)<{
  id: string;
}> {}

export class ExpenseNotPendingReviewError extends Data.TaggedError(
  "ExpenseNotPendingReviewError"
)<{
  id: string;
  currentState: string;
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
         * Creates a pending expense, runs OCR/LLM, and transitions to
         * pending-review (or confirmed if auto-complete conditions are met).
         */
        capture: (input: CaptureExpenseInput) =>
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

            // 3. Create pending expense and save
            const pending: PendingExpense = createPending({
              userId: input.userId,
              imageKey,
            });
            yield* repo.save(pending);

            // 4. Run extraction with error handling
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

            // 5. Build extraction metadata
            const extractionMetadata: ExtractionMetadata = {
              ocrText: extractionResult.ocrText ?? null,
              error: extractionResult.error ?? null,
              timing: extractionResult.timing
                ? { ocrMs: extractionResult.timing.ocrMs, llmMs: extractionResult.timing.llmMs }
                : null,
            };

            // 6. Apply extraction (always transitions to pending-review)
            const expenseDate = extractionResult.data?.date
              ? new Date(extractionResult.data.date)
              : null;

            let pendingReview: PendingReviewExpense = applyExtraction(pending, {
              amount: extractionResult.data?.amount ?? null,
              currency: extractionResult.data?.currency ?? null,
              merchant: extractionResult.data?.merchant ?? null,
              categories: extractionResult.data?.category ?? [],
              expenseDate,
              extractionMetadata,
            });

            // 7. Check if can auto-confirm
            if (canConfirm(pendingReview)) {
              const baseCurrency = yield* settingsService.getBaseCurrency();
              const baseAmount = yield* currencyService.convert(
                pendingReview.amount!,
                pendingReview.currency!,
                baseCurrency
              );

              const confirmed: ConfirmedExpense = confirmExpense(pendingReview, {
                amount: pendingReview.amount!,
                currency: pendingReview.currency!,
                baseAmount,
                baseCurrency,
                merchant: pendingReview.merchant!,
                expenseDate: pendingReview.expenseDate!,
                categories: pendingReview.categories,
              });

              yield* repo.save(confirmed);

              return {
                expense: confirmed,
                extraction: {
                  success: extractionResult.success,
                  data: extractionResult.data
                    ? {
                        amount: extractionResult.data.amount ?? null,
                        currency: extractionResult.data.currency ?? null,
                        merchant: extractionResult.data.merchant ?? null,
                        date: extractionResult.data.date ?? null,
                        categories: extractionResult.data.category ?? [],
                      }
                    : null,
                  error: extractionResult.error ?? null,
                  timing: extractionResult.timing
                    ? { ocrMs: extractionResult.timing.ocrMs, llmMs: extractionResult.timing.llmMs }
                    : null,
                },
                needsReview: false,
              };
            }

            // 8. Save pending-review and return
            const savedPendingReview = (yield* repo.save(pendingReview)) as PendingReviewExpense;

            return {
              expense: savedPendingReview,
              extraction: {
                success: extractionResult.success,
                data: extractionResult.data
                  ? {
                      amount: extractionResult.data.amount ?? null,
                      currency: extractionResult.data.currency ?? null,
                      merchant: extractionResult.data.merchant ?? null,
                      date: extractionResult.data.date ?? null,
                      categories: extractionResult.data.category ?? [],
                    }
                  : null,
                error: extractionResult.error ?? null,
                timing: extractionResult.timing
                  ? { ocrMs: extractionResult.timing.ocrMs, llmMs: extractionResult.timing.llmMs }
                  : null,
              },
              needsReview: true,
            };
          }),

        /**
         * Confirm a pending-review expense by validating required fields and
         * transitioning to confirmed state.
         */
        confirm: (input: ConfirmExpenseInput) =>
          Effect.gen(function* () {
            const { id, ...overrides } = input;

            // 1. Get the expense
            const expense = yield* repo.getById(id);
            if (!expense) {
              return yield* Effect.fail(new ExpenseNotFoundError({ id }));
            }

            // 2. Must be pending-review to confirm
            if (!isPendingReview(expense)) {
              if (expense.state === "confirmed") {
                return yield* Effect.fail(new ExpenseAlreadyConfirmedError({ id }));
              }
              return yield* Effect.fail(
                new ExpenseNotPendingReviewError({ id, currentState: expense.state })
              );
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
            if (!expenseDate) missingFields.push("expenseDate");

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

            // 6. Confirm and save
            const confirmed = confirmExpense(expense, {
              amount: amount!,
              currency: currency!,
              baseAmount,
              baseCurrency,
              merchant: merchant!,
              description,
              categories: categories ? [...categories] : undefined,
              expenseDate: expenseDate!,
            });

            return yield* repo.save(confirmed);
          }),

        /**
         * Update a pending-review expense's data.
         * Only pending-review expenses can be updated.
         */
        update: (input: UpdateExpenseInput) =>
          Effect.gen(function* () {
            const { id, ...data } = input;

            const expense = yield* repo.getById(id);
            if (!expense) {
              return null;
            }

            // Only pending-review expenses can be updated
            if (!isPendingReview(expense)) {
              return null;
            }

            const updated = updateExpense(expense, {
              amount: data.amount,
              currency: data.currency,
              merchant: data.merchant,
              description: data.description,
              categories: data.categories ? [...data.categories] : undefined,
              expenseDate: data.expenseDate,
            });

            return yield* repo.save(updated);
          }),

        // ======================================================================
        // Domain Helpers
        // ======================================================================

        /**
         * Get missing fields for an expense
         */
        getMissingFields: (expense: Expense): string[] => {
          if (isPendingReview(expense)) {
            return getMissingFields(expense);
          }
          return [];
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
