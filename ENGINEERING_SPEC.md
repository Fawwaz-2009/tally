# Expense Tracker - Engineering Specification

## Overview

This document bridges the product specification to implementation. It defines the technical architecture, stack choices, and patterns for building the self-hosted expense tracker.

**Reference Implementation:** [story-who](../story-who) - Similar patterns adapted for self-hosted deployment.

---

## Architecture

### Single App Design

Unlike a traditional frontend/backend split, we use a single TanStack Start application that handles:

- **SSR + Client rendering** - Fast perceived performance via preloading
- **tRPC layer** - Type-safe API exposed to client
- **Effect services** - Business logic in data-ops package
- **Background worker** - Expense processing runs in-process

```
┌─────────────────────────────────────────────────────────────────┐
│                      TanStack Start App                          │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │   Routes     │───▶│    tRPC      │───▶│    data-ops      │   │
│  │   (SSR)      │    │   Router     │    │    Services      │   │
│  └──────────────┘    └──────────────┘    └────────┬─────────┘   │
│                                                    │             │
│  ┌──────────────┐                        ┌────────▼─────────┐   │
│  │   PWA        │                        │  ExpenseWorker   │   │
│  │  (Offline)   │                        │  (Background)    │   │
│  └──────────────┘                        └────────┬─────────┘   │
│                                                    │             │
│                                          ┌────────▼─────────┐   │
│                                          │     Ollama       │   │
│                                          │   (Local AI)     │   │
│                                          └──────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      SQLite (Drizzle)                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Tailscale Network Only
                              ▼
                    ┌──────────────────┐
                    │   iOS Shortcut   │
                    │   (POST image)   │
                    └──────────────────┘
```

### Why Single App

| Concern | Solution |
|---------|----------|
| Deployment complexity | One container, not two |
| Type safety | tRPC in same codebase as services |
| Worker lifecycle | Starts with app, no orchestration |
| Shared types | Monorepo, direct imports |

---

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Framework** | TanStack Start | SSR, file-based routing, server functions |
| **Routing** | TanStack Router | Type-safe, built into Start |
| **Data Fetching** | TanStack Query + tRPC | End-to-end type safety |
| **UI** | React + Tailwind + shadcn/ui | Component library |
| **PWA** | vite-plugin-pwa | Service worker, offline support |
| **API Layer** | tRPC | Wraps Effect services |
| **Services** | Effect | Dependency injection, composable |
| **Database** | SQLite + Drizzle ORM | Local, file-based, typed |
| **AI** | Ollama (local) | Vision model for extraction |
| **Deployment** | Docker | Single container |
| **Access** | Tailscale | Network-level auth |

---

## Monorepo Structure

```
expense-tracker/
├── apps/
│   └── web/                      # TanStack Start application
│       ├── src/
│       │   ├── routes/           # File-based routing
│       │   │   ├── __root.tsx
│       │   │   ├── index.tsx     # Dashboard
│       │   │   ├── expenses/
│       │   │   │   └── $id.tsx   # Expense detail
│       │   │   └── settings/
│       │   │       └── index.tsx
│       │   ├── components/       # React components
│       │   ├── trpc/
│       │   │   ├── client.ts     # Client-side tRPC
│       │   │   ├── server.ts     # Server-side tRPC
│       │   │   └── router/
│       │   │       ├── index.ts
│       │   │       ├── expenses.ts
│       │   │       ├── users.ts
│       │   │       └── settings.ts
│       │   ├── lib/
│       │   └── hooks/
│       ├── server/
│       │   ├── index.ts          # Server entry, worker startup
│       │   └── scheduled.ts      # Cron jobs (rate fetch, backups)
│       ├── public/
│       │   └── manifest.json     # PWA manifest
│       └── package.json
│
├── packages/
│   └── data-ops/                 # Effect services + schema
│       ├── src/
│       │   ├── index.ts          # Main exports
│       │   ├── schema.ts         # Drizzle table definitions
│       │   ├── domains/
│       │   │   ├── index.ts
│       │   │   ├── ExpenseRepo.ts
│       │   │   ├── ExpenseWorker.ts
│       │   │   ├── ExtractionService.ts
│       │   │   ├── UserRepo.ts
│       │   │   ├── TagRepo.ts
│       │   │   └── ScheduledTasks.ts
│       │   ├── layers/
│       │   │   ├── index.ts
│       │   │   ├── DbClient.ts
│       │   │   └── OllamaClient.ts
│       │   ├── runtimes/
│       │   │   └── index.ts      # ManagedRuntime setup
│       │   └── lib/
│       │       └── currency.ts   # Exchange rate fetching
│       └── package.json
│
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── drizzle/                      # Generated migrations
├── drizzle.config.ts
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## Package: data-ops

### Exports (package.json)

```json
{
  "name": "@expense-tracker/data-ops",
  "exports": {
    ".": "./src/index.ts",
    "./domains": "./src/domains/index.ts",
    "./layers": "./src/layers/index.ts",
    "./runtimes": "./src/runtimes/index.ts",
    "./schema": "./src/schema.ts"
  }
}
```

### Schema (Drizzle)

```typescript
// schema.ts

// Expense status
// submitted → processing → success
//                        → needs-review
export const expenseStatus = ["submitted", "processing", "success", "needs-review"] as const
export type ExpenseStatus = (typeof expenseStatus)[number]

// Expenses table
export const expenses = sqliteTable("expenses", {
  id: text("id").primaryKey(),
  status: text("status", { enum: expenseStatus }).notNull().default("submitted"),

  // Extracted data
  amount: real("amount"),
  currency: text("currency"),
  baseAmount: real("base_amount"),        // Converted to base currency
  baseCurrency: text("base_currency"),
  merchant: text("merchant"),
  categories: text("categories"),          // JSON array

  // Attribution
  userId: text("user_id").notNull(),

  // Source
  screenshotPath: text("screenshot_path"),

  // Error handling
  errorMessage: text("error_message"),

  // Timestamps
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  processedAt: text("processed_at"),
})

// Users table
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
})

// Tags table (for categories and merchants)
export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  type: text("type", { enum: ["category", "merchant"] }).notNull(),
  value: text("value").notNull(),
  normalizedValue: text("normalized_value").notNull(),  // For matching
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
})

// Settings table (key-value)
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
})
```

### Services

#### DbClient

```typescript
// layers/DbClient.ts
export class DbClient extends Effect.Service<DbClient>()("DbClient", {
  effect: Effect.sync(() => {
    const sqlite = new Database(dbPath)
    return drizzle(sqlite, { schema })
  }),
}) {}
```

#### OllamaClient

```typescript
// layers/OllamaClient.ts
export class OllamaClient extends Effect.Service<OllamaClient>()("OllamaClient", {
  effect: Effect.gen(function* () {
    const baseUrl = process.env.OLLAMA_HOST ?? "http://localhost:11434"

    return {
      generate: (params: GenerateParams) =>
        Effect.tryPromise(() =>
          fetch(`${baseUrl}/api/generate`, {
            method: "POST",
            body: JSON.stringify(params),
          }).then(r => r.json())
        ),
    }
  }),
}) {}
```

#### ExpenseRepo

```typescript
// domains/ExpenseRepo.ts
export class ExpenseRepo extends Effect.Service<ExpenseRepo>()("ExpenseRepo", {
  effect: Effect.gen(function* () {
    const db = yield* DbClient

    return {
      create: (data: ExpenseInsert) => Effect.sync(() => { ... }),
      getById: (id: string) => Effect.sync(() => { ... }),
      getNextSubmitted: () => Effect.sync(() => { ... }),  // For worker to pick up
      markProcessing: (id: string) => Effect.sync(() => { ... }),  // Worker claims job
      getByStatus: (status: ExpenseStatus) => Effect.sync(() => { ... }),
      getByUser: (userId: string) => Effect.sync(() => { ... }),
      getByDateRange: (from: Date, to: Date) => Effect.sync(() => { ... }),
      update: (id: string, data: Partial<Expense>) => Effect.sync(() => { ... }),
      delete: (id: string) => Effect.sync(() => { ... }),
      markSuccess: (id: string, data: ExtractedData) => Effect.sync(() => { ... }),
      markNeedsReview: (id: string, error: string) => Effect.sync(() => { ... }),
    }
  }),
  dependencies: [DbClient.Default],
}) {}
```

#### ExtractionService

```typescript
// domains/ExtractionService.ts
export class ExtractionService extends Effect.Service<ExtractionService>()("ExtractionService", {
  effect: Effect.gen(function* () {
    const ollama = yield* OllamaClient

    return {
      extract: (imageBase64: string) => Effect.gen(function* () {
        // Stage 1: Vision - describe the screenshot
        const description = yield* ollama.generate({
          model: "qwen3-vl:8b",
          prompt: VISION_PROMPT,
          images: [imageBase64],
          options: { temperature: 0 },
        })

        // Stage 2: JSON - structure the description
        const json = yield* ollama.generate({
          model: "gpt-oss",
          prompt: JSON_PROMPT.replace("{DESCRIPTION}", description),
          options: { temperature: 0 },
        })

        return yield* parseExpenseJson(json)
      }),
    }
  }),
  dependencies: [OllamaClient.Default],
}) {}
```

#### ExpenseWorker

```typescript
// domains/ExpenseWorker.ts
export class ExpenseWorker extends Effect.Service<ExpenseWorker>()("ExpenseWorker", {
  effect: Effect.gen(function* () {
    const repo = yield* ExpenseRepo
    const extraction = yield* ExtractionService

    const processNext = Effect.gen(function* () {
      // Get next submitted expense
      const expense = yield* repo.getNextSubmitted()
      if (!expense) return false

      // Claim the job
      yield* repo.markProcessing(expense.id)

      // Extract data
      const result = yield* extraction.extract(expense.screenshotPath).pipe(
        Effect.match({
          onSuccess: (data) => ({ success: true, data }),
          onFailure: (err) => ({ success: false, error: err.message }),
        })
      )

      // Update status based on result
      if (result.success) {
        yield* repo.markSuccess(expense.id, result.data)
      } else {
        yield* repo.markNeedsReview(expense.id, result.error)
      }

      return true
    })

    const runForever = processNext.pipe(
      Effect.flatMap((hadWork) =>
        hadWork ? Effect.void : Effect.sleep(Duration.seconds(2))
      ),
      Effect.forever
    )

    return { processNext, runForever }
  }),
  dependencies: [ExpenseRepo.Default, ExtractionService.Default],
}) {}
```

#### ScheduledTasks

```typescript
// domains/ScheduledTasks.ts
export class ScheduledTasks extends Effect.Service<ScheduledTasks>()("ScheduledTasks", {
  effect: Effect.gen(function* () {
    const db = yield* DbClient

    return {
      fetchExchangeRates: Effect.gen(function* () {
        // Fetch rates from free API
        // Store in settings table
      }),

      runBackup: Effect.gen(function* () {
        // Export expenses to JSON
        // Write to backup path
      }),

      // Start all scheduled tasks
      startAll: Effect.gen(function* () {
        // Daily rate fetch
        yield* Effect.fork(
          fetchExchangeRates.pipe(
            Effect.repeat(Schedule.cron("0 0 * * *"))  // Midnight daily
          )
        )

        // Weekly backup
        yield* Effect.fork(
          runBackup.pipe(
            Effect.repeat(Schedule.cron("0 2 * * 0"))  // Sunday 2am
          )
        )
      }),
    }
  }),
  dependencies: [DbClient.Default],
}) {}
```

### Layer Composition

```typescript
// runtimes/index.ts
import { ManagedRuntime, Layer } from "effect"

export const BaseLayer = Layer.mergeAll(
  DbClient.Default,
  OllamaClient.Default,
  ExpenseRepo.Default,
  ExtractionService.Default,
  ExpenseWorker.Default,
  UserRepo.Default,
  TagRepo.Default,
  ScheduledTasks.Default,
)

export const runtime = ManagedRuntime.make(BaseLayer)
```

---

## tRPC Router

### Router Structure

```typescript
// apps/web/src/trpc/router/index.ts
import { router } from "../init"
import { expensesRouter } from "./expenses"
import { usersRouter } from "./users"
import { settingsRouter } from "./settings"

export const appRouter = router({
  expenses: expensesRouter,
  users: usersRouter,
  settings: settingsRouter,
})

export type AppRouter = typeof appRouter
```

### Expenses Router

```typescript
// apps/web/src/trpc/router/expenses.ts
import { z } from "zod"
import { router, publicProcedure } from "../init"
import { runtime } from "@expense-tracker/data-ops/runtimes"
import { ExpenseRepo } from "@expense-tracker/data-ops/domains"

export const expensesRouter = router({
  // Submit new expense (from iOS Shortcut)
  submit: publicProcedure
    .input(z.object({
      userId: z.string(),
      imageBase64: z.string(),
      caption: z.string().optional(),  // For user override
    }))
    .mutation(async ({ input }) => {
      const program = Effect.gen(function* () {
        const repo = yield* ExpenseRepo

        // Save screenshot to disk
        const screenshotPath = yield* saveScreenshot(input.imageBase64)

        // Determine attribution
        const attributedUser = input.caption ?? input.userId

        // Create expense in submitted state (worker will pick it up)
        return yield* repo.create({
          userId: attributedUser,
          screenshotPath,
        })
      })

      return runtime.runPromise(program)
    }),

  // Get all expenses (with filters)
  list: publicProcedure
    .input(z.object({
      status: z.enum(["processing", "success", "failed"]).optional(),
      userId: z.string().optional(),
      from: z.string().optional(),  // ISO date
      to: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const program = Effect.gen(function* () {
        const repo = yield* ExpenseRepo
        return yield* repo.getFiltered(input)
      })

      return runtime.runPromise(program)
    }),

  // Get single expense
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const program = Effect.gen(function* () {
        const repo = yield* ExpenseRepo
        return yield* repo.getById(input.id)
      })

      return runtime.runPromise(program)
    }),

  // Update expense (corrections)
  update: publicProcedure
    .input(z.object({
      id: z.string(),
      amount: z.number().optional(),
      currency: z.string().optional(),
      merchant: z.string().optional(),
      categories: z.array(z.string()).optional(),
      userId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input
      const program = Effect.gen(function* () {
        const repo = yield* ExpenseRepo
        return yield* repo.update(id, data)
      })

      return runtime.runPromise(program)
    }),

  // Delete expense
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const program = Effect.gen(function* () {
        const repo = yield* ExpenseRepo
        return yield* repo.delete(input.id)
      })

      return runtime.runPromise(program)
    }),

  // Get needs-review count (for banner)
  needsReviewCount: publicProcedure
    .query(async () => {
      const program = Effect.gen(function* () {
        const repo = yield* ExpenseRepo
        const needsReview = yield* repo.getByStatus("needs-review")
        return needsReview.length
      })

      return runtime.runPromise(program)
    }),
})
```

### Users Router

```typescript
// apps/web/src/trpc/router/users.ts
export const usersRouter = router({
  list: publicProcedure.query(...),
  create: publicProcedure.input(...).mutation(...),
  update: publicProcedure.input(...).mutation(...),
})
```

### Settings Router

```typescript
// apps/web/src/trpc/router/settings.ts
export const settingsRouter = router({
  get: publicProcedure.query(...),           // Get all settings
  update: publicProcedure.mutation(...),     // Update settings
  export: publicProcedure.mutation(...),     // Trigger manual export
  getExportHistory: publicProcedure.query(...),
})
```

---

## Server Entry & Worker Startup

```typescript
// apps/web/server/index.ts
import { runtime } from "@expense-tracker/data-ops/runtimes"
import { ExpenseWorker, ScheduledTasks } from "@expense-tracker/data-ops/domains"
import { Effect } from "effect"

// Start background services when server boots
const startBackgroundServices = Effect.gen(function* () {
  const worker = yield* ExpenseWorker
  const scheduled = yield* ScheduledTasks

  // Start expense processing worker
  yield* Effect.fork(worker.runForever)

  // Start scheduled tasks (rate fetch, backups)
  yield* scheduled.startAll()

  console.log("Background services started")
})

// Run on server start
runtime.runPromise(startBackgroundServices)
```

---

## API Endpoint for iOS Shortcut

The tRPC endpoint handles expense submission natively with FormData using `zod-form-data`:

```typescript
// apps/web/server/trpc/router/expenses.ts
import { zfd } from 'zod-form-data'

const uploadFormDataSchema = zfd.formData({
  image: zfd.file(),
  userId: zfd.text(),
  caption: zfd.text().optional(),
})

uploadFromFormData: publicProcedure
  .input(uploadFormDataSchema)
  .mutation(async ({ input }) => {
    const { image, userId, caption } = input
    // Caption can override userId for attribution (e.g., "household" account)
    const effectiveUserId = caption?.trim() || userId

    // Convert File to Buffer, save to storage, run OCR + LLM extraction
    const imageBuffer = Buffer.from(await image.arrayBuffer())
    // ... ingestion logic

    return { id, status, extraction }
  }),
```

**iOS Shortcut configuration:**
- URL: `http://[tailscale-host]:3000/api/trpc/expenses.uploadFromFormData`
- Method: POST
- Body: multipart/form-data
  - `image`: Screenshot file
  - `userId`: Configured user ID
  - `caption`: Optional text (overrides userId for shared expenses)

---

## PWA Configuration

```typescript
// vite.config.ts
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Expense Tracker",
        short_name: "Expenses",
        description: "Private expense tracking for you and your partner",
        theme_color: "#000000",
        background_color: "#ffffff",
        display: "standalone",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
        ],
      },
    }),
  ],
})
```

---

## Docker Deployment

### Dockerfile

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm turbo build --filter=web

FROM base AS runner
WORKDIR /app

# Copy built app
COPY --from=builder /app/apps/web/dist ./dist
COPY --from=builder /app/apps/web/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Create data directory for SQLite
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/expenses.db
ENV SCREENSHOTS_PATH=/app/data/screenshots
ENV BACKUP_PATH=/app/data/backups

EXPOSE 3000

CMD ["node", "dist/server/index.js"]
```

### docker-compose.yml

```yaml
version: "3.8"

services:
  expense-tracker:
    build: .
    container_name: expense-tracker
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data          # SQLite + screenshots + backups
    environment:
      - NODE_ENV=production
      - OLLAMA_HOST=http://host.docker.internal:11434
      - BASE_CURRENCY=USD
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

**Note:** Ollama runs on the host machine (with GPU). The container connects via `host.docker.internal`.

---

## Differences from story-who

| Aspect | story-who | expense-tracker |
|--------|-----------|-----------------|
| **Hosting** | Cloudflare Workers | Self-hosted Docker |
| **Database** | Cloudflare D1 | Local SQLite |
| **File Storage** | R2 Bucket | Local filesystem |
| **AI** | External APIs | Local Ollama |
| **Auth** | None (public) | Tailscale network |
| **Background Jobs** | Cloudflare scheduled | Effect fiber on boot |
| **Cache** | KV namespace | Not needed (local) |

---

## Environment Variables

```bash
# Database
DATABASE_PATH=/app/data/expenses.db

# File storage
SCREENSHOTS_PATH=/app/data/screenshots
BACKUP_PATH=/app/data/backups

# Ollama
OLLAMA_HOST=http://localhost:11434
VISION_MODEL=qwen3-vl:8b
JSON_MODEL=gpt-oss

# App settings
BASE_CURRENCY=USD
```

---

## Development Setup

```bash
# Clone and install
pnpm install

# Generate database migrations
pnpm --filter data-ops db:generate

# Apply migrations
pnpm --filter data-ops db:migrate

# Start development server
pnpm dev

# Build for production
pnpm build

# Run with Docker
docker-compose up -d
```

---

## Testing Strategy

| Layer | Approach |
|-------|----------|
| **data-ops services** | Unit tests with mock DbClient |
| **tRPC router** | Integration tests with test database |
| **UI components** | Component tests with mock tRPC |
| **E2E** | Playwright tests against local instance |
| **AI extraction** | Eval suite from ollama-extraction-spike |

---

## Open Items

1. **Shortcut distribution** - Document step-by-step iOS Shortcut setup
2. **Currency API** - Choose free exchange rate API
3. **Backup format** - Define JSON export schema
4. **Error boundaries** - UI error handling patterns
5. **Logging** - Effect logging integration

---

*Document created: November 2025*
*Status: Ready for implementation*
