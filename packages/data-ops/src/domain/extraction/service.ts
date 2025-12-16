import { Effect } from "effect";
import Tesseract from "tesseract.js";
import { Ollama } from "ollama";
import type { ExtractedExpense, ExtractionResult } from "./schema";
import { RuntimeEnvs } from "../../layers";
import { OcrError, LlmError, ParseError, ConfigError } from "../../errors";

// OCR prompt for extracting expense data from OCR text
const OCR_TO_JSON_PROMPT = `Extract expense information from this OCR text of a payment screenshot.

OCR TEXT:
{OCR_TEXT}

The OCR text may be messy with line breaks and spacing issues. Look for:
1. AMOUNT - Numbers that look like money (e.g., "501,380", "68.33", "3.98")
2. CURRENCY - Look for IDR, GBP, USD, £, $, Rp, or context clues
3. MERCHANT - Business names (NOT payment apps like Wise, Monzo, HSBC)
4. DATE - Any date/time patterns

OUTPUT THIS EXACT JSON STRUCTURE:
{"amount": <number or null>, "currency": "<IDR/GBP/USD or null>", "date": "<YYYY-MM-DDTHH:MM:SS or null>", "merchant": "<store name>", "category": ["<main category>", "<subcategory>", "<location if visible>"], "ambiguous": <null or {"reason": "..."}>}

PARSING RULES:
- amount: Remove commas, keep decimals. "501,380" → 501380. "£68.33" → 68.33
- currency: "IDR" (or Rp), "GBP" (or £), "USD" (or $), or null if not visible
- merchant: The business/store name, not the bank app
- If sending money to a person (Money Out, transfer), use recipient name as merchant

CATEGORY RULES - Generate 1-3 tags from these standard categories:

MAIN CATEGORIES (always include one):
- Food & Dining (subcategories: Restaurant, Coffee, Groceries, Fast Food, Delivery)
- Transport (subcategories: Taxi, Public Transit, Fuel, Parking, Flights)
- Shopping (subcategories: Clothing, Electronics, Home, Personal Care)
- Entertainment (subcategories: Streaming, Games, Movies, Events, Subscriptions)
- Bills & Utilities (subcategories: Phone, Internet, Electricity, Water)
- Health (subcategories: Pharmacy, Doctor, Gym, Wellness)
- Travel (subcategories: Hotels, Activities, Souvenirs)
- Other

TAG GENERATION:
1. First tag: Main category from the list above
2. Second tag: Subcategory if clearly identifiable from merchant name
3. Third tag: Location/place name if visible in merchant name (city, area, country)

CATEGORY EXAMPLES:
- "Starbucks" → ["Food & Dining", "Coffee"]
- "Netflix" → ["Entertainment", "Streaming"]
- "Ely's Kitchen Bali" → ["Food & Dining", "Restaurant", "Bali"]
- "Grab" or "Uber" → ["Transport", "Taxi"]
- "Shell" or "Pertamina" → ["Transport", "Fuel"]
- "Tokopedia" or "Amazon" → ["Shopping"]
- "Spotify" → ["Entertainment", "Streaming"]
- "GoFood" or "GrabFood" → ["Food & Dining", "Delivery"]
- "Indomaret" or "Alfamart" → ["Food & Dining", "Groceries"]
- "McDonald's" or "KFC" → ["Food & Dining", "Fast Food"]
- "Kimia Farma" → ["Health", "Pharmacy"]
- "Gym membership" → ["Health", "Gym"]

SET AMBIGUOUS when:
- No currency visible → ambiguous: {"reason": "no currency visible"}
- Multiple different amounts that could both be the payment → ambiguous: {"reason": "multiple amounts"}

DO NOT set ambiguous for:
- Same amount in two currencies (e.g., £68.33 and $89.65) - use the one with £ or the first one
- Normal bank transfers - these are valid expenses

JSON only, no other text.`;

// Parse JSON response from LLM
function parseJsonResponse(response: string): ExtractedExpense | null {
  try {
    // Remove markdown code blocks if present
    let cleaned = response.replace(/```json\s*/gi, "").replace(/```\s*/g, "");

    // Find JSON object
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    let jsonStr = jsonMatch[0];

    // Fix commas in numbers like "501,380" -> "501380"
    jsonStr = jsonStr.replace(/"amount":\s*(\d{1,3}(?:,\d{3})+)/g, (_, num) => {
      return `"amount": ${num.replace(/,/g, "")}`;
    });

    const parsed = JSON.parse(jsonStr);

    return {
      amount: typeof parsed.amount === "number" ? parsed.amount : null,
      currency: parsed.currency ?? null,
      date: parsed.date ?? null,
      merchant: parsed.merchant ?? null,
      category: Array.isArray(parsed.category) ? parsed.category : [],
      ambiguous: parsed.ambiguous ?? null,
    };
  } catch {
    return null;
  }
}

// Extraction service configuration
export interface ExtractionConfig {
  ollamaHost: string;
  ollamaModel: string;
}

export class ExtractionService extends Effect.Service<ExtractionService>()(
  "ExtractionService",
  {
    effect: Effect.gen(function* () {
      // Get environment variables from RuntimeEnvs (initialized at server startup)
      const runtimeEnvs = yield* RuntimeEnvs;

      const host = runtimeEnvs.OLLAMA_HOST || "http://localhost:11434";
      const model = runtimeEnvs.OLLAMA_MODEL || "";

      if (!model) {
        console.warn("[ExtractionService] OLLAMA_MODEL not configured - extraction will fail");
      }

      const ollama = new Ollama({ host });

      const config: ExtractionConfig = {
        ollamaHost: host,
        ollamaModel: model,
      };

      return {
        // Get current configuration
        getConfig: () => Effect.succeed(config),

        // Extract text from image using Tesseract OCR
        extractOcrText: (imagePathOrBuffer: string | Buffer) =>
          Effect.tryPromise({
            try: async () => {
              const startTime = performance.now();

              const result = await Tesseract.recognize(imagePathOrBuffer, "eng");

              const endTime = performance.now();
              return {
                text: result.data.text,
                durationMs: Math.round(endTime - startTime),
              };
            },
            catch: (error) =>
              new OcrError({
                message: error instanceof Error ? error.message : "OCR failed",
              }),
          }),

        // Extract structured data from OCR text using LLM
        extractFromOcrText: (ocrText: string) =>
          Effect.gen(function* () {
            if (!model) {
              return yield* Effect.fail(
                new ConfigError({
                  message: "OLLAMA_MODEL environment variable is required. Please set it to an available model (e.g., llama3.1:8b, gpt-oss:20b)",
                })
              );
            }

            return yield* Effect.tryPromise({
              try: async () => {
                const startTime = performance.now();

                const prompt = OCR_TO_JSON_PROMPT.replace("{OCR_TEXT}", ocrText);

                const response = await ollama.generate({
                  model,
                  prompt,
                  stream: false,
                  options: { temperature: 0 },
                });

                const endTime = performance.now();
                const durationMs = Math.round(endTime - startTime);

                const parsed = parseJsonResponse(response.response);
                if (!parsed) {
                  throw new ParseError({
                    message: "Failed to parse LLM response as JSON",
                    rawResponse: response.response,
                  });
                }

                return {
                  data: parsed,
                  rawResponse: response.response,
                  durationMs,
                };
              },
              catch: (error) => {
                if (error instanceof ParseError) return error;
                return new LlmError({
                  message: error instanceof Error ? error.message : "LLM extraction failed",
                });
              },
            });
          }),

        // Full extraction pipeline: Image → OCR → LLM → Structured data
        extractFromImage: (imagePathOrBuffer: string | Buffer) =>
          Effect.gen(function* () {
            if (!model) {
              return yield* Effect.fail(
                new ConfigError({
                  message: "OLLAMA_MODEL environment variable is required. Please set it to an available model (e.g., llama3.1:8b, gpt-oss:20b)",
                })
              );
            }

            const totalStartTime = performance.now();

            // Step 1: OCR
            const ocr = yield* Effect.tryPromise({
              try: async () => {
                const startTime = performance.now();
                const result = await Tesseract.recognize(imagePathOrBuffer, "eng");
                const endTime = performance.now();
                return {
                  text: result.data.text,
                  durationMs: Math.round(endTime - startTime),
                };
              },
              catch: (error) =>
                new OcrError({
                  message: error instanceof Error ? error.message : "OCR failed",
                }),
            });

            // Step 2: LLM extraction
            const llmResult = yield* Effect.tryPromise({
              try: async () => {
                const startTime = performance.now();
                const prompt = OCR_TO_JSON_PROMPT.replace("{OCR_TEXT}", ocr.text);

                const response = await ollama.generate({
                  model,
                  prompt,
                  stream: false,
                  options: { temperature: 0 },
                });

                const endTime = performance.now();
                return {
                  rawResponse: response.response,
                  durationMs: Math.round(endTime - startTime),
                };
              },
              catch: (error) =>
                new LlmError({
                  message: `LLM extraction failed (model: ${model}): ${error instanceof Error ? error.message : "Unknown error"}`,
                }),
            });

            const totalEndTime = performance.now();

            // Parse the response
            const parsed = parseJsonResponse(llmResult.rawResponse);

            const result: ExtractionResult = {
              success: parsed !== null,
              data: parsed,
              ocrText: ocr.text,
              rawLlmResponse: llmResult.rawResponse,
              timing: {
                ocrMs: ocr.durationMs,
                llmMs: llmResult.durationMs,
                totalMs: Math.round(totalEndTime - totalStartTime),
              },
              error: parsed === null ? "Failed to parse LLM response" : null,
            };

            return result;
          }),

        // Check if Ollama is available and return config info
        checkOllamaHealth: () =>
          Effect.tryPromise({
            try: async () => {
              const response = await ollama.list();
              const modelAvailable = model ? response.models.some((m) => m.name === model) : false;

              return {
                available: true,
                configured: !!model,
                modelAvailable,
                models: response.models.map((m) => m.name),
                host,
                model: model || "(not configured)",
              };
            },
            catch: (err) => ({
              available: false,
              configured: !!model,
              modelAvailable: false,
              models: [] as string[],
              host,
              model: model || "(not configured)",
              error: err instanceof Error ? err.message : "Connection failed",
            }),
          }),
      } as const;
    }),
    dependencies: [RuntimeEnvs.Default],
    accessors: true,
  }
) {}
