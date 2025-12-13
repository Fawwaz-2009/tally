/**
 * Automated regression tests for CaptureFlow.
 * These run as part of CI to catch breaking changes.
 */
import { expect, waitFor, within } from 'storybook/test'
import { HttpResponse, delay, http } from 'msw'
import superjson from 'superjson'
import { TRPCError } from '@trpc/server'
// Note: http, HttpResponse, superjson kept for createCaptureHandler which handles FormData

import { trpcMsw } from '../../../../.storybook/mocks/trpc'
import { captureScenarios, expenseFactory, expenseScenarios, ollamaScenarios } from '../../../../.storybook/mocks/factories'
import { CaptureFlow } from './capture-flow'
import type { Meta, StoryObj } from '@storybook/react-vite'

// =============================================================================
// Test Helpers
// =============================================================================

/** Simulates uploading a file - triggers the capture mutation */
function simulateUpload(canvasElement: HTMLElement) {
  const fileInput = canvasElement.querySelector<HTMLInputElement>('input[type="file"]')
  if (!fileInput) throw new Error('File input not found')

  const mockFile = new File(['fake-image-data'], 'receipt.jpg', { type: 'image/jpeg' })
  const dataTransfer = new DataTransfer()
  dataTransfer.items.add(mockFile)
  fileInput.files = dataTransfer.files
  fileInput.dispatchEvent(new Event('change', { bubbles: true }))
}

/**
 * Creates a raw MSW handler for the FormData-based capture endpoint.
 * msw-trpc doesn't handle FormData, so we need a custom handler.
 */
function createCaptureHandler(response: typeof captureScenarios.needsReview | Error) {
  return http.post('/api/trpc/expenses.capture', async () => {
    await delay(50)

    if (response instanceof Error) {
      return HttpResponse.json({
        error: {
          json: {
            message: response.message,
            code: -32600,
            data: { code: 'INTERNAL_SERVER_ERROR', httpStatus: 500 },
          },
        },
      })
    }

    return HttpResponse.json({
      result: {
        data: {
          json: response,
          meta: { values: superjson.serialize(response).meta },
        },
      },
    })
  })
}

/**
 * Stateful confirm flow state.
 * Reset this before each story that uses it.
 */
let confirmFlowState = { confirmed: false }

function resetConfirmFlowState() {
  confirmFlowState = { confirmed: false }
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
        createCaptureHandler(captureScenarios.needsReview),
        trpcMsw.expenses.getById.query(() => expenseScenarios.pendingReview),
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
      handlers: [trpcMsw.expenses.checkExtractionHealth.query(() => ollamaScenarios.ready), createCaptureHandler(new Error('Failed to upload'))],
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

/** Auto-confirm → skip review, show success directly */
export const AutoCompleteSuccess: Story = {
  parameters: {
    msw: {
      handlers: [
        trpcMsw.expenses.checkExtractionHealth.query(() => ollamaScenarios.ready),
        createCaptureHandler(captureScenarios.autoComplete),
        trpcMsw.expenses.getById.query(() => expenseScenarios.confirmed),
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

/** Review → Confirm success → success view appears */
export const ReviewSaveSuccess: Story = {
  parameters: {
    msw: {
      handlers: [
        trpcMsw.expenses.checkExtractionHealth.query(() => ollamaScenarios.ready),
        createCaptureHandler(captureScenarios.needsReview),
        // Use trpcMsw for correct serialization - resolver reads shared state
        trpcMsw.expenses.getById.query(() => {
          return confirmFlowState.confirmed ? expenseScenarios.confirmed : expenseScenarios.pendingReview
        }),
        trpcMsw.expenses.confirm.mutation(async () => {
          await delay(50)
          confirmFlowState.confirmed = true
          return expenseScenarios.confirmed
        }),
      ],
    },
  },
  beforeEach: () => {
    // Reset state before each run
    resetConfirmFlowState()
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

    // Click confirm
    canvas.getByRole('button', { name: /confirm expense/i }).click()

    // Should show success
    await waitFor(
      () => {
        expect(canvas.getByRole('heading', { name: /expense saved/i })).toBeInTheDocument()
      },
      { timeout: 3000 },
    )
  },
}

/** Confirm error → error message appears in form */
export const ConfirmError: Story = {
  parameters: {
    msw: {
      handlers: [
        trpcMsw.expenses.checkExtractionHealth.query(() => ollamaScenarios.ready),
        createCaptureHandler(captureScenarios.needsReview),
        trpcMsw.expenses.getById.query(() => expenseScenarios.pendingReview),
        trpcMsw.expenses.confirm.mutation(() => {
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

    canvas.getByRole('button', { name: /confirm expense/i }).click()

    await waitFor(
      () => {
        expect(canvas.getByText(/failed to save/i)).toBeInTheDocument()
      },
      { timeout: 3000 },
    )
  },
}

// =============================================================================
// Additional Health Check Tests
// =============================================================================

/** When model is missing, upload should be disabled with warning */
export const HealthModelMissing: Story = {
  parameters: {
    msw: {
      handlers: [trpcMsw.expenses.checkExtractionHealth.query(() => ollamaScenarios.modelMissing)],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => {
      expect(canvas.getByRole('button', { name: /select image/i })).toBeDisabled()
      expect(canvas.getByText(/not found/i)).toBeInTheDocument()
    })
  },
}

// =============================================================================
// Partial Extraction Tests
// =============================================================================

/** Partial extraction → form shows with empty fields for missing data */
export const PartialExtraction: Story = {
  parameters: {
    msw: {
      handlers: [
        trpcMsw.expenses.checkExtractionHealth.query(() => ollamaScenarios.ready),
        createCaptureHandler(captureScenarios.partialExtraction),
        trpcMsw.expenses.getById.query(() => expenseFactory.pendingReview({ merchant: null, expenseDate: null })),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByRole('button', { name: /select image/i })).toBeEnabled()
    })

    await simulateUpload(canvasElement)

    // Should show review form
    await waitFor(
      () => {
        expect(canvas.getByRole('heading', { name: /review expense/i })).toBeInTheDocument()
      },
      { timeout: 3000 },
    )

    // Merchant field should be empty (user needs to fill it)
    const merchantInput = canvas.getByLabelText<HTMLInputElement>(/merchant/i)
    expect(merchantInput.value).toBe('')
  },
}

// =============================================================================
// Review Stage Navigation Tests
// =============================================================================

/** Clicking back in review returns to upload stage */
export const ReviewBackButton: Story = {
  parameters: {
    msw: {
      handlers: [
        trpcMsw.expenses.checkExtractionHealth.query(() => ollamaScenarios.ready),
        createCaptureHandler(captureScenarios.needsReview),
        trpcMsw.expenses.getById.query(() => expenseScenarios.pendingReview),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

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

    // Click back button (ArrowLeft icon button)
    const backButton = canvas.getByRole('button', { name: '' })
    backButton.click()

    // Should be back to upload stage
    await waitFor(() => {
      expect(canvas.getByRole('button', { name: /select image/i })).toBeInTheDocument()
    })
  },
}

// =============================================================================
// Error Recovery Tests
// =============================================================================

/** Try again after capture error resets the form */
export const TryAgainAfterError: Story = {
  parameters: {
    msw: {
      handlers: [trpcMsw.expenses.checkExtractionHealth.query(() => ollamaScenarios.ready), createCaptureHandler(new Error('Server error'))],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByRole('button', { name: /select image/i })).toBeEnabled()
    })

    await simulateUpload(canvasElement)

    // Wait for error
    await waitFor(
      () => {
        expect(canvas.getByText(/extraction failed/i)).toBeInTheDocument()
      },
      { timeout: 3000 },
    )

    // Click "Try again"
    canvas.getByRole('button', { name: /try again/i }).click()

    // Should be back to initial upload state (no error, no preview)
    await waitFor(() => {
      expect(canvas.queryByText(/extraction failed/i)).not.toBeInTheDocument()
      expect(canvas.getByRole('button', { name: /select image/i })).toBeEnabled()
    })
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
        createCaptureHandler(captureScenarios.autoComplete),
        trpcMsw.expenses.getById.query(() => expenseScenarios.confirmed),
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

// =============================================================================
// Loading State Tests
// =============================================================================

/** Processing indicator shows during upload */
export const ProcessingIndicator: Story = {
  parameters: {
    msw: {
      handlers: [
        trpcMsw.expenses.checkExtractionHealth.query(() => ollamaScenarios.ready),
        // Slow response to see loading state
        http.post('/api/trpc/expenses.capture', async () => {
          await delay(2000)
          return HttpResponse.json({
            result: {
              data: {
                json: captureScenarios.needsReview,
                meta: { values: superjson.serialize(captureScenarios.needsReview).meta },
              },
            },
          })
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

    // Should show processing indicator
    await waitFor(() => {
      expect(canvas.getByText(/processing your receipt/i)).toBeInTheDocument()
    })
  },
}
