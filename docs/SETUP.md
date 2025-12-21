# Application Setup Guide

This guide covers setting up the application for local development and Docker deployment.

## Environment Variables

Create a `.env` file in `apps/web/`:

```bash
# Required
BETTER_AUTH_SECRET=your-secret-key-here  # Generate with: openssl rand -base64 32

# Optional (with defaults)
DATABASE_PATH=./data/app.db              # SQLite database location
BUCKET_STORAGE_PATH=./data/uploads       # File upload storage
BASE_FRONTEND_URL=http://localhost:3000  # Frontend URL for auth callbacks
NODE_ENV=development                     # development | production
```

### Generating a Secret

```bash
# macOS/Linux
openssl rand -base64 32

# Example output: K7gNq+3mVxZ8pR4sT9uW1yB5cD7fH2jM0nP6qS8vX=
```

---

## Understanding Database Migrations

### db:push vs db:migrate

| Command | What it does | When to use |
|---------|--------------|-------------|
| `db:push` | Compares schema to database, makes direct changes | Local dev, quick iteration |
| `db:migrate` | Runs versioned SQL migration files | Production, team collaboration |

### How Migrations Work in Production

Migrations are **incremental** - they never delete your data:

```
0000_old_valkyrie.sql  →  CREATE TABLE user (...)
0001_wild_tarot.sql    →  ALTER TABLE user ADD COLUMN role TEXT
0002_new_feature.sql   →  CREATE TABLE orders (...)
```

The system tracks which migrations have run:

```
┌─────────────────────────────┐
│  __drizzle_migrations       │
├─────────────────────────────┤
│  0000_old_valkyrie.sql  ✓   │
│  0001_wild_tarot.sql    ✓   │
│  0002_new_feature.sql   ←   │  (will run this one)
└─────────────────────────────┘
```

**Your data is preserved.** Only new migrations are applied.

---

## Local Development Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Create Environment File

```bash
cp apps/web/.env.example apps/web/.env

# Edit the .env file and set BETTER_AUTH_SECRET
```

### 3. Initialize Database

For quick local development, use db:push:

```bash
pnpm --filter @repo/data-ops db:push
```

This creates `apps/web/data/app.db` with all tables.

### 4. Start Development Server

```bash
pnpm dev
```

The app will be available at http://localhost:3000

---

## Database Workflow

### Local Development (Solo)

```bash
# Make schema changes in packages/data-ops/src/db/schema.ts

# Apply changes directly to local DB (fast iteration)
pnpm --filter @repo/data-ops db:push

# When ready, generate a migration file for others/production
pnpm --filter @repo/data-ops db:generate
```

### Team/Production Workflow

```bash
# 1. Make schema changes
vim packages/data-ops/src/db/schema.ts

# 2. Generate migration file
pnpm --filter @repo/data-ops db:generate
# Creates: packages/data-ops/src/db/migrations/0002_new_feature.sql

# 3. Commit migration file to git
git add packages/data-ops/src/db/migrations/
git commit -m "Add orders table migration"

# 4. Push - CI/CD runs migrations in production
git push
```

### All Database Commands

```bash
# Push schema changes directly (local dev only!)
pnpm --filter @repo/data-ops db:push

# Generate migration from schema diff
pnpm --filter @repo/data-ops db:generate

# Run pending migrations
pnpm --filter @repo/data-ops db:migrate

# Open Drizzle Studio (database GUI)
pnpm --filter @repo/data-ops db:studio

# Reset database (deletes all data - local dev only!)
pnpm --filter @repo/data-ops db:reset
```

---

## Docker Setup

### 1. Create Environment File

Create `.env` in the project root for Docker:

```bash
# Required
BETTER_AUTH_SECRET=your-production-secret-here

# Optional
BASE_FRONTEND_URL=https://your-domain.com
```

### 2. Build and Start

```bash
# Build the image
docker compose build

# Start the container
docker compose up -d
```

### 3. Database Migrations (Automatic)

The Docker container automatically runs pending migrations on every start:

**First run:**
```
[Migrate] Checking database state...
[Migrate] Applying: 0000_old_valkyrie.sql
[Migrate] Applying: 0001_wild_tarot.sql
[Migrate] All migrations complete!
[Entrypoint] Starting server...
```

**Subsequent restarts (migrations already applied):**
```
[Migrate] Checking database state...
[Migrate] Skipping (already applied): 0000_old_valkyrie.sql
[Migrate] Skipping (already applied): 0001_wild_tarot.sql
[Migrate] All migrations complete!
[Entrypoint] Starting server...
```

**After deploying new code with new migrations:**
```
[Migrate] Checking database state...
[Migrate] Skipping (already applied): 0000_old_valkyrie.sql
[Migrate] Skipping (already applied): 0001_wild_tarot.sql
[Migrate] Applying: 0002_new_feature.sql   ← New migration applied
[Migrate] All migrations complete!
[Entrypoint] Starting server...
```

### 4. Verify

```bash
# Check logs
docker compose logs -f web

# Test health endpoint
curl http://localhost:3000/health

# Should see: {"status":"ok","timestamp":"..."}
```

---

## Docker Commands

```bash
# Start
docker compose up -d

# Stop
docker compose down

# View logs
docker compose logs -f web

# Rebuild after code changes
docker compose build && docker compose up -d

# Run migrations only (for CI/CD)
docker compose run --rm web migrate

# Start without migrations (if you run them separately)
docker compose run --rm web start

# Reset (removes ALL data - development only!)
docker compose down -v
docker compose up -d
```

---

## CI/CD Pipeline Example

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Push to registry
        run: |
          docker tag myapp:${{ github.sha }} ghcr.io/${{ github.repository }}:latest
          docker push ghcr.io/${{ github.repository }}:latest

      - name: Deploy to server
        env:
          SSH_KEY: ${{ secrets.SSH_KEY }}
        run: |
          ssh deploy@your-server.com "
            cd /app
            docker compose pull
            docker compose up -d
          "
```

The container automatically runs any new migrations when it starts.

---

## Production Checklist

1. **Set strong BETTER_AUTH_SECRET**: Never use the default. Generate a new one.

2. **Set BASE_FRONTEND_URL**: Must match your production domain for auth callbacks.

3. **Backup data volume regularly**:
   ```bash
   # Backup
   docker run --rm -v tally_app-data:/data -v $(pwd):/backup alpine \
     tar czf /backup/backup-$(date +%Y%m%d).tar.gz -C /data .

   # Restore
   docker run --rm -v tally_app-data:/data -v $(pwd):/backup alpine \
     tar xzf /backup/backup-YYYYMMDD.tar.gz -C /data
   ```

4. **Use HTTPS**: Put a reverse proxy (nginx, Caddy, Traefik) in front for SSL/TLS.

5. **Monitor health**: The container has built-in health checks.

6. **Test migrations locally first**: Run migrations against a copy of production data.

---

## Troubleshooting

### Error: "no such table: user"

The database tables haven't been created:

```bash
# Local development
pnpm --filter @repo/data-ops db:push

# Docker - check logs for migration errors
docker compose logs web
```

### Error: "BETTER_AUTH_SECRET environment variable is required"

Set the environment variable:

```bash
# Local: add to apps/web/.env
BETTER_AUTH_SECRET=your-secret-here

# Docker: add to .env in project root
BETTER_AUTH_SECRET=your-secret-here
```

### Error: "SQLITE_BUSY" or database locked

Only one process can write to SQLite at a time. Make sure you don't have multiple instances running.

### Migration failed

If a migration fails:

1. Check the error in logs: `docker compose logs web`
2. Fix the migration SQL file
3. Rebuild and redeploy: `docker compose build && docker compose up -d`

For complex fixes, you may need to manually fix the database:
```bash
docker compose exec web sh
# Inside container:
sqlite3 /app/data/app.db
# Fix the issue, then mark migration as applied:
INSERT INTO __drizzle_migrations (name) VALUES ('0002_problematic.sql');
```

### Reset everything and start fresh (dev only!)

```bash
# Local
pnpm --filter @repo/data-ops db:reset

# Docker
docker compose down -v
docker compose up -d
```
