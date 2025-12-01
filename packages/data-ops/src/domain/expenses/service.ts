import { Effect } from "effect";
import { ExpenseRepo } from "./repo";
import { CreateExpense, UpdateExpense, type ExpenseStatus } from "./schema";

export class ExpenseService extends Effect.Service<ExpenseService>()(
  "ExpenseService",
  {
    effect: Effect.gen(function* () {
      const repo = yield* ExpenseRepo;

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

        // Update expense
        updateExpense: (id: string, data: UpdateExpense) => repo.update(id, data),

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
          }
        ) => repo.markSuccess(id, data),
        markNeedsReview: (id: string, error: string) =>
          repo.markNeedsReview(id, error),
      } as const;
    }),
    dependencies: [ExpenseRepo.Default],
    accessors: true,
  }
) {}
