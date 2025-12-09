/**
 * Expense domain schemas - core business model.
 * For API inputs/outputs, see dto.ts
 */
import {
  createInsertSchema,
  createSelectSchema,
} from "@handfish/drizzle-effect";
import { Schema } from "effect";
import {
  expensesTable,
  expenseState,
  extractionStatus,
  type ExpenseState,
  type ExtractionStatus,
} from "../../db/schema";

// Re-export domain enums and types
export {
  expenseState,
  extractionStatus,
  type ExpenseState,
  type ExtractionStatus,
};

// ============================================================================
// Aggregate Method Input Types
// ============================================================================

/**
 * Input for applying extraction results to an expense.
 */
export interface ApplyExtractionData {
  status: "done" | "failed";
  ocrText?: string | null;
  error?: string | null;
  timing?: { ocrMs: number; llmMs: number } | null;
  amount?: number | null;
  currency?: string | null;
  merchant?: string | null;
  categories?: string[] | null;
  expenseDate?: Date | null;
}

/**
 * Input for completing an expense (transitioning to complete state).
 * baseAmount and baseCurrency are required - calculated by service layer.
 */
export interface CompleteOverrides {
  amount?: number;
  currency?: string;
  baseAmount: number;
  baseCurrency: string;
  merchant?: string;
  description?: string | null;
  categories?: string[] | null;
  expenseDate?: Date | null;
}

/**
 * Input for updating expense fields.
 * Accepts null values to support clearing fields.
 */
export interface UpdateChanges {
  amount?: number | null;
  currency?: string | null;
  baseAmount?: number | null;
  baseCurrency?: string | null;
  merchant?: string | null;
  description?: string | null;
  categories?: string[] | null;
  expenseDate?: Date | null;
}

// ============================================================================
// Table and Domain Schemas
// ============================================================================

/**
 * Override categories field to use proper string[] type instead of generic JSON.
 */
const CategoriesSchema = Schema.mutable(Schema.Array(Schema.String));

/**
 * Expense insert schema - for creating new expenses.
 */
export const ExpenseTableSchema = createInsertSchema(expensesTable, {
  categories: CategoriesSchema,
});
export type ExpenseInsert = Schema.Schema.Type<typeof ExpenseTableSchema>;

/**
 * Expense select schema - for reading existing expenses.
 */
export const ExpenseSelectSchema = createSelectSchema(expensesTable, {
  categories: Schema.NullOr(CategoriesSchema),
});
export type ExpenseSelect = Schema.Schema.Type<typeof ExpenseSelectSchema>;

/**
 * Aggregate schema - rich domain model with value objects.
 * This is the primary domain entity used by services and UI.
 */
export class ExpenseAggregate extends Schema.Class<ExpenseAggregate>(
  "ExpenseAggregate",
)({
  // Override id to be required (drizzle makes it optional for inserts)
  id: Schema.NullOr(Schema.String),
  ...ExpenseSelectSchema.omit(
    "id",
    "extractionStatus",
    "extractionOcrText",
    "extractionError",
    "extractionOcrMs",
    "extractionLlmMs",
    "receiptImageKey",
    "receiptCapturedAt",
    "categories",
  ).fields,
  categories: CategoriesSchema,
  // Receipt owns extraction lifecycle
  receipt: Schema.Struct({
    imageKey: Schema.NullOr(Schema.String),
    capturedAt: Schema.DateFromSelf,
    extraction: Schema.Struct({
      status: Schema.Literal("pending", "processing", "done", "failed"),
      ocrText: Schema.NullOr(Schema.String),
      error: Schema.NullOr(Schema.String),
      timing: Schema.NullOr(
        Schema.Struct({
          ocrMs: Schema.Number,
          llmMs: Schema.Number,
        }),
      ),
    }),
  }),
}) {
  isValidExpense() {
    return ExpenseAggregate.isValid(this as unknown as Expense);
  }
  getMissingFields() {
    return ExpenseAggregate.getMissingFields(this as unknown as Expense);
  }
  static fromPersistence(row: ExpenseSelect): ExpenseAggregate {
    return new ExpenseAggregate({
      // Core fields (id always exists when reading from DB)
      id: row.id!,
      userId: row.userId,
      state: row.state,
      amount: row.amount,
      currency: row.currency,
      baseAmount: row.baseAmount,
      baseCurrency: row.baseCurrency,
      merchant: row.merchant,
      description: row.description,
      categories: row.categories ?? [],
      expenseDate: row.expenseDate,
      createdAt: row.createdAt,
      completedAt: row.completedAt,

      // Hydrate receipt value object (includes extraction)
      receipt: {
        imageKey: row.receiptImageKey ?? null,
        capturedAt: row.receiptCapturedAt!,
        extraction: {
          status: row.extractionStatus ?? "pending",
          ocrText: row.extractionOcrText ?? null,
          error: row.extractionError ?? null,
          timing:
            row.extractionOcrMs !== undefined &&
            row.extractionOcrMs !== null &&
            row.extractionLlmMs !== undefined &&
            row.extractionLlmMs !== null
              ? { ocrMs: row.extractionOcrMs, llmMs: row.extractionLlmMs }
              : null,
        },
      },
    });
  }
  toPersistence(): ExpenseInsert {
    return {
      // Core fields from the aggregate
      id: this.id ?? undefined,
      userId: this.userId,
      state: this.state,
      amount: this.amount,
      currency: this.currency,
      baseAmount: this.baseAmount,
      baseCurrency: this.baseCurrency,
      merchant: this.merchant,
      description: this.description,
      categories: this.categories ?? [],
      expenseDate: this.expenseDate,
      createdAt: this.createdAt,
      completedAt: this.completedAt,

      // Flatten receipt.extraction
      extractionStatus: this.receipt.extraction.status,
      extractionOcrText: this.receipt.extraction.ocrText,
      extractionError: this.receipt.extraction.error,
      extractionOcrMs: this.receipt.extraction.timing?.ocrMs ?? null,
      extractionLlmMs: this.receipt.extraction.timing?.llmMs ?? null,

      // Flatten receipt fields
      receiptImageKey: this.receipt.imageKey,
      receiptCapturedAt: this.receipt.capturedAt,
    };
  }

  // ==========================================================================
  // State Transition Methods (pure, sync, infallible)
  // ==========================================================================

  /**
   * Start extraction processing.
   * Returns new aggregate with receipt.extraction.status = "processing".
   */
  startExtraction(): ExpenseAggregate {
    return new ExpenseAggregate({
      ...this,
      receipt: {
        ...this.receipt,
        extraction: {
          ...this.receipt.extraction,
          status: "processing" as const,
        },
      },
    });
  }

  /**
   * Apply extraction results to the expense.
   * Extracted data (amount, currency, etc.) goes on expense.
   * Extraction lifecycle (status, ocrText, timing) goes on receipt.
   */
  applyExtraction(data: ApplyExtractionData): ExpenseAggregate {
    return new ExpenseAggregate({
      ...this,
      // Extracted data goes on expense
      amount: data.amount ?? this.amount,
      currency: data.currency ?? this.currency,
      merchant: data.merchant ?? this.merchant,
      categories: data.categories ?? this.categories,
      expenseDate: data.expenseDate ?? this.expenseDate,
      // Extraction lifecycle goes on receipt
      receipt: {
        ...this.receipt,
        extraction: {
          status: data.status,
          ocrText: data.ocrText ?? this.receipt.extraction.ocrText,
          error: data.error ?? this.receipt.extraction.error,
          timing: data.timing ?? this.receipt.extraction.timing,
        },
      },
    });
  }

  /**
   * Complete the expense (transition to complete state).
   * Returns new aggregate with state = "complete" and completedAt set.
   * Note: Service layer validates preconditions before calling this.
   */
  complete(overrides: CompleteOverrides): ExpenseAggregate {
    return new ExpenseAggregate({
      ...this,
      state: "complete" as const,
      amount: overrides.amount ?? this.amount,
      currency: overrides.currency ?? this.currency,
      baseAmount: overrides.baseAmount,
      baseCurrency: overrides.baseCurrency,
      merchant: overrides.merchant ?? this.merchant,
      description: overrides.description ?? this.description,
      categories: overrides.categories ?? this.categories,
      expenseDate:
        overrides.expenseDate ?? this.expenseDate ?? this.receipt.capturedAt,
      completedAt: new Date(),
    });
  }

  /**
   * Update expense fields.
   * Returns new aggregate with applied changes.
   */
  update(changes: UpdateChanges): ExpenseAggregate {
    return new ExpenseAggregate({
      ...this,
      amount: changes.amount ?? this.amount,
      currency: changes.currency ?? this.currency,
      baseAmount: changes.baseAmount ?? this.baseAmount,
      baseCurrency: changes.baseCurrency ?? this.baseCurrency,
      merchant: changes.merchant ?? this.merchant,
      description: changes.description ?? this.description,
      categories: changes.categories ?? this.categories,
      expenseDate: changes.expenseDate ?? this.expenseDate,
    });
  }

  // ==========================================================================
  // Static Query Methods (work on plain data - client & server)
  // ==========================================================================

  /** Check if expense has all required fields for completion */
  static isValid(expense: Expense): boolean {
    return (
      expense.amount !== null &&
      expense.currency !== null &&
      expense.merchant !== null &&
      expense.expenseDate !== null
    );
  }

  /** Get list of missing required fields */
  static getMissingFields(
    expense: Expense,
  ): ("amount" | "currency" | "merchant" | "expenseDate")[] {
    const missing: ("amount" | "currency" | "merchant" | "expenseDate")[] = [];
    if (expense.amount === null) missing.push("amount");
    if (expense.currency === null) missing.push("currency");
    if (expense.merchant === null) missing.push("merchant");
    if (expense.expenseDate === null) missing.push("expenseDate");
    return missing;
  }

  /** Check if expense needs manual review */
  static needsReview(expense: Expense): boolean {
    return (
      expense.state === "draft" &&
      expense.receipt.extraction.status === "done" &&
      !ExpenseAggregate.isValid(expense)
    );
  }

  /** Get display amount (prefer base currency conversion) */
  static getDisplayAmount(expense: Expense): number | null {
    return expense.baseAmount ?? expense.amount;
  }

  /** Get display date (prefer expense date, fallback to captured) */
  static getDisplayDate(expense: Expense): Date {
    return expense.expenseDate ?? expense.receipt.capturedAt;
  }

  // ==========================================================================
  // Static Factory Methods
  // ==========================================================================

  /**
   * Create a new draft expense.
   * ID is generated client-side (UUID pattern).
   */
  static createDraft(params: {
    userId: string;
    receiptImageKey?: string;
  }): ExpenseAggregate {
    return new ExpenseAggregate({
      id: crypto.randomUUID(),
      userId: params.userId,
      state: "draft",
      amount: null,
      currency: null,
      baseAmount: null,
      baseCurrency: null,
      merchant: null,
      description: null,
      categories: [],
      expenseDate: null,
      createdAt: new Date(),
      completedAt: null,
      receipt: {
        imageKey: params.receiptImageKey ?? null,
        capturedAt: new Date(),
        extraction: {
          status: "pending",
          ocrText: null,
          error: null,
          timing: null,
        },
      },
    });
  }
}

// Instance methods that won't be available on plain objects (after tRPC serialization)
type InstanceMethods =
  | "isValidExpense"
  | "getMissingFields"
  | "toPersistence"
  | "startExtraction"
  | "applyExtraction"
  | "complete"
  | "update";

/** Plain data type for client consumption and factories */
export type Expense = Omit<
  Schema.Schema.Type<typeof ExpenseAggregate>,
  InstanceMethods
>;
