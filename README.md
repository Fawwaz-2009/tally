# Orange Starter (tally)

A modern, full-stack TypeScript starter template for building applications with Cloudflare Workers, D1 (SQLite), R2 (Object Storage), and React.

## 🚀 Quick Start

### Creating a New Project

You can use this starter in two ways:

**Interactive Mode** (Recommended):

```bash
npx @template/cli
```

**Non-Interactive Mode**:

```bash
npx @template/cli my-project --database-name my-db --bucket-name my-bucket
```

### Setup Steps

After creating your project, follow these steps:

1. **Navigate to your project**:

   ```bash
   cd my-project
   ```

2. **Install dependencies**:

   ```bash
   pnpm install
   ```

3. **Configure environment variables**:
   - Review `.env.example` and create your `.env` file with the required values

4. **Set up Cloudflare Resources**:

   a. Create your D1 database:

   ```bash
   wrangler d1 create your-database-name
   ```

   b. **Important**: Copy the `database_id` from the output and update it in:
   - `apps/web/wrangler.jsonc`
   - `packages/data-ops/wrangler.jsonc`

   Look for: `"database_id": "REPLACE_WITH_YOUR_D1_DATABASE_ID"`

   c. Create your R2 bucket:

   ```bash
   wrangler r2 bucket create your-bucket-name
   ```

5. **Build the data-ops package**:

   ```bash
   pnpm --filter=@repo/data-ops build
   ```

6. **Run database migrations**:

   ```bash
   pnpm --filter=@repo/data-ops db:migrate:local
   ```

7. **Start the development server**:
   ```bash
   pnpm dev
   ```

Your app will be running at `http://localhost:3000`!

## 📦 What's Inside

### Monorepo Structure

```
orange-starter/
├── apps/
│   └── web/                    # Main web application (Cloudflare Worker + React)
├── packages/
│   ├── cli/                    # Project scaffolding CLI
│   ├── data-ops/               # Database schemas, migrations, and domain logic
│   ├── ui/                     # Shared UI components
│   ├── eslint-config/          # Shared ESLint configurations
│   └── typescript-config/      # Shared TypeScript configurations
```

### Tech Stack

- **Runtime**: [Cloudflare Workers](https://workers.cloudflare.com/)
- **Database**: [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite at the edge)
- **Storage**: [Cloudflare R2](https://developers.cloudflare.com/r2/) (S3-compatible object storage)
- **Frontend**: [React](https://react.dev/) + [TanStack Router](https://tanstack.com/router)
- **API**: [tRPC](https://trpc.io/) for type-safe APIs
- **Auth**: [Better Auth](https://www.better-auth.com/)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Build Tool**: [Vite](https://vite.dev/)
- **Package Manager**: [pnpm](https://pnpm.io/)
- **Monorepo**: [Turborepo](https://turbo.build/)

## 🛠️ Development

### Running Locally

The local development environment uses Cloudflare's local simulator:

- D1 database runs locally using SQLite
- R2 storage is simulated
- Worker runs in a local dev server

```bash
pnpm dev
```

### Database Migrations

**Generate a new migration**:

```bash
cd packages/data-ops
pnpm db:generate
```

**Apply migrations locally**:

```bash
pnpm --filter=@repo/data-ops db:migrate:local
```

**Apply migrations to production**:

```bash
pnpm --filter=@repo/data-ops db:migrate:production
```

**View local database in Drizzle Studio**:

```bash
pnpm --filter=@repo/data-ops db:studio:local
```

### Building for Production

```bash
pnpm build
```

## 📝 Configuration Files

### Wrangler Configuration

Each wrangler configuration file (`wrangler.jsonc`) defines:

- **Worker name**: Auto-generated based on your project name
  - Web app: `{project-name}-web`
  - Data ops: `{project-name}-data-ops`
- **D1 Database**: Connection details and migration directory
- **R2 Bucket**: Bucket binding for object storage
- **Environment variables**: Public runtime variables

**Important Notes**:

- The `packages/data-ops/wrangler.jsonc` is only used for running migrations
- It does not deploy a worker - it's purely for database management
- Always update the `database_id` after creating your D1 database

### Environment Variables

Create a `.env` file based on `.env.example`:

Key variables:

- `VITE_APP_TITLE`: Your application title
- `VITE_BASE_FRONTEND_URL`: Your frontend URL
- `BETTER_AUTH_SECRET`: Secret for authentication (generate securely)

## 🚢 Deployment

### Prerequisites

1. Install Wrangler CLI:

   ```bash
   npm install -g wrangler
   ```

2. Authenticate with Cloudflare:

   ```bash
   wrangler login
   ```

3. Ensure you've created your D1 database and R2 bucket (see Setup Steps above)

### Deploy

```bash
cd apps/web
wrangler deploy
```

The deployment will:

- Bundle your application
- Deploy to Cloudflare's global network
- Connect to your D1 database and R2 bucket

## 🔐 Secrets Management

Never commit secrets to version control. Use Cloudflare's secret management:

```bash
# Set a secret for production
wrangler secret put BETTER_AUTH_SECRET

# Set a secret for a specific environment
wrangler secret put BETTER_AUTH_SECRET --env staging
```

## 🏗️ Project Architecture

### Data-Ops Package

The `packages/data-ops` package contains:

- **Database schema** (`src/db/schema.ts`): Drizzle ORM table definitions
- **Migrations** (`src/db/migrations/`): SQL migration files
- **Domain logic** (`src/domain/`): Business logic organized by feature
- **Runtimes** (`src/runtimes/`): Effect-based runtime configurations

This package is built and imported by the web app for type-safe database access.

### Web App

The `apps/web` directory contains:

- **Frontend** (`src/`): React components and routes
- **Worker** (`worker/`): Cloudflare Worker entry point and API
- **Public assets** (`public/`): Static files

## 📚 Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [TanStack Router Docs](https://tanstack.com/router/latest)
- [tRPC Documentation](https://trpc.io/docs)
- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 📄 License

MIT License - see LICENSE file for details.
