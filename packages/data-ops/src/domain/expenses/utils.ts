/**
 * Expense domain utilities - type guards, persistence mapping, and helpers.
 */
import type {
  Expense,
  ExpenseRow,
  ExpenseInsert,
  PendingExpense,
  PendingReviewExpense,
  ConfirmedExpense,
} from "./schema";

// ============================================================================
// Type Guards
// ============================================================================

export const isPending = (expense: Expense): expense is PendingExpense =>
  expense.state === "pending";

export const isPendingReview = (expense: Expense): expense is PendingReviewExpense =>
  expense.state === "pending-review";

export const isConfirmed = (expense: Expense): expense is ConfirmedExpense =>
  expense.state === "confirmed";

// ============================================================================
// Persistence Mapping
// ============================================================================

/**
 * Parse a database row into the appropriate expense variant.
 * Validates and narrows the type based on the state discriminator.
 */
export const fromRow = (row: ExpenseRow): Expense => {
  switch (row.state) {
    case "pending":
      return {
        state: "pending",
        id: row.id,
        userId: row.userId,
        imageKey: row.imageKey,
        capturedAt: row.capturedAt,
        createdAt: row.createdAt,
      };

    case "pending-review":
      return {
        state: "pending-review",
        id: row.id,
        userId: row.userId,
        imageKey: row.imageKey,
        capturedAt: row.capturedAt,
        createdAt: row.createdAt,
        amount: row.amount,
        currency: row.currency,
        merchant: row.merchant,
        description: row.description,
        categories: row.categories ?? [],
        expenseDate: row.expenseDate,
        extractionMetadata: row.extractionMetadata,
      };

    case "confirmed":
      // Confirmed expenses must have all required fields
      if (
        row.amount === null ||
        row.currency === null ||
        row.baseAmount === null ||
        row.baseCurrency === null ||
        row.merchant === null ||
        row.confirmedAt === null ||
        row.expenseDate === null
      ) {
        throw new Error(
          `Confirmed expense ${row.id} is missing required fields`
        );
      }
      return {
        state: "confirmed",
        id: row.id,
        userId: row.userId,
        imageKey: row.imageKey,
        capturedAt: row.capturedAt,
        createdAt: row.createdAt,
        confirmedAt: row.confirmedAt,
        amount: row.amount,
        currency: row.currency,
        baseAmount: row.baseAmount,
        baseCurrency: row.baseCurrency,
        merchant: row.merchant,
        description: row.description,
        categories: row.categories ?? [],
        expenseDate: row.expenseDate,
        extractionMetadata: row.extractionMetadata,
      };
  }
};

/**
 * Convert an expense variant to a database row for persistence.
 */
export const toRow = (expense: Expense): ExpenseInsert => {
  switch (expense.state) {
    case "pending":
      return {
        id: expense.id,
        userId: expense.userId,
        state: "pending",
        imageKey: expense.imageKey,
        capturedAt: expense.capturedAt,
        createdAt: expense.createdAt,
        extractionMetadata: null,
        amount: null,
        currency: null,
        baseAmount: null,
        baseCurrency: null,
        merchant: null,
        description: null,
        categories: [],
        expenseDate: null,
        confirmedAt: null,
      };

    case "pending-review":
      return {
        id: expense.id,
        userId: expense.userId,
        state: "pending-review",
        imageKey: expense.imageKey,
        capturedAt: expense.capturedAt,
        createdAt: expense.createdAt,
        extractionMetadata: expense.extractionMetadata,
        amount: expense.amount,
        currency: expense.currency,
        baseAmount: null,
        baseCurrency: null,
        merchant: expense.merchant,
        description: expense.description,
        categories: expense.categories,
        expenseDate: expense.expenseDate,
        confirmedAt: null,
      };

    case "confirmed":
      return {
        id: expense.id,
        userId: expense.userId,
        state: "confirmed",
        imageKey: expense.imageKey,
        capturedAt: expense.capturedAt,
        createdAt: expense.createdAt,
        confirmedAt: expense.confirmedAt,
        extractionMetadata: expense.extractionMetadata,
        amount: expense.amount,
        currency: expense.currency,
        baseAmount: expense.baseAmount,
        baseCurrency: expense.baseCurrency,
        merchant: expense.merchant,
        description: expense.description,
        categories: expense.categories,
        expenseDate: expense.expenseDate,
      };
  }
};

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * Get list of missing required fields for confirmation.
 */
export const getMissingFields = (
  expense: PendingReviewExpense
): ("amount" | "currency" | "merchant" | "expenseDate")[] => {
  const missing: ("amount" | "currency" | "merchant" | "expenseDate")[] = [];
  if (expense.amount === null) missing.push("amount");
  if (expense.currency === null) missing.push("currency");
  if (expense.merchant === null) missing.push("merchant");
  if (expense.expenseDate === null) missing.push("expenseDate");
  return missing;
};

/**
 * Check if a pending-review expense has all required fields for confirmation.
 */
export const canConfirm = (expense: PendingReviewExpense): boolean =>
  getMissingFields(expense).length === 0;

/**
 * Get display amount (prefer base currency conversion).
 */
export const getDisplayAmount = (expense: Expense): number | null => {
  if (expense.state === "confirmed") {
    return expense.baseAmount;
  }
  if (expense.state === "pending-review") {
    return expense.amount;
  }
  return null;
};

/**
 * Get display date (expense date or captured date).
 */
export const getDisplayDate = (expense: Expense): Date => {
  if (expense.state === "confirmed") {
    return expense.expenseDate;
  }
  if (expense.state === "pending-review" && expense.expenseDate) {
    return expense.expenseDate;
  }
  return expense.capturedAt;
};
