/**
 * @repo/isomorphic
 *
 * Isomorphic utilities that work in both browser and Node.js environments.
 * This package provides shared logic for the monorepo that needs to run
 * on both client and server.
 */

// Re-export money module
export * as money from "./money/index.js";

// Also export commonly used types directly
export type { Money, CurrencyOption } from "./money/index.js";
export { InvalidCurrencyError } from "./money/index.js";
