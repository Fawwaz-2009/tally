/**
 * Automated regression tests for CaptureFlow.
 * These run as part of CI to catch breaking changes.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within, waitFor } from 'storybook/test'
import { delay } from 'msw'
import { TRPCError } from '@trpc/server'

import { trpcMsw } from '../../../../.storybook/mocks/trpc'
import { ollamaScenarios, captureScenarios, expenseScenarios, createMockExpense } from '../../../../.storybook/mocks/factories'
import { CaptureFlow } from './capture-flow'

// =============================================================================
// Test Helpers
// =============================================================================

/** Simulates uploading a file - triggers the capture mutation */
async function simulateUpload(canvasElement: HTMLElement) {
  const fileInput = canvasElement.querySelector('input[type="file"]') as HTMLInputElement
  if (!fileInput) throw new Error('File input not found')

  const mockFile = new File(['fake-image-data'], 'receipt.jpg', { type: 'image/jpeg' })
  const dataTransfer = new DataTransfer()
  dataTransfer.items.add(mockFile)
  fileInput.files = dataTransfer.files
  fileInput.dispatchEvent(new Event('change', { bubbles: true }))
}

// =============================================================================
// Meta
// =============================================================================

const meta: Meta<typeof CaptureFlow> = {
  title: 'Domain/CaptureFlow/Tests',
  component: CaptureFlow,
  parameters: {
    layout: 'centered',
  },
  args: {
    userId: 'user-1',
    showAddAnother: true,
  },
  tags: ['!autodocs'],
}

export default meta
type Story = StoryObj<typeof CaptureFlow>

// =============================================================================
// Health Check Tests
// =============================================================================

/** When Ollama is ready, upload should be enabled */
export const HealthReady: Story = {
  parameters: {
    msw: {
      handlers: [trpcMsw.expenses.checkExtractionHealth.query(() => ollamaScenarios.ready)],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => {
      expect(canvas.getByRole('button', { name: /select image/i })).toBeEnabled()
    })
  },
}

/** When Ollama is unavailable, upload should be disabled */
export const HealthUnavailable: Story = {
  parameters: {
    msw: {
      handlers: [trpcMsw.expenses.checkExtractionHealth.query(() => ollamaScenarios.unavailable)],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => {
      expect(canvas.getByRole('button', { name: /select image/i })).toBeDisabled()
    })
  },
}

// =============================================================================
// Capture Flow Tests
// =============================================================================

/** Upload success → review form appears */
export const CaptureSuccess: Story = {
  parameters: {
    msw: {
      handlers: [
        trpcMsw.expenses.checkExtractionHealth.query(() => ollamaScenarios.ready),
        trpcMsw.expenses.capture.mutation(async () => {
          await delay(50)
          return captureScenarios.needsReview
        }),
        trpcMsw.expenses.getById.query(() => expenseScenarios.draft),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByRole('button', { name: /select image/i })).toBeEnabled()
    })

    await simulateUpload(canvasElement)

    await waitFor(
      () => {
        expect(canvas.getByRole('heading', { name: /review expense/i })).toBeInTheDocument()
      },
      { timeout: 3000 },
    )
  },
}

/** Upload error → error message appears */
export const CaptureError: Story = {
  parameters: {
    msw: {
      handlers: [
        trpcMsw.expenses.checkExtractionHealth.query(() => ollamaScenarios.ready),
        trpcMsw.expenses.capture.mutation(async () => {
          await delay(50)
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to upload' })
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByRole('button', { name: /select image/i })).toBeEnabled()
    })

    await simulateUpload(canvasElement)

    await waitFor(
      () => {
        expect(canvas.getByText(/extraction failed/i)).toBeInTheDocument()
      },
      { timeout: 3000 },
    )
  },
}

/** Auto-complete → skip review, show success directly */
export const AutoCompleteSuccess: Story = {
  parameters: {
    msw: {
      handlers: [
        trpcMsw.expenses.checkExtractionHealth.query(() => ollamaScenarios.ready),
        trpcMsw.expenses.capture.mutation(async () => {
          await delay(50)
          return captureScenarios.autoComplete
        }),
        trpcMsw.expenses.getById.query(() => expenseScenarios.complete),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByRole('button', { name: /select image/i })).toBeEnabled()
    })

    await simulateUpload(canvasElement)

    // Should skip review and go straight to success
    await waitFor(
      () => {
        expect(canvas.getByRole('heading', { name: /expense saved/i })).toBeInTheDocument()
      },
      { timeout: 3000 },
    )
  },
}

// =============================================================================
// Review → Save Flow Tests
// =============================================================================

/** Review → Save success → success view appears */
export const ReviewSaveSuccess: Story = {
  parameters: {
    msw: {
      handlers: [
        trpcMsw.expenses.checkExtractionHealth.query(() => ollamaScenarios.ready),
        trpcMsw.expenses.capture.mutation(async () => {
          await delay(50)
          return captureScenarios.needsReview
        }),
        trpcMsw.expenses.getById.query(() => expenseScenarios.draft),
        trpcMsw.expenses.complete.mutation(async () => {
          await delay(50)
          return createMockExpense({ state: 'complete' })
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Wait for upload to be ready
    await waitFor(() => {
      expect(canvas.getByRole('button', { name: /select image/i })).toBeEnabled()
    })

    await simulateUpload(canvasElement)

    // Wait for review form
    await waitFor(
      () => {
        expect(canvas.getByRole('heading', { name: /review expense/i })).toBeInTheDocument()
      },
      { timeout: 3000 },
    )

    // Click save
    canvas.getByRole('button', { name: /save expense/i }).click()

    // Should show success
    await waitFor(
      () => {
        expect(canvas.getByRole('heading', { name: /expense saved/i })).toBeInTheDocument()
      },
      { timeout: 3000 },
    )
  },
}

/** Save error → error message appears in form */
export const CompleteError: Story = {
  parameters: {
    msw: {
      handlers: [
        trpcMsw.expenses.checkExtractionHealth.query(() => ollamaScenarios.ready),
        trpcMsw.expenses.capture.mutation(async () => {
          await delay(50)
          return captureScenarios.needsReview
        }),
        trpcMsw.expenses.getById.query(() => expenseScenarios.draft),
        trpcMsw.expenses.complete.mutation(async () => {
          await delay(50)
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to save' })
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByRole('button', { name: /select image/i })).toBeEnabled()
    })

    await simulateUpload(canvasElement)

    await waitFor(
      () => {
        expect(canvas.getByRole('heading', { name: /review expense/i })).toBeInTheDocument()
      },
      { timeout: 3000 },
    )

    canvas.getByRole('button', { name: /save expense/i }).click()

    await waitFor(
      () => {
        expect(canvas.getByText(/failed to save/i)).toBeInTheDocument()
      },
      { timeout: 3000 },
    )
  },
}

// =============================================================================
// Add Another Flow Tests
// =============================================================================

/** Clicking "Add Another" resets to upload stage */
export const AddAnotherResets: Story = {
  parameters: {
    msw: {
      handlers: [
        trpcMsw.expenses.checkExtractionHealth.query(() => ollamaScenarios.ready),
        trpcMsw.expenses.capture.mutation(async () => {
          await delay(50)
          return captureScenarios.autoComplete
        }),
        trpcMsw.expenses.getById.query(() => expenseScenarios.complete),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByRole('button', { name: /select image/i })).toBeEnabled()
    })

    await simulateUpload(canvasElement)

    // Wait for success
    await waitFor(
      () => {
        expect(canvas.getByRole('heading', { name: /expense saved/i })).toBeInTheDocument()
      },
      { timeout: 3000 },
    )

    // Click "Add Another"
    canvas.getByRole('button', { name: /add another/i }).click()

    // Should be back to upload stage
    await waitFor(() => {
      expect(canvas.getByRole('button', { name: /select image/i })).toBeInTheDocument()
    })
  },
}
