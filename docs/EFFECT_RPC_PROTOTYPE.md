# Effect RPC + TanStack Query Architecture Prototype

This document provides a complete working prototype for replacing tRPC with Effect RPC + effect-query in a TanStack Start application.

## Architecture Overview

```
Browser: useEffectQuery (effect-query) --> Effect RPC client call --> HTTP --> Server RPC handler --> Domain services (Effect)
SSR:     useEffectQuery (effect-query) --> Effect RPC client call --> Direct invocation (RpcTest.makeClient) --> Domain services (Effect)
```

The key insight is that **effect-query runs the RPC client Effect in the browser/SSR**, not the domain service directly. The domain service runs server-side in the RPC handler.

## File Structure

```
packages/
  data-ops/
    src/
      rpc/
        schema.ts       # Shared RPC definitions (both client & server)
        handlers.ts     # Server-side handlers
        index.ts        # Re-exports
      domain/
        expenses/
          service.ts    # Existing Effect services
apps/
  web/
    src/
      lib/
        rpc/
          client.ts     # Client setup (effect-query + RPC client)
          provider.tsx  # React context provider
      routes/
        _main/
          index.tsx     # Example usage with SSR
```

---

## Step 1: Shared RPC Schema Definitions

These are shared between client and server. They define the contract.

```typescript
// packages/data-ops/src/rpc/schema.ts
import { Rpc, RpcGroup } from "@effect/rpc"
import { Schema, Data } from "effect"

// ============================================================================
// Domain Errors (Effect Schema versions for serialization)
// ============================================================================

export class ExpenseNotFoundError extends Schema.TaggedError<ExpenseNotFoundError>()(
  "ExpenseNotFoundError",
  { id: Schema.String }
) {}

export class ExpenseAlreadyCompleteError extends Schema.TaggedError<ExpenseAlreadyCompleteError>()(
  "ExpenseAlreadyCompleteError",
  { id: Schema.String }
) {}

export class MissingRequiredFieldsError extends Schema.TaggedError<MissingRequiredFieldsError>()(
  "MissingRequiredFieldsError",
  { id: Schema.String, missingFields: Schema.Array(Schema.String) }
) {}

export class ExtractionUnavailableError extends Schema.TaggedError<ExtractionUnavailableError>()(
  "ExtractionUnavailableError",
  { reason: Schema.String }
) {}

// ============================================================================
// Response Schemas
// ============================================================================

export const ExpenseSchema = Schema.Struct({
  id: Schema.String,
  userId: Schema.String,
  state: Schema.Union(Schema.Literal("draft"), Schema.Literal("complete")),
  amount: Schema.NullOr(Schema.Number),
  currency: Schema.NullOr(Schema.String),
  merchant: Schema.NullOr(Schema.String),
  description: Schema.NullOr(Schema.String),
  categories: Schema.NullOr(Schema.String),
  expenseDate: Schema.NullOr(Schema.DateFromSelf),
  receiptImageKey: Schema.NullOr(Schema.String),
  baseAmount: Schema.NullOr(Schema.Number),
  baseCurrency: Schema.NullOr(Schema.String),
  extractionStatus: Schema.NullOr(Schema.String),
  createdAt: Schema.DateFromSelf,
  updatedAt: Schema.DateFromSelf,
})

export type Expense = Schema.Schema.Type<typeof ExpenseSchema>

export const CaptureResultSchema = Schema.Struct({
  expense: ExpenseSchema,
  extraction: Schema.Struct({
    success: Schema.Boolean,
    data: Schema.NullOr(Schema.Struct({
      amount: Schema.NullOr(Schema.Number),
      currency: Schema.NullOr(Schema.String),
      merchant: Schema.NullOr(Schema.String),
      date: Schema.NullOr(Schema.String),
      categories: Schema.NullOr(Schema.String),
    })),
    error: Schema.NullOr(Schema.String),
    timing: Schema.NullOr(Schema.Struct({
      ocrMs: Schema.Number,
      llmMs: Schema.Number,
    })),
  }),
  needsReview: Schema.Boolean,
})

export const ExtractionHealthSchema = Schema.Struct({
  available: Schema.Boolean,
  model: Schema.NullOr(Schema.String),
  error: Schema.NullOr(Schema.String),
})

// ============================================================================
// RPC Definitions
// ============================================================================

// Queries
export const ListExpenses = Rpc.make("ListExpenses", {
  success: Schema.Array(ExpenseSchema),
})

export const ListAllExpenses = Rpc.make("ListAllExpenses", {
  success: Schema.Array(ExpenseSchema),
})

export const GetExpenseById = Rpc.make("GetExpenseById", {
  payload: { id: Schema.String },
  success: Schema.NullOr(ExpenseSchema),
})

export const GetExpensesByUser = Rpc.make("GetExpensesByUser", {
  payload: { userId: Schema.String },
  success: Schema.Array(ExpenseSchema),
})

export const GetPendingReview = Rpc.make("GetPendingReview", {
  success: Schema.Array(ExpenseSchema),
})

export const GetPendingReviewCount = Rpc.make("GetPendingReviewCount", {
  success: Schema.Number,
})

export const CheckExtractionHealth = Rpc.make("CheckExtractionHealth", {
  success: ExtractionHealthSchema,
  error: ExtractionUnavailableError,
})

// Mutations
export const CaptureExpense = Rpc.make("CaptureExpense", {
  payload: {
    userId: Schema.String,
    // Note: File upload requires special handling - see below
    imageBase64: Schema.String,
    imageName: Schema.String,
    imageType: Schema.String,
  },
  success: CaptureResultSchema,
  error: Schema.Union(ExtractionUnavailableError),
})

export const CompleteExpense = Rpc.make("CompleteExpense", {
  payload: {
    id: Schema.String,
    amount: Schema.optional(Schema.Number),
    currency: Schema.optional(Schema.String),
    merchant: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),
    categories: Schema.optional(Schema.String),
    expenseDate: Schema.optional(Schema.DateFromSelf),
  },
  success: ExpenseSchema,
  error: Schema.Union(
    ExpenseNotFoundError,
    ExpenseAlreadyCompleteError,
    MissingRequiredFieldsError
  ),
})

export const UpdateExpense = Rpc.make("UpdateExpense", {
  payload: {
    id: Schema.String,
    amount: Schema.optional(Schema.Number),
    currency: Schema.optional(Schema.String),
    merchant: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),
    categories: Schema.optional(Schema.String),
    expenseDate: Schema.optional(Schema.DateFromSelf),
  },
  success: Schema.NullOr(ExpenseSchema),
  error: ExpenseNotFoundError,
})

export const DeleteExpense = Rpc.make("DeleteExpense", {
  payload: { id: Schema.String },
  success: Schema.Boolean,
})

// ============================================================================
// RPC Group
// ============================================================================

export const ExpensesRpc = RpcGroup.make(
  // Queries
  ListExpenses,
  ListAllExpenses,
  GetExpenseById,
  GetExpensesByUser,
  GetPendingReview,
  GetPendingReviewCount,
  CheckExtractionHealth,
  // Mutations
  CaptureExpense,
  CompleteExpense,
  UpdateExpense,
  DeleteExpense
).prefix("expenses.")
```

---

## Step 2: Server-Side RPC Handlers

These implement the RPC procedures using your existing domain services.

```typescript
// packages/data-ops/src/rpc/handlers.ts
import { Effect, Layer } from "effect"
import { ExpensesRpc } from "./schema"
import { ExpenseService } from "../domain/expenses/service"
import { ExpenseRepo } from "../domain/expenses/repo"

// ============================================================================
// Handler Implementations
// ============================================================================

export const ExpensesHandlers = ExpensesRpc.toLayer({
  // Queries - directly use repo for read operations
  ListExpenses: () => ExpenseRepo.getComplete(),

  ListAllExpenses: () => ExpenseRepo.getAll(),

  GetExpenseById: ({ id }) => ExpenseRepo.getById(id),

  GetExpensesByUser: ({ userId }) => ExpenseRepo.getByUser(userId),

  GetPendingReview: () => ExpenseRepo.getPendingReview(),

  GetPendingReviewCount: () => ExpenseRepo.countPendingReview(),

  CheckExtractionHealth: () =>
    Effect.gen(function* () {
      const service = yield* ExpenseService
      return yield* service.checkExtractionHealth()
    }),

  // Mutations - use service for business logic
  CaptureExpense: ({ userId, imageBase64, imageName, imageType }) =>
    Effect.gen(function* () {
      const service = yield* ExpenseService
      // Convert base64 back to File for the service
      const buffer = Buffer.from(imageBase64, "base64")
      const blob = new Blob([buffer], { type: imageType })
      const file = new File([blob], imageName, { type: imageType })

      return yield* service.capture({ userId, image: file })
    }),

  CompleteExpense: (input) =>
    Effect.gen(function* () {
      const service = yield* ExpenseService
      return yield* service.complete(input)
    }),

  UpdateExpense: (input) =>
    Effect.gen(function* () {
      const service = yield* ExpenseService
      return yield* service.update(input)
    }),

  DeleteExpense: ({ id }) => ExpenseRepo.delete(id),
})

// The handlers layer needs the domain services
export const HandlersLive = ExpensesHandlers.pipe(
  Layer.provide(ExpenseService.Default),
  Layer.provide(ExpenseRepo.Default)
)
```

---

## Step 3: Server Setup (Hono + Effect RPC)

```typescript
// apps/web/server/rpc/server.ts
import { Hono } from "hono"
import { Effect, Layer } from "effect"
import { RpcServer, RpcSerialization } from "@effect/rpc"
import { HttpRouter } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { ExpensesRpc } from "@repo/data-ops/rpc"
import { HandlersLive } from "@repo/data-ops/rpc/handlers"
import { BaseLayer } from "@repo/data-ops/runtimes"

// Create the RPC server layer
const RpcLive = RpcServer.layerHttpRouter({
  group: ExpensesRpc,
  path: "/rpc",
  protocol: "http",
}).pipe(
  Layer.provide(HandlersLive),
  Layer.provide(BaseLayer)
)

// For Hono integration, use toHttpApp instead
export const createRpcApp = Effect.gen(function* () {
  const app = yield* RpcServer.toHttpApp(ExpensesRpc, {
    spanPrefix: "rpc.expenses",
  })
  return app
}).pipe(
  Effect.provide(HandlersLive),
  Effect.provide(BaseLayer),
  Effect.provide(RpcSerialization.layerJson)
)
```

For Hono specifically, you'll want to mount the Effect HTTP app:

```typescript
// apps/web/server/hono.ts
import { Hono } from "hono"
import { Effect, Layer, ManagedRuntime } from "effect"
import { RpcServer, RpcSerialization } from "@effect/rpc"
import { ExpensesRpc, HandlersLive } from "@repo/data-ops/rpc"
import { BaseLayer } from "@repo/data-ops/runtimes"

const app = new Hono()

// Create runtime with all dependencies
const ServerRuntime = ManagedRuntime.make(
  Layer.mergeAll(
    HandlersLive,
    BaseLayer,
    RpcSerialization.layerJson
  )
)

// Mount RPC endpoint
app.post("/rpc", async (c) => {
  const body = await c.req.text()

  const program = Effect.gen(function* () {
    const httpApp = yield* RpcServer.toHttpApp(ExpensesRpc)
    // Process request through Effect HTTP app
    // This is simplified - actual implementation needs request/response conversion
    return yield* httpApp(/* convert Hono request to Effect request */)
  })

  const result = await ServerRuntime.runPromise(program)
  return c.json(result)
})

export default app
```

---

## Step 4: Client Setup with effect-query

```typescript
// apps/web/src/lib/rpc/client.ts
import { createEffectQuery } from "effect-query"
import { Effect, Layer, ManagedRuntime, Context } from "effect"
import { RpcClient, RpcSerialization, RpcTest } from "@effect/rpc"
import { HttpClient } from "@effect/platform"
import { BrowserHttpClient } from "@effect/platform-browser"
import { ExpensesRpc, HandlersLive } from "@repo/data-ops/rpc"
import { BaseLayer } from "@repo/data-ops/runtimes"

// ============================================================================
// Isomorphic RPC Client
// ============================================================================

// Define a tag for the RPC client
class ExpensesClient extends Context.Tag("ExpensesClient")<
  ExpensesClient,
  RpcClient.RpcClient<typeof ExpensesRpc["requests"] extends Map<string, infer R> ? R : never>
>() {}

// Browser layer - uses HTTP protocol
const BrowserClientLayer = Layer.scoped(
  ExpensesClient,
  RpcClient.make(ExpensesRpc)
).pipe(
  Layer.provide(RpcClient.layerProtocolHttp({ url: "/rpc" })),
  Layer.provide(RpcSerialization.layerJson),
  Layer.provide(BrowserHttpClient.layerXMLHttpRequest)
)

// SSR layer - uses direct invocation (no HTTP)
const SSRClientLayer = Layer.scoped(
  ExpensesClient,
  RpcTest.makeClient(ExpensesRpc)
).pipe(
  Layer.provide(HandlersLive),
  Layer.provide(BaseLayer)
)

// ============================================================================
// Runtimes
// ============================================================================

// Browser runtime
export const browserRuntime = ManagedRuntime.make(BrowserClientLayer)

// SSR runtime - created per-request on server
export const createSSRRuntime = () => ManagedRuntime.make(SSRClientLayer)

// ============================================================================
// effect-query Setup
// ============================================================================

// Determine if we're on server or client
const isServer = typeof window === "undefined"

// Create effect-query instance
export const eq = createEffectQuery(
  isServer ? SSRClientLayer : BrowserClientLayer
)

// ============================================================================
// Query/Mutation Helpers
// ============================================================================

// These are the actual functions used in components
export const expenseQueries = {
  list: () => eq.queryOptions({
    queryKey: ["expenses", "list"],
    queryFn: () =>
      Effect.gen(function* () {
        const client = yield* ExpensesClient
        return yield* client["expenses.ListExpenses"]({})
      }),
  }),

  listAll: () => eq.queryOptions({
    queryKey: ["expenses", "listAll"],
    queryFn: () =>
      Effect.gen(function* () {
        const client = yield* ExpensesClient
        return yield* client["expenses.ListAllExpenses"]({})
      }),
  }),

  getById: (id: string) => eq.queryOptions({
    queryKey: ["expenses", "byId", id],
    queryFn: () =>
      Effect.gen(function* () {
        const client = yield* ExpensesClient
        return yield* client["expenses.GetExpenseById"]({ id })
      }),
  }),

  getByUser: (userId: string) => eq.queryOptions({
    queryKey: ["expenses", "byUser", userId],
    queryFn: () =>
      Effect.gen(function* () {
        const client = yield* ExpensesClient
        return yield* client["expenses.GetExpensesByUser"]({ userId })
      }),
  }),

  pendingReview: () => eq.queryOptions({
    queryKey: ["expenses", "pendingReview"],
    queryFn: () =>
      Effect.gen(function* () {
        const client = yield* ExpensesClient
        return yield* client["expenses.GetPendingReview"]({})
      }),
  }),

  pendingReviewCount: () => eq.queryOptions({
    queryKey: ["expenses", "pendingReviewCount"],
    queryFn: () =>
      Effect.gen(function* () {
        const client = yield* ExpensesClient
        return yield* client["expenses.GetPendingReviewCount"]({})
      }),
  }),

  extractionHealth: () => eq.queryOptions({
    queryKey: ["expenses", "extractionHealth"],
    queryFn: () =>
      Effect.gen(function* () {
        const client = yield* ExpensesClient
        return yield* client["expenses.CheckExtractionHealth"]({})
      }),
  }),
}

export const expenseMutations = {
  capture: () => eq.mutationOptions({
    mutationKey: ["expenses", "capture"],
    mutationFn: (input: { userId: string; image: File }) =>
      Effect.gen(function* () {
        const client = yield* ExpensesClient
        // Convert File to base64 for RPC transport
        const arrayBuffer = yield* Effect.promise(() => input.image.arrayBuffer())
        const imageBase64 = Buffer.from(arrayBuffer).toString("base64")

        return yield* client["expenses.CaptureExpense"]({
          userId: input.userId,
          imageBase64,
          imageName: input.image.name,
          imageType: input.image.type,
        })
      }),
  }),

  complete: () => eq.mutationOptions({
    mutationKey: ["expenses", "complete"],
    mutationFn: (input: Parameters<typeof client["expenses.CompleteExpense"]>[0]) =>
      Effect.gen(function* () {
        const client = yield* ExpensesClient
        return yield* client["expenses.CompleteExpense"](input)
      }),
  }),

  update: () => eq.mutationOptions({
    mutationKey: ["expenses", "update"],
    mutationFn: (input: { id: string; [key: string]: any }) =>
      Effect.gen(function* () {
        const client = yield* ExpensesClient
        return yield* client["expenses.UpdateExpense"](input)
      }),
  }),

  delete: () => eq.mutationOptions({
    mutationKey: ["expenses", "delete"],
    mutationFn: (id: string) =>
      Effect.gen(function* () {
        const client = yield* ExpensesClient
        return yield* client["expenses.DeleteExpense"]({ id })
      }),
  }),
}
```

---

## Step 5: React Provider

```typescript
// apps/web/src/lib/rpc/provider.tsx
import { createContext, useContext, useMemo } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ManagedRuntime } from "effect"
import { eq, browserRuntime, createSSRRuntime } from "./client"

// Context for the Effect runtime
const RuntimeContext = createContext<ManagedRuntime.ManagedRuntime<any, never> | null>(null)

export function useRuntime() {
  const runtime = useContext(RuntimeContext)
  if (!runtime) throw new Error("RuntimeContext not found")
  return runtime
}

interface RpcProviderProps {
  children: React.ReactNode
  queryClient: QueryClient
  // For SSR: pass a pre-created runtime with request-scoped context
  ssrRuntime?: ManagedRuntime.ManagedRuntime<any, never>
}

export function RpcProvider({ children, queryClient, ssrRuntime }: RpcProviderProps) {
  // Use SSR runtime if provided, otherwise browser runtime
  const runtime = useMemo(
    () => ssrRuntime ?? browserRuntime,
    [ssrRuntime]
  )

  return (
    <RuntimeContext.Provider value={runtime}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </RuntimeContext.Provider>
  )
}
```

---

## Step 6: Usage in Components

```typescript
// apps/web/src/routes/_main/index.tsx
import { createFileRoute } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { expenseQueries, expenseMutations, eq } from "@/lib/rpc/client"

export const Route = createFileRoute("/_main/")({
  component: ExpensesList,
  // SSR data fetching
  loader: async ({ context }) => {
    // On server, ensureQueryData will use the SSR runtime (direct invocation)
    // On client, it will use HTTP
    await context.queryClient.ensureQueryData(expenseQueries.list())
    await context.queryClient.ensureQueryData(expenseQueries.pendingReviewCount())
  },
})

function ExpensesList() {
  const queryClient = useQueryClient()

  // Queries - fully typed from Effect RPC schema
  const { data: expenses, status, error } = useQuery(expenseQueries.list())
  const { data: pendingCount } = useQuery(expenseQueries.pendingReviewCount())

  // Mutations
  const deleteMutation = useMutation({
    ...expenseMutations.delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] })
    },
  })

  // Type-safe error handling via effect-query's match()
  if (status === "error" && error) {
    return error.match({
      // These match the error types in the RPC schema
      ExpenseNotFoundError: (e) => <div>Expense {e.id} not found</div>,
      ExtractionUnavailableError: (e) => <div>Extraction unavailable: {e.reason}</div>,
      OrElse: (cause) => <div>Error: {String(cause)}</div>,
    })
  }

  if (status === "pending") {
    return <div>Loading...</div>
  }

  return (
    <div>
      <h1>Expenses ({pendingCount} pending review)</h1>
      <ul>
        {expenses?.map((expense) => (
          <li key={expense.id}>
            {expense.merchant} - {expense.amount} {expense.currency}
            <button onClick={() => deleteMutation.mutate(expense.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

---

## Step 7: TanStack Start Integration

```typescript
// apps/web/src/router.tsx
import { createRouter } from "@tanstack/react-router"
import { QueryClient } from "@tanstack/react-query"
import { routeTree } from "./routeTree.gen"
import { createSSRRuntime, eq } from "./lib/rpc/client"

export function createAppRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60, // 1 minute
      },
    },
  })

  // For SSR, create a request-scoped runtime
  const ssrRuntime = typeof window === "undefined" ? createSSRRuntime() : undefined

  return createRouter({
    routeTree,
    context: {
      queryClient,
      // Pass to route loaders for SSR data fetching
      eq,
      ssrRuntime,
    },
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  })
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
```

---

## Key Differences from tRPC

| Feature | tRPC | Effect RPC + effect-query |
|---------|------|---------------------------|
| Schema definition | Zod in router | Effect Schema in shared file |
| Error typing | Manual or inferProcedureOutput | Schema.TaggedError with match() |
| Client creation | createTRPCClient | RpcClient.make or RpcTest.makeClient |
| SSR | unstable_localLink | RpcTest.makeClient (direct invocation) |
| Query integration | @trpc/tanstack-react-query | effect-query |
| Streaming | trpc subscriptions | Rpc.make with stream: true |

## Type Flow

```
Schema (Effect Schema)
    |
    v
RPC Definition (Rpc.make)
    |
    v
RPC Group (RpcGroup.make)
    |
    +---> Server: group.toLayer() --> Handlers --> Domain Services
    |
    +---> Client: RpcClient.make(group) --> Effect<A, E>
                        |
                        v
                 effect-query (queryOptions/mutationOptions)
                        |
                        v
                 TanStack Query (useQuery/useMutation)
```

## Error Handling Flow

```typescript
// 1. Define error in schema
export class ExpenseNotFoundError extends Schema.TaggedError<ExpenseNotFoundError>()(
  "ExpenseNotFoundError",
  { id: Schema.String }
) {}

// 2. Use in RPC definition
export const GetExpense = Rpc.make("GetExpense", {
  payload: { id: Schema.String },
  success: ExpenseSchema,
  error: ExpenseNotFoundError,
})

// 3. Return from handler
GetExpense: ({ id }) =>
  Effect.gen(function* () {
    const expense = yield* repo.getById(id)
    if (!expense) {
      return yield* Effect.fail(new ExpenseNotFoundError({ id }))
    }
    return expense
  })

// 4. Handle in component
const { error } = useQuery(expenseQueries.getById(id))

if (error) {
  return error.match({
    ExpenseNotFoundError: (e) => <NotFound id={e.id} />,
    OrElse: (cause) => <GenericError cause={cause} />,
  })
}
```

---

## Migration Path

1. **Keep tRPC running** while you build out Effect RPC
2. **Start with one domain** (e.g., expenses)
3. **Define RPC schemas** based on existing tRPC router types
4. **Implement handlers** using existing Effect services
5. **Create client queries/mutations** with effect-query
6. **Update components** one at a time
7. **Test SSR** with route loaders
8. **Remove tRPC** when migration is complete

## Dependencies to Add

```json
{
  "dependencies": {
    "@effect/rpc": "^1.x",
    "@effect/platform": "^1.x",
    "@effect/platform-browser": "^1.x",
    "effect-query": "^1.x",
    "effect": "^3.x"
  }
}
```

---

## Notes

1. **File uploads**: Effect RPC doesn't natively handle multipart/form-data. Convert files to base64 on the client, or keep a separate REST endpoint for uploads.

2. **SSR hydration**: TanStack Query handles this automatically when using route loaders with `ensureQueryData`.

3. **Error serialization**: Schema.TaggedError errors serialize/deserialize automatically across the RPC boundary.

4. **Streaming**: For real-time updates, use `Rpc.make(..., { stream: true })` with WebSocket protocol.
