/**
 * Mock data factories for Storybook stories.
 * These provide type-safe defaults for tRPC return types.
 */

// =============================================================================
// Expense Types (matching @repo/data-ops schema)
// =============================================================================

interface Expense {
  id: string
  userId: string
  state: 'draft' | 'complete'
  receiptImageKey: string | null
  receiptCapturedAt: Date
  extractionStatus: 'pending' | 'processing' | 'done' | 'failed'
  extractionOcrText: string | null
  extractionError: string | null
  extractionOcrMs: number | null
  extractionLlmMs: number | null
  amount: number | null
  currency: string | null
  baseAmount: number | null
  baseCurrency: string | null
  merchant: string | null
  description: string | null
  categories: string[] | null
  expenseDate: Date | null
  createdAt: Date
  completedAt: Date | null
}

interface CaptureExpenseResult {
  expense: Expense
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
    timing: {
      ocrMs: number
      llmMs: number
    } | null
  }
  needsReview: boolean
}

interface OllamaHealthResult {
  available: boolean
  configured: boolean
  modelAvailable: boolean
  model: string
  host: string
  models: string[]
}

// =============================================================================
// Factories
// =============================================================================

export function createMockExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'exp-123',
    userId: 'user-1',
    state: 'draft',
    receiptImageKey: 'receipts/exp-123.jpg',
    receiptCapturedAt: new Date(),
    extractionStatus: 'done',
    extractionOcrText: 'Sample OCR text',
    extractionError: null,
    extractionOcrMs: 1200,
    extractionLlmMs: 3400,
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
    ...overrides,
  }
}

export function createMockCaptureResult(
  overrides: {
    expense?: Partial<Expense>
    extraction?: Partial<CaptureExpenseResult['extraction']>
    needsReview?: boolean
  } = {},
): CaptureExpenseResult {
  const expense = createMockExpense(overrides.expense)

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
      timing: {
        ocrMs: expense.extractionOcrMs ?? 1200,
        llmMs: expense.extractionLlmMs ?? 3400,
      },
      ...overrides.extraction,
    },
    needsReview: overrides.needsReview ?? true,
  }
}

export function createMockOllamaHealth(overrides: Partial<OllamaHealthResult> = {}): OllamaHealthResult {
  return {
    available: true,
    configured: true,
    modelAvailable: true,
    model: 'llava:13b',
    host: 'http://localhost:11434',
    models: ['llava:13b', 'mistral'],
    ...overrides,
  }
}

// =============================================================================
// Preset Scenarios
// =============================================================================

export const ollamaScenarios = {
  ready: createMockOllamaHealth(),
  unavailable: createMockOllamaHealth({
    available: false,
    modelAvailable: false,
    models: [],
  }),
  modelMissing: createMockOllamaHealth({
    modelAvailable: false,
    models: ['mistral', 'codellama'],
  }),
}

export const captureScenarios = {
  /** Needs user review - some fields may need editing */
  needsReview: createMockCaptureResult({
    needsReview: true,
    expense: { state: 'draft' },
  }),

  /** Auto-completed - all fields extracted perfectly */
  autoComplete: createMockCaptureResult({
    needsReview: false,
    expense: { state: 'complete' },
  }),

  /** Partial extraction - missing some fields */
  partialExtraction: createMockCaptureResult({
    needsReview: true,
    expense: {
      state: 'draft',
      merchant: null,
      expenseDate: null,
    },
    extraction: {
      success: true,
      data: {
        amount: 4599,
        currency: 'USD',
        merchant: null,
        date: null,
        categories: [],
      },
      error: null,
      timing: { ocrMs: 1200, llmMs: 3400 },
    },
  }),
}

export const expenseScenarios = {
  /** Draft expense pending review */
  draft: createMockExpense({
    id: 'exp-123',
    state: 'draft',
    amount: 4599,
    currency: 'USD',
    merchant: 'Starbucks',
  }),

  /** Completed expense */
  complete: createMockExpense({
    id: 'exp-123',
    state: 'complete',
    amount: 4599,
    currency: 'USD',
    merchant: 'Starbucks',
    completedAt: new Date(),
  }),

  /** Expense with missing required fields */
  incomplete: createMockExpense({
    id: 'exp-123',
    state: 'draft',
    amount: null,
    currency: null,
    merchant: null,
  }),
}
