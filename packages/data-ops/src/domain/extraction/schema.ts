import { Schema } from "effect";

// Extracted expense data from OCR + LLM
export const ExtractedExpenseSchema = Schema.Struct({
  amount: Schema.NullOr(Schema.Number),
  currency: Schema.NullOr(Schema.String),
  date: Schema.NullOr(Schema.String),
  merchant: Schema.NullOr(Schema.String),
  category: Schema.mutable(Schema.Array(Schema.String)),
  ambiguous: Schema.NullOr(
    Schema.Struct({
      reason: Schema.String,
    })
  ),
});

export type ExtractedExpense = Schema.Schema.Type<typeof ExtractedExpenseSchema>;

// Extraction result with metadata
export const ExtractionResultSchema = Schema.Struct({
  success: Schema.Boolean,
  data: Schema.NullOr(ExtractedExpenseSchema),
  ocrText: Schema.String,
  rawLlmResponse: Schema.String,
  timing: Schema.Struct({
    ocrMs: Schema.Number,
    llmMs: Schema.Number,
    totalMs: Schema.Number,
  }),
  error: Schema.NullOr(Schema.String),
});

export type ExtractionResult = Schema.Schema.Type<typeof ExtractionResultSchema>;

// Progress events for real-time updates
export type ExtractionProgress =
  | { stage: "uploading"; progress: number }
  | { stage: "ocr"; progress: number }
  | { stage: "extracting"; progress: number }
  | { stage: "complete"; result: ExtractionResult }
  | { stage: "error"; error: string };
