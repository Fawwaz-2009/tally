# syntax=docker/dockerfile:1

# ============================================================================
# Stage 1: Base image with pnpm
# ============================================================================
FROM node:22-slim AS base

# Install pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# ============================================================================
# Stage 2: Install dependencies and build
# ============================================================================
FROM base AS builder

# Install build dependencies for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/data-ops/package.json ./packages/data-ops/
COPY packages/isomorphic/package.json ./packages/isomorphic/
COPY packages/cli/package.json ./packages/cli/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/ui/package.json ./packages/ui/

# Install all dependencies (including devDependencies for build)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build packages in dependency order: isomorphic -> data-ops -> web
# Set NODE_ENV=production for correct JSX runtime and optimizations
# Increase Node.js heap size for Vite/Rollup build
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN pnpm --filter @repo/isomorphic build && pnpm --filter @repo/data-ops build && pnpm --filter web build


# ============================================================================
# Stage 3: Production image
# ============================================================================
FROM node:22-slim AS runner

WORKDIR /app

# Install build dependencies for native modules (better-sqlite3, tesseract.js)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 app

# Create data directory for SQLite and uploads
RUN mkdir -p /app/data && chown -R app:nodejs /app/data

# Copy the built application from builder
COPY --from=builder --chown=app:nodejs /app/apps/web/.output /app/.output

# Install externalized packages directly (pnpm symlinks don't survive Docker COPY)
# These are marked as external in vite.config.ts and need to be in node_modules at runtime
RUN npm install --no-save better-sqlite3 tesseract.js drizzle-orm

# Copy database migrations (includes meta/_journal.json for Drizzle)
COPY --from=builder --chown=app:nodejs /app/packages/data-ops/src/db/migrations /app/migrations

# Copy migration script
COPY --chown=app:nodejs scripts/migrate.mjs /app/migrate.mjs

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DATABASE_PATH=/app/data/app.db
ENV BUCKET_STORAGE_PATH=/app/data/uploads
# NODE_PATH allows externalized packages (tesseract.js, better-sqlite3) to be found
# when the server runs from .output/server/
ENV NODE_PATH=/app/node_modules

# Expose port
EXPOSE 3000

# Switch to non-root user
USER app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Run migrations then start server
CMD ["sh", "-c", "node /app/migrate.mjs && node .output/server/index.mjs"]
