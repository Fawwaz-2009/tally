# @mooz/data-ops

A functional data operations package for the mooz-automated-marketer application. This package provides a unified data layer with domain logic, database operations, and type-safe data models using functional programming patterns with Effect.

## Features

- **Functional Database Layer**: Pure functional database operations using Effect
- **Domain-Driven Design**: Organized domain logic with repositories and use cases
- **Type Safety**: Full TypeScript support with runtime validation
- **Cloudflare Compatible**: Designed for Cloudflare Workers environment
- **Effect-based**: Leverages Effect for composable, testable operations
- **Multi-Environment**: Support for staging and production environments

## Architecture

- `database/`: Database schema, migrations, and connection management
- `domain/`: Domain logic organized by business entities
- `types/`: Shared type definitions and error hierarchy
- `services/`: Service layer with Effect contexts

## Usage

### Database Initialization

```typescript
import { createDataOpsRuntime, runWithCloudflareBindings } from '@mooz/data-ops';
import { Effect } from 'effect';

// In your Cloudflare Worker
export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const program = Effect.gen(function* () {
      // Your domain operations here
      const assets = yield* DataOps.adaptableAssets.repository.getClientAssets(clientId);
      return Response.json({ assets });
    });
    
    return runWithCloudflareBindings(env, program);
  }
};
```

### Domain Operations

```typescript
import { DataOps } from '@mooz/data-ops';
import { Effect } from 'effect';

// Use domain operations
const createAssetProgram = DataOps.adaptableAssets.programs.createAsset({
  clientId: 'client-123',
  file: uploadedFile,
  description: 'Product image',
  tags: ['product', 'hero']
});

// Run with proper error handling
const result = yield* createAssetProgram.pipe(
  Effect.catchAll((error) => 
    Effect.sync(() => console.error('Asset creation failed:', error))
  )
);
```

## Database Migrations

```bash
# Generate migrations
pnpm db:generate

# Run migrations on staging
pnpm db:migrate:staging

# Run migrations on production  
pnpm db:migrate:production

# Open Drizzle Studio
pnpm db:studio:staging
```