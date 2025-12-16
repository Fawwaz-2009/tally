import { Effect } from 'effect'
import { DbError } from '../../errors'

/**
 * Extracts a comprehensive error message from an error object,
 * including nested causes and additional context like query/params
 */
function extractErrorMessage(error: any): string {
  const messageParts: string[] = []

  // Extract main error message
  if (error instanceof Error) {
    messageParts.push(error.message)
  } else if (typeof error === 'string') {
    messageParts.push(error)
  } else if (error?.message) {
    messageParts.push(error.message)
  }

  // Follow the cause chain to get the root cause
  let currentError = error
  const seenErrors = new Set() // Prevent infinite loops

  while (currentError?.cause && !seenErrors.has(currentError.cause)) {
    seenErrors.add(currentError.cause)
    const causeError = currentError.cause

    if (causeError instanceof Error && causeError.message) {
      // Only add if it's different from what we already have
      if (!messageParts.includes(causeError.message)) {
        messageParts.push(`Caused by: ${causeError.message}`)
      }
    } else if (typeof causeError === 'string') {
      messageParts.push(`Caused by: ${causeError}`)
    } else if (causeError?.message && !messageParts.includes(causeError.message)) {
      messageParts.push(`Caused by: ${causeError.message}`)
    }

    currentError = causeError
  }

  // Add Drizzle-specific context (query and params)
  if (error?.query) {
    messageParts.push(`Query: ${error.query}`)
  }
  if (error?.params) {
    messageParts.push(`Params: ${JSON.stringify(error.params)}`)
  }

  // If we got nothing useful, try to stringify the error
  if (messageParts.length === 0) {
    try {
      messageParts.push(JSON.stringify(error))
    } catch {
      messageParts.push('Unknown error')
    }
  }

  return messageParts.join(' | ')
}

/**
 * Wraps a database operation (synchronous or async) in an Effect.
 * better-sqlite3 returns synchronous results, so we handle both cases.
 */
export const withDbTryPromise = <T>(result: T | Promise<T>) => {
  return Effect.try(() => {
    // For better-sqlite3, the result is already resolved (synchronous)
    return result as T
  }).pipe(
    Effect.catchAll((error: any) => {
      const detailedMessage = extractErrorMessage(error)
      return Effect.fail(new DbError({ message: detailedMessage }))
    }),
  )
}
