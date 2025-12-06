export type ProcessingStage = 'idle' | 'processing' | 'complete' | 'error' | 'saved'

export interface ExtractedData {
  amount: number | null
  currency: string | null
  merchant: string | null
  date: string | null
}

export interface TimingData {
  ocrMs: number
  llmMs: number
}
