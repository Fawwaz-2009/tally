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
// User Domain Errors
// ============================================================================

export class UserNotFoundError extends Data.TaggedError('UserNotFoundError')<{
  userName: string
}> {}

// ============================================================================
// Expense Domain Errors
// ============================================================================

export class ExpenseNotFoundError extends Data.TaggedError('ExpenseNotFoundError')<{
  id: string
}> {}
