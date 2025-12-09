import type { Meta, StoryObj } from '@storybook/react-vite'
import { getWorker } from 'msw-storybook-addon'
import { delay, http, HttpResponse } from 'msw'
import superjson from 'superjson'
import { TRPCError } from '@trpc/server'

import { trpcMsw } from '../../../../.storybook/mocks/trpc'
import { expenseFactory, ollamaScenarios, captureScenarios, expenseScenarios } from '../../../../.storybook/mocks/factories'
import { CaptureFlow } from './capture-flow'

// =============================================================================
// API Response Types
// =============================================================================

type HealthResponse = 'ready' | 'ollamaUnavailable' | 'modelMissing' | 'networkError'
type CaptureResponse = 'needsReview' | 'autoComplete' | 'networkError'
type GetByIdResponse = 'draft' | 'complete' | 'networkError'
type CompleteResponse = 'success' | 'networkError'

interface StoryArgs {
  userId: string
  showAddAnother: boolean
  healthApi: HealthResponse
  captureApi: CaptureResponse
  getByIdApi: GetByIdResponse
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

/**
 * Creates a raw MSW handler for the FormData-based capture endpoint.
 * msw-trpc doesn't handle FormData, so we need a custom handler.
 */
function getCaptureHandler(response: CaptureResponse) {
  return http.post('/api/trpc/expenses.capture', async () => {
    await delay(100)

    if (response === 'networkError') {
      return HttpResponse.json({
        error: {
          json: {
            message: 'Failed to upload image',
            code: -32600,
            data: { code: 'INTERNAL_SERVER_ERROR', httpStatus: 500 },
          },
        },
      })
    }

    const data = response === 'needsReview' ? captureScenarios.needsReview : captureScenarios.autoComplete

    return HttpResponse.json({
      result: {
        data: {
          json: data,
          meta: { values: superjson.serialize(data).meta },
        },
      },
    })
  })
}

function getByIdHandler(response: GetByIdResponse) {
  switch (response) {
    case 'draft':
      return trpcMsw.expenses.getById.query(() => expenseScenarios.draft)
    case 'complete':
      return trpcMsw.expenses.getById.query(() => expenseScenarios.complete)
    case 'networkError':
      return trpcMsw.expenses.getById.query(() => {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Expense not found' })
      })
  }
}

function getCompleteHandler(response: CompleteResponse) {
  switch (response) {
    case 'success':
      return trpcMsw.expenses.complete.mutation(async () => {
        await delay(100)
        return expenseFactory.complete()
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
  title: 'Domain/CaptureFlow',
  component: CaptureFlow,
  parameters: {
    layout: 'centered',
  },
  args: {
    userId: 'user-1',
    showAddAnother: true,
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
 * 3. If needsReview → `getById` fetches expense → edit form → `complete` API called
 * 4. Success → `getById` fetches expense for display
 */
export const Interactive: Story = {
  args: {
    healthApi: 'ready',
    captureApi: 'needsReview',
    getByIdApi: 'draft',
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
    getByIdApi: {
      name: 'getById',
      control: 'select',
      options: ['draft', 'complete', 'networkError'] satisfies GetByIdResponse[],
      description: 'Response when fetching expense by ID (for review/success stages)',
      table: { category: 'API Responses' },
    },
    completeApi: {
      name: 'complete',
      control: 'select',
      options: ['success', 'networkError'] satisfies CompleteResponse[],
      description: 'Response when saving reviewed expense',
      table: { category: 'API Responses' },
    },
    showAddAnother: {
      control: 'boolean',
      description: 'Show "Add Another" button on success',
      table: { category: 'Props' },
    },
  },
  loaders: [
    async ({ args }) => {
      const worker = getWorker()
      worker.resetHandlers()
      worker.use(
        getHealthHandler(args.healthApi),
        getCaptureHandler(args.captureApi),
        getByIdHandler(args.getByIdApi),
        getCompleteHandler(args.completeApi),
      )
      return {}
    },
  ],
}
