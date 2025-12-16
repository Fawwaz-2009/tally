import { Data } from 'effect'

// ============================================================================
// Infrastructure Errors
// ============================================================================

export class BlobStorageError extends Data.Error<{
  message: string
}> {}

export class DbError extends Data.Error<{
  message: string
}> {}

export class KVStorageError extends Data.Error<{
  message: string
}> {}

export class QueueError extends Data.Error<{
  message: string
}> {}

export class UnexpectedError extends Data.Error<{
  message: string
}> {}

// ============================================================================
// Generic Domain Errors
// ============================================================================

export class NotFoundError extends Data.Error<{
  message: string
}> {}

export class BadRequestError extends Data.Error<{
  message: string
}> {}

// ============================================================================
// Expense Domain Errors
// ============================================================================

export class ExpenseNotFoundError extends Data.TaggedError('ExpenseNotFoundError')<{
  id: string
}> {}

export class ExpenseAlreadyConfirmedError extends Data.TaggedError('ExpenseAlreadyConfirmedError')<{
  id: string
}> {}

export class ExpenseNotPendingReviewError extends Data.TaggedError('ExpenseNotPendingReviewError')<{
  id: string
  currentState: string
}> {}

export class ExpenseNotConfirmedError extends Data.TaggedError('ExpenseNotConfirmedError')<{
  id: string
  currentState: string
}> {}

export class MissingRequiredFieldsError extends Data.TaggedError('MissingRequiredFieldsError')<{
  id: string
  missingFields: string[]
}> {}

// ============================================================================
// Extraction Domain Errors
// ============================================================================

export class OcrError extends Data.TaggedError('OcrError')<{
  message: string
}> {}

export class LlmError extends Data.TaggedError('LlmError')<{
  message: string
}> {}

export class ParseError extends Data.TaggedError('ParseError')<{
  message: string
  rawResponse: string
}> {}

export class ConfigError extends Data.TaggedError('ConfigError')<{
  message: string
}> {}

export class BadAiRequestError extends Data.Error<{
  message: string
}> {}
