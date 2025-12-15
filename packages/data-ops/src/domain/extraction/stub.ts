import { Effect, Layer } from "effect";
import type { ExtractionResult } from "./schema";
import { ExtractionService } from "./service";

/**
 * Stub extraction data for E2E tests.
 * Returns predictable data without calling Ollama.
 *
 * Note: expenseDate is null so the expense requires review (can't auto-confirm).
 * This matches the expected E2E flow: upload → review → confirm → success.
 */
const stubExtractionResult: ExtractionResult = {
  success: true,
  data: {
    amount: 4599,
    currency: "USD",
    merchant: "Starbucks",
    date: null, // Missing date requires user review
    category: ["Food & Dining", "Coffee"],
    ambiguous: null,
  },
  ocrText: "Starbucks Coffee\n$45.99\nThank you!",
  rawLlmResponse: '{"amount": 4599, "currency": "USD", "merchant": "Starbucks"}',
  timing: {
    ocrMs: 100,
    llmMs: 200,
    totalMs: 300,
  },
  error: null,
};

const stubHealthCheck = {
  available: true,
  configured: true,
  modelAvailable: true,
  models: ["llava:13b", "mistral"],
  host: "http://localhost:11434",
  model: "llava:13b",
};

const stubConfig = {
  ollamaHost: "http://localhost:11434",
  ollamaModel: "llava:13b",
};

/**
 * Stub implementation of ExtractionService for E2E tests.
 * Returns predictable data without calling external services.
 * Uses ExtractionService.make() to properly create the service instance.
 */
export const ExtractionServiceStub = Layer.succeed(
  ExtractionService,
  ExtractionService.make({
    getConfig: () => Effect.succeed(stubConfig),

    extractOcrText: (_imagePathOrBuffer: string | Buffer) =>
      Effect.succeed({
        text: stubExtractionResult.ocrText,
        durationMs: stubExtractionResult.timing.ocrMs,
      }),

    extractFromOcrText: (_ocrText: string) =>
      Effect.succeed({
        data: stubExtractionResult.data!,
        rawResponse: stubExtractionResult.rawLlmResponse,
        durationMs: stubExtractionResult.timing.llmMs,
      }),

    extractFromImage: (_imagePathOrBuffer: string | Buffer) =>
      Effect.succeed(stubExtractionResult),

    checkOllamaHealth: () => Effect.succeed(stubHealthCheck),
  })
);
