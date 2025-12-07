import type { Meta, StoryObj } from '@storybook/react-vite'
import { getWorker } from 'msw-storybook-addon'
import { delay } from 'msw'
import { TRPCError } from '@trpc/server'

import { trpcMsw } from '../../../../.storybook/mocks/trpc'
import { createMockExpense, ollamaScenarios, captureScenarios } from '../../../../.storybook/mocks/factories'
import { ExpenseCapture } from './index'

// =============================================================================
// API Response Types
// =============================================================================

type HealthResponse = 'ready' | 'ollamaUnavailable' | 'modelMissing' | 'networkError'
type CaptureResponse = 'needsReview' | 'autoComplete' | 'networkError'
type CompleteResponse = 'success' | 'networkError'

interface StoryArgs {
  userId: string
  healthApi: HealthResponse
  captureApi: CaptureResponse
  completeApi: CompleteResponse
}

// =============================================================================
// API Handlers
// =============================================================================

function getHealthHandler(response: HealthResponse) {
  switch (response) {
    case 'ready':
      return trpcMsw.expenses.checkExtractionHealth.query(() => ollamaScenarios.ready)
    case 'ollamaUnavailable':
      return trpcMsw.expenses.checkExtractionHealth.query(() => ollamaScenarios.unavailable)
    case 'modelMissing':
      return trpcMsw.expenses.checkExtractionHealth.query(() => ollamaScenarios.modelMissing)
    case 'networkError':
      return trpcMsw.expenses.checkExtractionHealth.query(() => {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to connect to server' })
      })
  }
}

function getCaptureHandler(response: CaptureResponse) {
  switch (response) {
    case 'needsReview':
      return trpcMsw.expenses.capture.mutation(async () => {
        await delay(100)
        return captureScenarios.needsReview
      })
    case 'autoComplete':
      return trpcMsw.expenses.capture.mutation(async () => {
        await delay(100)
        return captureScenarios.autoComplete
      })
    case 'networkError':
      return trpcMsw.expenses.capture.mutation(async () => {
        await delay(100)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to upload image' })
      })
  }
}

function getCompleteHandler(response: CompleteResponse) {
  switch (response) {
    case 'success':
      return trpcMsw.expenses.complete.mutation(async () => {
        await delay(100)
        return createMockExpense({ state: 'complete' })
      })
    case 'networkError':
      return trpcMsw.expenses.complete.mutation(async () => {
        await delay(100)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to save expense' })
      })
  }
}

// =============================================================================
// Meta
// =============================================================================

const meta: Meta<StoryArgs> = {
  title: 'Domain/ExpenseCapture',
  component: ExpenseCapture,
  parameters: {
    layout: 'centered',
  },
  args: {
    userId: 'user-1',
  },
}

export default meta
type Story = StoryObj<StoryArgs>

// =============================================================================
// Interactive Story (for development/exploration)
// =============================================================================

/**
 * **Interactive Playground**
 *
 * Configure API responses using controls, then click through the component.
 * Use this for development and manual testing.
 *
 * **Flow:**
 * 1. Component loads → `checkExtractionHealth` API called
 * 2. Upload image → `capture` API called
 * 3. If needsReview → edit form → `complete` API called
 */
export const Interactive: Story = {
  args: {
    healthApi: 'ready',
    captureApi: 'needsReview',
    completeApi: 'success',
  },
  argTypes: {
    healthApi: {
      name: 'checkExtractionHealth',
      control: 'select',
      options: ['ready', 'ollamaUnavailable', 'modelMissing', 'networkError'] satisfies HealthResponse[],
      description: 'Response from health check API',
      table: { category: 'API Responses' },
    },
    captureApi: {
      name: 'capture',
      control: 'select',
      options: ['needsReview', 'autoComplete', 'networkError'] satisfies CaptureResponse[],
      description: 'Response when uploading receipt image',
      table: { category: 'API Responses' },
    },
    completeApi: {
      name: 'complete',
      control: 'select',
      options: ['success', 'networkError'] satisfies CompleteResponse[],
      description: 'Response when saving reviewed expense',
      table: { category: 'API Responses' },
    },
  },
  loaders: [
    async ({ args }) => {
      const worker = getWorker()
      worker.resetHandlers()
      worker.use(getHealthHandler(args.healthApi), getCaptureHandler(args.captureApi), getCompleteHandler(args.completeApi))
      return {}
    },
  ],
}
