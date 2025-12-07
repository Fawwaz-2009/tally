# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Root level (pnpm workspace + turborepo)
pnpm dev              # Start all dev servers
pnpm build            # Build all packages
pnpm lint             # Lint all packages
pnpm check-types      # Type check all packages

# Web app (apps/web)
pnpm dev              # Vite dev server on port 3000
pnpm build            # Production build
pnpm storybook        # Storybook on port 6006
pnpm test-storybook   # Run Storybook tests with Vitest

# Data-ops package (packages/data-ops)
pnpm db:generate      # Generate Drizzle migrations
pnpm db:push          # Push schema to database
pnpm db:studio        # Open Drizzle Studio
pnpm db:reset         # Reset local database
```

## Architecture

### Monorepo Structure
- `apps/web` - Full-stack TanStack Start application (React + Vite + Nitro SSR)
- `packages/data-ops` - Domain logic layer using Effect.js + Drizzle ORM
- `packages/ui` - Shared React components
- `packages/eslint-config` / `packages/typescript-config` - Shared configs

### Web App (`apps/web/src/`)
- **Routes**: TanStack Router file-based routing in `routes/`. Route-specific components go in `-components/` subdirectories.
- **Components**: `components/ui/` for shadcn primitives, `components/expense/` for domain components
- **Server**: tRPC routers in `server/trpc/`, API handlers via Hono
- **Integrations**: tRPC client setup in `integrations/trpc-react.ts`

### Data-Ops Package (`packages/data-ops/src/`)
Uses Domain-Driven Design with Effect.js:
- **`domain/`**: Business logic by aggregate (expenses, settings, users, currency, extraction)
  - Each domain has: `schema.ts` (Zod), `repo.ts` (repository), `service.ts` (Effect service)
- **`db/schema.ts`**: Drizzle ORM table definitions
- **`layers/`**: Effect.js dependency injection layers
- **`runtimes/`**: Effect runtime configurations

### Key Patterns
- **tRPC + TanStack Query**: Type-safe API with SSR data fetching via route loaders
- **Effect.js Services**: Domain services extend `Effect.Service` with layer-based DI
- **Repository Pattern**: Data access abstracted in `repo.ts` files
- **Drizzle + Zod**: Schema-first ORM with auto-generated validation via drizzle-zod

## Tech Stack
- React 19, TanStack Router/Query/Start, Vite 7
- tRPC v11, Hono, Nitro (Node.js runtime)
- Drizzle ORM + SQLite (better-sqlite3)
- Effect.js for domain logic
- Tailwind CSS v4, shadcn/ui, Radix UI
- Storybook 10, Vitest, MSW for testing

## Conventions

### Adding shadcn Components
```bash
pnpx shadcn@latest add [component]
```

### Route Loaders (SSR Data Fetching)
```tsx
export const Route = createFileRoute('/path')({
  component: Component,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      context.trpc.someRouter.someQuery.queryOptions()
    )
  },
})
```

### tRPC Usage in Components
```tsx
const trpc = useTRPC()
const { data } = useQuery(trpc.router.query.queryOptions())
const mutation = useMutation(trpc.router.mutation.mutationOptions())
```

### Component Co-location
Components only used by one parent should be co-located in the same directory. Extract shared components to `components/`.

## Component Driven Development

This project follows a component-driven development approach where UI components are developed and tested in isolation using Storybook before being integrated into the application.

### Philosophy

1. **Co-location over abstraction**: Keep API calls, error handling, and state management co-located with the component that uses them. Don't create premature abstractions that separate concerns that naturally belong together.

2. **Callback-based component design**: Components that participate in flows should accept callbacks (`onComplete`, `onBack`, etc.) rather than directly calling navigation or global state. This makes them reusable in different contexts.

3. **Two types of orchestration**:
   - **URL-based** (TanStack Router search params): For user-facing flows where browser navigation matters
   - **State-based** (React state): For embedded flows, setup wizards, or Storybook stories

### Multi-Stage Flow Pattern

When building multi-stage flows (e.g., upload → review → success):

```tsx
// Stage components are decoupled from routing
interface UploadStageProps {
  userId: string
  onComplete: (id: string, needsReview: boolean) => void
}

interface ReviewStageProps {
  expenseId: string
  onComplete: (id: string) => void
  onBack: () => void
}

interface SuccessStageProps {
  expenseId: string
  onAddAnother?: () => void          // Optional - omit to hide button
  actionButton?: React.ReactNode     // Custom action for different contexts
}
```

**URL-based orchestration** (for `/add` route):
```tsx
const search = Route.useSearch()  // { stage?: 'review' | 'success', id?: string }
const navigate = useNavigate({ from: Route.fullPath })

const goToReview = (id: string) => navigate({ search: { stage: 'review', id }, replace: true })
const goToSuccess = (id: string) => navigate({ search: { stage: 'success', id }, replace: true })
```

**State-based orchestration** (for setup page, stories):
```tsx
const [stage, setStage] = useState<'upload' | 'review' | 'success'>('upload')
const [expenseId, setExpenseId] = useState<string | null>(null)
```

### Storybook Stories

Stories serve two distinct purposes. Each component should have exactly two story files:

#### 1. Interactive Story (`component.stories.tsx`)
ONE story with controls to configure API responses. No preset/presentational stories - use controls to test different scenarios manually:

```tsx
// capture-flow.stories.tsx - just ONE exported story
export const Interactive: Story = {
  args: {
    healthApi: 'ready',
    captureApi: 'needsReview',
    completeApi: 'success',
  },
  argTypes: {
    healthApi: {
      control: 'select',
      options: ['ready', 'unavailable', 'error'],
      table: { category: 'API Responses' },
    },
    // ... controls for each API endpoint
  },
  loaders: [
    async ({ args }) => {
      const worker = getWorker()
      worker.resetHandlers()
      worker.use(
        getHealthHandler(args.healthApi),
        getCaptureHandler(args.captureApi),
      )
      return {}
    },
  ],
}
```

#### 2. Test Stories (`component.test.stories.tsx`)
Multiple stories that automate specific flows for regression testing:

```tsx
// capture-flow.test.stories.tsx
export const CaptureSuccess: Story = {
  parameters: {
    msw: {
      handlers: [
        trpcMsw.expenses.checkExtractionHealth.query(() => ollamaScenarios.ready),
        trpcMsw.expenses.capture.mutation(async () => captureScenarios.needsReview),
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

    await waitFor(() => {
      expect(canvas.getByRole('heading', { name: /review expense/i })).toBeInTheDocument()
    }, { timeout: 3000 })
  },
}
```

### MSW + msw-trpc Mocking

Use type-safe mocks with factory functions:

```tsx
// .storybook/mocks/trpc.ts
export const trpcMsw = createTRPCMsw<TRPCRouter>({
  links: [httpLink({ url: '/api/trpc' })],
  transformer: { input: superjson, output: superjson },
})

// .storybook/mocks/factories.ts
export const captureScenarios = {
  needsReview: createMockCaptureResult({ needsReview: true }),
  autoComplete: createMockCaptureResult({ needsReview: false, expense: { state: 'complete' } }),
}
```

### Refactoring Guidelines

When refactoring components:

1. **Identify ALL consumers** - Search for imports before making changes. Don't rationalize keeping old code because "it's used elsewhere" - update all consumers.

2. **Stories must be updated** - If a component changes, its stories must change. Stories are part of the component's contract.

3. **Prefer shared components over duplication** - If two routes need the same UI, extract to `components/` and orchestrate differently per route.

4. **Test the full flow** - Create test stories that exercise the complete user journey, not just individual states.

## Anti-Patterns to Avoid

### No Silent Fallbacks for Required Data
Never use fallback values (`??`, `||`) to mask potentially missing data:

```tsx
// BAD - hides bugs, creates data integrity issues
currency: result.currency ?? 'USD',
merchant: result.merchant ?? 'Unknown',
amount: result.amount ?? 0,

// GOOD - fail explicitly if data is missing
const { amount, currency, merchant } = result
if (amount == null || currency == null || merchant == null) {
  throw new Error('Completed expense is missing required fields')
}
```

Silent fallbacks make bugs hard to trace. If data should exist, validate it explicitly and throw if it doesn't.

### No Rationalized Technical Debt
When refactoring, don't rationalize keeping old code with excuses like "the setup page has different UX needs." If components share functionality, extract properly and support both use cases. Do the work correctly the first time.
