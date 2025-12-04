import { z } from "zod";

// Extracted expense data from OCR + LLM
export const ExtractedExpenseSchema = z.object({
  amount: z.number().nullable(),
  currency: z.string().nullable(),
  date: z.string().nullable(),
  merchant: z.string().nullable(),
  category: z.array(z.string()),
  ambiguous: z
    .object({
      reason: z.string(),
    })
    .nullable(),
});

export type ExtractedExpense = z.infer<typeof ExtractedExpenseSchema>;

// Extraction result with metadata
export const ExtractionResultSchema = z.object({
  success: z.boolean(),
  data: ExtractedExpenseSchema.nullable(),
  ocrText: z.string(),
  rawLlmResponse: z.string(),
  timing: z.object({
    ocrMs: z.number(),
    llmMs: z.number(),
    totalMs: z.number(),
  }),
  error: z.string().nullable(),
});

export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

// Progress events for real-time updates
export type ExtractionProgress =
  | { stage: "uploading"; progress: number }
  | { stage: "ocr"; progress: number }
  | { stage: "extracting"; progress: number }
  | { stage: "complete"; result: ExtractionResult }
  | { stage: "error"; error: string };
