/**
 * Automated regression tests for ExpenseCapture.
 * These run as part of CI to catch breaking changes.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within, waitFor } from 'storybook/test'
import { delay } from 'msw'
import { TRPCError } from '@trpc/server'

import { trpcMsw } from '../../../../.storybook/mocks/trpc'
import { ollamaScenarios, captureScenarios } from '../../../../.storybook/mocks/factories'
import { ExpenseCapture } from './index'

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

const meta: Meta<typeof ExpenseCapture> = {
  title: 'Domain/ExpenseCapture/Tests',
  component: ExpenseCapture,
  parameters: {
    layout: 'centered',
  },
  args: {
    userId: 'user-1',
  },
  tags: ['!autodocs'],
}

export default meta
type Story = StoryObj<typeof ExpenseCapture>

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

// =============================================================================
// Complete Flow Tests
// =============================================================================

/** Save error → error message appears near save button */
export const CompleteError: Story = {
  parameters: {
    msw: {
      handlers: [
        trpcMsw.expenses.checkExtractionHealth.query(() => ollamaScenarios.ready),
        trpcMsw.expenses.capture.mutation(async () => {
          await delay(50)
          return captureScenarios.needsReview
        }),
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
