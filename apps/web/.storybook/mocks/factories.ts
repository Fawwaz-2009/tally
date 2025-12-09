/**
 * Mock data factories for Storybook stories.
 * Simple defaults + overrides pattern.
 *
 * Note: We use plain objects internally since tRPC serializes to JSON anyway.
 * The exported type is ExpenseAggregate to satisfy MSW/tRPC type inference,
 * but at runtime these are just plain objects (no class methods).
 */
import { type Expense, type ExpenseAggregate } from '@repo/data-ops/domain'

// =============================================================================
// Mock Types
// =============================================================================

/**
 * Export type as ExpenseAggregate to satisfy tRPC mock handlers.
 * At runtime, these are plain objects (methods don't exist after serialization).
 */
export type MockExpense = ExpenseAggregate

// =============================================================================
// Expense Factory
// =============================================================================

const defaultExpense: Expense = {
  id: 'exp-123',
  userId: 'user-1',
  state: 'draft',
  receipt: {
    imageKey: 'receipts/exp-123.jpg',
    capturedAt: new Date(),
    extraction: {
      status: 'done',
      ocrText: 'Sample OCR text',
      error: null,
      timing: {
        ocrMs: 1200,
        llmMs: 3400,
      },
    },
  },
  amount: 4599,
  currency: 'USD',
  baseAmount: 4599,
  baseCurrency: 'USD',
  merchant: 'Starbucks',
  description: null,
  categories: [],
  expenseDate: new Date(),
  createdAt: new Date(),
  completedAt: null,
}

export const expenseFactory = {
  build: (overrides: Partial<Expense> = {}): MockExpense =>
    ({ ...defaultExpense, ...overrides }) as MockExpense,

  draft: (overrides: Partial<Expense> = {}): MockExpense =>
    ({ ...defaultExpense, state: 'draft', completedAt: null, ...overrides }) as MockExpense,

  complete: (overrides: Partial<Expense> = {}): MockExpense =>
    ({ ...defaultExpense, state: 'complete', completedAt: new Date(), ...overrides }) as MockExpense,

  incomplete: (overrides: Partial<Expense> = {}): MockExpense =>
    ({
      ...defaultExpense,
      state: 'draft',
      amount: null,
      currency: null,
      merchant: null,
      expenseDate: null,
      completedAt: null,
      ...overrides,
    }) as MockExpense,
}

// =============================================================================
// Capture Result Factory
// =============================================================================

type MockCaptureResult = {
  expense: MockExpense
  extraction: {
    success: boolean
    data: {
      amount: number | null
      currency: string | null
      merchant: string | null
      date: string | null
      categories: string[]
    } | null
    error: string | null
    timing: { ocrMs: number; llmMs: number } | null
  }
  needsReview: boolean
}

export function createCaptureResult(
  overrides: {
    expense?: Partial<MockExpense>
    extraction?: Partial<MockCaptureResult['extraction']>
    needsReview?: boolean
  } = {},
): MockCaptureResult {
  const needsReview = overrides.needsReview ?? true
  const expense = needsReview
    ? expenseFactory.draft(overrides.expense)
    : expenseFactory.complete(overrides.expense)

  return {
    expense,
    extraction: {
      success: true,
      data: {
        amount: expense.amount,
        currency: expense.currency,
        merchant: expense.merchant,
        date: expense.expenseDate?.toISOString().split('T')[0] ?? null,
        categories: expense.categories ?? [],
      },
      error: null,
      timing: { ocrMs: 1200, llmMs: 3400 },
      ...overrides.extraction,
    },
    needsReview,
  }
}

// =============================================================================
// Ollama Health Factory
// =============================================================================

type OllamaHealth = {
  available: boolean
  configured: boolean
  modelAvailable: boolean
  model: string
  host: string
  models: string[]
}

const defaultOllamaHealth: OllamaHealth = {
  available: true,
  configured: true,
  modelAvailable: true,
  model: 'llava:13b',
  host: 'http://localhost:11434',
  models: ['llava:13b', 'mistral'],
}

export const ollamaHealthFactory = {
  ready: (overrides: Partial<OllamaHealth> = {}): OllamaHealth =>
    ({ ...defaultOllamaHealth, ...overrides }),

  unavailable: (overrides: Partial<OllamaHealth> = {}): OllamaHealth =>
    ({ ...defaultOllamaHealth, available: false, modelAvailable: false, models: [], ...overrides }),

  modelMissing: (overrides: Partial<OllamaHealth> = {}): OllamaHealth =>
    ({ ...defaultOllamaHealth, modelAvailable: false, models: ['mistral', 'codellama'], ...overrides }),
}

// =============================================================================
// Preset Scenarios
// =============================================================================

export const ollamaScenarios = {
  ready: ollamaHealthFactory.ready(),
  unavailable: ollamaHealthFactory.unavailable(),
  modelMissing: ollamaHealthFactory.modelMissing(),
}

export const captureScenarios = {
  needsReview: createCaptureResult({ needsReview: true }),
  autoComplete: createCaptureResult({ needsReview: false }),
  partialExtraction: createCaptureResult({
    needsReview: true,
    expense: { merchant: null, expenseDate: null },
  }),
}

export const expenseScenarios = {
  draft: expenseFactory.draft(),
  complete: expenseFactory.complete(),
  incomplete: expenseFactory.incomplete(),
}
