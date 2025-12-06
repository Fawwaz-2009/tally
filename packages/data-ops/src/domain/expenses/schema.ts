import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import {
  expensesTable,
  expenseState,
  extractionStatus,
  type ExpenseState,
  type ExtractionStatus,
} from "../../db";
import z from "zod/v4";

// Re-export types
export { expenseState, extractionStatus, type ExpenseState, type ExtractionStatus };

// Database schemas (auto-generated from drizzle)
export const ExpenseInsertSchema = createInsertSchema(expensesTable);
export type ExpenseInsert = z.infer<typeof ExpenseInsertSchema>;

export const ExpenseSelectSchema = createSelectSchema(expensesTable);
export type Expense = z.infer<typeof ExpenseSelectSchema>;

// ============================================================================
// Value Objects
// ============================================================================

/**
 * Receipt value object - represents the captured receipt image
 */
export const ReceiptSchema = z.object({
  imageKey: z.string().nullable(),
  capturedAt: z.date(),
});
export type Receipt = z.infer<typeof ReceiptSchema>;

/**
 * Extraction value object - represents the OCR/LLM extraction results
 */
export const ExtractionSchema = z.object({
  status: z.enum(extractionStatus),
  ocrText: z.string().nullable(),
  error: z.string().nullable(),
  timing: z
    .object({
      ocrMs: z.number(),
      llmMs: z.number(),
    })
    .nullable(),
});
export type Extraction = z.infer<typeof ExtractionSchema>;

/**
 * Expense data - the core expense information
 */
export const ExpenseDataSchema = z.object({
  amount: z.number().int().positive().nullable(),
  currency: z.string().length(3).nullable(),
  baseAmount: z.number().int().nullable(),
  baseCurrency: z.string().length(3).nullable(),
  merchant: z.string().nullable(),
  description: z.string().nullable(),
  categories: z.array(z.string()).nullable(),
  expenseDate: z.date().nullable(),
});
export type ExpenseData = z.infer<typeof ExpenseDataSchema>;

// ============================================================================
// Domain Operation Inputs
// ============================================================================

/**
 * Input for capturing a new expense from a receipt image
 */
export const CaptureExpenseInputSchema = z.object({
  userId: z.string().min(1),
  imageBase64: z.string(),
  fileName: z.string(),
  contentType: z.string(),
});
export type CaptureExpenseInput = z.infer<typeof CaptureExpenseInputSchema>;

/**
 * Input for completing a draft expense
 * All fields optional - merges with extracted data
 */
export const CompleteExpenseInputSchema = z.object({
  amount: z.number().int().positive().optional(),
  currency: z.string().length(3).optional(),
  merchant: z.string().optional(),
  description: z.string().optional(),
  categories: z.array(z.string()).optional(),
  expenseDate: z.date().optional(),
});
export type CompleteExpenseInput = z.infer<typeof CompleteExpenseInputSchema>;

/**
 * Input for updating an expense
 */
export const UpdateExpenseInputSchema = z.object({
  amount: z.number().int().positive().optional(),
  currency: z.string().length(3).optional(),
  merchant: z.string().optional(),
  description: z.string().optional(),
  categories: z.array(z.string()).optional(),
  expenseDate: z.date().optional(),
});
export type UpdateExpenseInput = z.infer<typeof UpdateExpenseInputSchema>;

// ============================================================================
// Domain Result Types
// ============================================================================

/**
 * Result of expense capture operation
 */
export interface CaptureExpenseResult {
  expense: Expense;
  extraction: {
    success: boolean;
    data: {
      amount: number | null;
      currency: string | null;
      merchant: string | null;
      date: string | null;
      categories: string[];
    } | null;
    error: string | null;
    timing: {
      ocrMs: number;
      llmMs: number;
    } | null;
  };
  needsReview: boolean;
}

/**
 * Required fields for a complete expense
 */
export const REQUIRED_EXPENSE_FIELDS = [
  "amount",
  "currency",
  "merchant",
  "expenseDate",
] as const;

/**
 * Check if an expense has all required fields for completion
 */
export function hasRequiredFields(expense: Expense): boolean {
  return (
    expense.amount !== null &&
    expense.currency !== null &&
    expense.merchant !== null &&
    expense.expenseDate !== null
  );
}

/**
 * Get missing required fields for an expense
 */
export function getMissingFields(expense: Expense): string[] {
  const missing: string[] = [];
  if (expense.amount === null) missing.push("amount");
  if (expense.currency === null) missing.push("currency");
  if (expense.merchant === null) missing.push("merchant");
  if (expense.expenseDate === null) missing.push("expenseDate");
  return missing;
}
