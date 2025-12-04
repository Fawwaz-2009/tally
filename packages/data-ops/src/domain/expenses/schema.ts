import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { expensesTable, expenseStatus, type ExpenseStatus } from "../../db";
import z from "zod/v4";

export const ExpenseInsertSchema = createInsertSchema(expensesTable);
export type ExpenseInsert = z.infer<typeof ExpenseInsertSchema>;

export const ExpenseSelectSchema = createSelectSchema(expensesTable);
export type Expense = z.infer<typeof ExpenseSelectSchema>;

// Schema for creating a new expense (minimal, before AI processing)
export const CreateExpenseSchema = z.object({
  userId: z.string().min(1),
  screenshotPath: z.string().optional(),
  // Allow manual entry without screenshot
  amount: z.number().int().positive().optional(), // In cents
  currency: z.string().length(3).optional(),
  merchant: z.string().optional(),
  description: z.string().optional(),
  categories: z.array(z.string()).optional(),
});
export type CreateExpense = z.infer<typeof CreateExpenseSchema>;

// Schema for updating an expense after AI processing or manual edit
export const UpdateExpenseSchema = z.object({
  status: z.enum(expenseStatus).optional(),
  amount: z.number().int().positive().optional(),
  currency: z.string().length(3).optional(),
  baseAmount: z.number().int().positive().optional(),
  baseCurrency: z.string().length(3).optional(),
  merchant: z.string().optional(),
  description: z.string().optional(),
  categories: z.array(z.string()).optional(),
  errorMessage: z.string().optional(),
  processedAt: z.date().optional(),
  expenseDate: z.date().optional(), // Actual date of the transaction from receipt
});
export type UpdateExpense = z.infer<typeof UpdateExpenseSchema>;

export { expenseStatus, type ExpenseStatus };
