/**
 * Mock data factories for Storybook stories.
 * Simple defaults + overrides pattern.
 *
 * Note: We use plain objects internally since tRPC serializes to JSON anyway.
 * The exported types match the new discriminated union expense model.
 */
import type { Expense, PendingExpense, PendingReviewExpense, ConfirmedExpense, ExtractionMetadata } from '@repo/data-ops/schemas'

// =============================================================================
// Mock Types
// =============================================================================

export type MockExpense = Expense
export type MockPendingExpense = PendingExpense
export type MockPendingReviewExpense = PendingReviewExpense
export type MockConfirmedExpense = ConfirmedExpense

// =============================================================================
// Expense Factory
// =============================================================================

const defaultExtractionMetadata: ExtractionMetadata = {
  ocrText: 'Sample OCR text from receipt',
  error: null,
  timing: { ocrMs: 1200, llmMs: 3400 },
}

const defaultPendingReview: PendingReviewExpense = {
  state: 'pending-review',
  id: 'exp-123',
  userId: 'user-1',
  imageKey: 'receipts/exp-123.jpg',
  capturedAt: new Date(),
  createdAt: new Date(),
  amount: 4599,
  currency: 'USD',
  merchant: 'Starbucks',
  description: null,
  categories: [],
  expenseDate: new Date(),
  extractionMetadata: defaultExtractionMetadata,
}

const defaultConfirmed: ConfirmedExpense = {
  state: 'confirmed',
  id: 'exp-123',
  userId: 'user-1',
  imageKey: 'receipts/exp-123.jpg',
  capturedAt: new Date(),
  createdAt: new Date(),
  confirmedAt: new Date(),
  amount: 4599,
  currency: 'USD',
  baseAmount: 4599,
  baseCurrency: 'USD',
  merchant: 'Starbucks',
  description: null,
  categories: [],
  expenseDate: new Date(),
  extractionMetadata: defaultExtractionMetadata,
}

export const expenseFactory = {
  /**
   * Create a pending expense (receipt captured, extraction not yet applied)
   */
  pending: (overrides: Partial<PendingExpense> = {}): MockPendingExpense => ({
    state: 'pending',
    id: 'exp-123',
    userId: 'user-1',
    imageKey: 'receipts/exp-123.jpg',
    capturedAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  }),

  /**
   * Create a pending-review expense (extraction done, needs user review)
   */
  pendingReview: (overrides: Partial<PendingReviewExpense> = {}): MockPendingReviewExpense => ({
    ...defaultPendingReview,
    ...overrides,
  }),

  /**
   * Create a confirmed expense (all required fields present)
   */
  confirmed: (overrides: Partial<ConfirmedExpense> = {}): MockConfirmedExpense => ({
    ...defaultConfirmed,
    ...overrides,
  }),

  /**
   * Alias for pendingReview (backward compat for tests)
   */
  draft: (overrides: Partial<PendingReviewExpense> = {}): MockPendingReviewExpense => expenseFactory.pendingReview(overrides),

  /**
   * Alias for confirmed (backward compat for tests)
   */
  complete: (overrides: Partial<ConfirmedExpense> = {}): MockConfirmedExpense => expenseFactory.confirmed(overrides),

  /**
   * Create a pending-review expense with missing required fields
   */
  incomplete: (overrides: Partial<PendingReviewExpense> = {}): MockPendingReviewExpense => ({
    ...defaultPendingReview,
    amount: null,
    currency: null,
    merchant: null,
    expenseDate: null,
    ...overrides,
  }),
}

// =============================================================================
// Capture Result Factory
// =============================================================================

type MockCaptureResult = {
  expense: MockPendingReviewExpense | MockConfirmedExpense
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
    expense?: Partial<PendingReviewExpense | ConfirmedExpense>
    extraction?: Partial<MockCaptureResult['extraction']>
    needsReview?: boolean
  } = {},
): MockCaptureResult {
  const needsReview = overrides.needsReview ?? true
  const expense = needsReview
    ? expenseFactory.pendingReview(overrides.expense as Partial<PendingReviewExpense>)
    : expenseFactory.confirmed(overrides.expense as Partial<ConfirmedExpense>)

  const amount = 'amount' in expense ? expense.amount : null
  const currency = 'currency' in expense ? expense.currency : null
  const merchant = 'merchant' in expense ? expense.merchant : null
  const expenseDate = 'expenseDate' in expense ? expense.expenseDate : null
  const categories = 'categories' in expense ? expense.categories : []

  return {
    expense,
    extraction: {
      success: true,
      data: {
        amount,
        currency,
        merchant,
        date: expenseDate instanceof Date ? expenseDate.toISOString().split('T')[0] : null,
        categories: categories ?? [],
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
  ready: (overrides: Partial<OllamaHealth> = {}): OllamaHealth => ({ ...defaultOllamaHealth, ...overrides }),

  unavailable: (overrides: Partial<OllamaHealth> = {}): OllamaHealth => ({ ...defaultOllamaHealth, available: false, modelAvailable: false, models: [], ...overrides }),

  modelMissing: (overrides: Partial<OllamaHealth> = {}): OllamaHealth => ({
    ...defaultOllamaHealth,
    modelAvailable: false,
    models: ['mistral', 'codellama'],
    ...overrides,
  }),
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
  /** Pending-review expense (needs user review) */
  pendingReview: expenseFactory.pendingReview(),
  /** Confirmed expense (all fields present) */
  confirmed: expenseFactory.confirmed(),
  /** Incomplete expense (missing required fields) */
  incomplete: expenseFactory.incomplete(),
  /** Alias for backward compat */
  draft: expenseFactory.pendingReview(),
  /** Alias for backward compat */
  complete: expenseFactory.confirmed(),
}
