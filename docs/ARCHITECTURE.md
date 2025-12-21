# Architecture & Deployment Guide

This document covers the deployment architecture for this self-hosted application.

## Deployment Model: Self-Hosted

This app is designed to be self-hosted on personal servers (Unraid, Synology, TrueNAS, Proxmox, Raspberry Pi, VPS, etc.).

### Key Characteristics

| Aspect | How It Works |
|--------|--------------|
| **Who deploys** | End user pulls Docker image |
| **Updates** | User decides when to update |
| **Migrations** | Automatic on container start |
| **Data ownership** | User owns all data |
| **Network** | Private network via Tailscale |

### Comparison with SaaS

```
SaaS Model:                          Self-Hosted Model:
┌─────────────────┐                  ┌─────────────────┐
│ Your servers    │                  │ User's server   │
│ Your database   │                  │ User's database │
│ You control     │                  │ User controls   │
│ Multi-tenant    │                  │ Single-tenant   │
└─────────────────┘                  └─────────────────┘
        │                                    │
   Public Internet                      Tailscale VPN
        │                              (Private network)
        ▼                                    ▼
   All users                           Only user's devices
```

---

## Network Architecture: Tailscale

We use [Tailscale](https://tailscale.com) for secure access instead of exposing the app to the public internet.

### Why Tailscale?

| Traditional Setup | Tailscale Setup |
|-------------------|-----------------|
| Expose port to internet | No public exposure |
| Need reverse proxy | Optional (for HTTPS cert) |
| DDoS possible | Not reachable from internet |
| Need firewall rules | Tailscale handles it |
| Complex auth | Tailscale identity built-in |

### How It Works

```
┌──────────────────────────────────────────────────────────────┐
│                     Tailscale Network                         │
│                    (100.x.x.x addresses)                      │
│                                                               │
│   ┌─────────┐     ┌─────────┐     ┌─────────────────────┐    │
│   │ Phone   │     │ Laptop  │     │ Home Server         │    │
│   │ 100.1.1 │     │ 100.1.2 │     │ 100.1.3             │    │
│   └────┬────┘     └────┬────┘     │  ┌───────────────┐  │    │
│        │               │          │  │ Docker        │  │    │
│        │               │          │  │  ┌─────────┐  │  │    │
│        └───────────────┴──────────┼──│  │ App     │  │  │    │
│                                   │  │  │ :3000   │  │  │    │
│           All traffic encrypted   │  │  └─────────┘  │  │    │
│           via WireGuard           │  └───────────────┘  │    │
│                                   └─────────────────────┘    │
└──────────────────────────────────────────────────────────────┘

Internet: Cannot reach the app (not exposed)
```

### Security Implications

**What Tailscale provides:**
- ✅ Encrypted traffic (WireGuard)
- ✅ Device authentication (only your devices)
- ✅ No public IP exposure
- ✅ Works behind NAT/firewalls
- ✅ Identity (who is connecting)

**What you still need:**
- ✅ App-level authentication (better-auth) - for multi-user within household
- ✅ HTTPS (optional but recommended) - defense in depth
- ✅ Container security - in case of app vulnerability

### Tailscale Setup Options

#### Option 1: Tailscale on Host (Recommended)

```
Host Server
├── Tailscale (installed on host)
│   └── 100.x.x.x address
└── Docker
    └── App container
        └── Binds to host:3000

Access: http://100.x.x.x:3000 or http://hostname:3000
```

#### Option 2: Tailscale Sidecar Container

```yaml
# docker-compose.yml
services:
  tailscale:
    image: tailscale/tailscale
    hostname: myapp
    environment:
      - TS_AUTHKEY=${TS_AUTHKEY}
      - TS_STATE_DIR=/var/lib/tailscale
    volumes:
      - tailscale-state:/var/lib/tailscale
    cap_add:
      - NET_ADMIN
      - SYS_MODULE

  web:
    network_mode: service:tailscale
    # App now accessible via tailscale network
```

#### Option 3: Tailscale Serve (Built-in HTTPS)

```bash
# On the host with Tailscale installed
tailscale serve --bg 3000

# Now accessible at https://hostname.tailnet-name.ts.net
# Automatic HTTPS certificate from Tailscale
```

This is the simplest option for HTTPS!

---

## Docker Security

### Current Security Measures

```dockerfile
# What we implement
FROM node:22-slim                    # Minimal base image
RUN adduser --system --uid 1001 app  # Non-root user
USER app                             # Run as non-root
HEALTHCHECK ...                      # Health monitoring
```

### Security Layers Explained

#### 1. Non-Root User ✅ (Implemented)

```dockerfile
USER app  # UID 1001
```

**Why:** If the app is compromised, attacker has limited permissions.

**Without this:** Container compromise = root access = potential host escape.

#### 2. No Privilege Escalation (Recommended)

```yaml
# docker-compose.yml
services:
  web:
    security_opt:
      - no-new-privileges:true
```

**Why:** Prevents processes from gaining more privileges than they started with.

**Example attack prevented:** Malicious code can't use setuid binaries to become root.

#### 3. Drop Capabilities (Recommended)

```yaml
services:
  web:
    cap_drop:
      - ALL
```

**Why:** Linux capabilities are granular root powers. Drop all unnecessary ones.

**Capabilities we DON'T need:**
- `NET_RAW` - Raw packet crafting (network attacks)
- `SYS_ADMIN` - Mount filesystems (container escape)
- `SYS_PTRACE` - Debug other processes (steal secrets)

#### 4. Read-Only Filesystem (Optional)

```yaml
services:
  web:
    read_only: true
    tmpfs:
      - /tmp
    volumes:
      - app-data:/app/data  # Only writable location
```

**Why:** Attackers can't modify application code or install malware.

**Trade-off:** More complex, app must be designed for it.

#### 5. Resource Limits (Recommended)

```yaml
services:
  web:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '2'
```

**Why:** Prevents runaway processes from killing the host.

### Security Tiers

Choose based on your risk tolerance:

#### Tier 1: Basic (Current)
```yaml
services:
  web:
    user: "1001:1001"
    # Just non-root user
```

#### Tier 2: Recommended
```yaml
services:
  web:
    user: "1001:1001"
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
```

#### Tier 3: Hardened
```yaml
services:
  web:
    user: "1001:1001"
    read_only: true
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    tmpfs:
      - /tmp
    deploy:
      resources:
        limits:
          memory: 1G
```

---

## Update & Migration Strategy

### How Updates Work

```
┌─────────────────────────────────────────────────────────────┐
│                     User's Server                            │
│                                                              │
│  1. User sees: "New version v1.2.0 available"               │
│                                                              │
│  2. User backs up (optional but recommended):               │
│     docker run --rm -v app-data:/data alpine tar czf ...    │
│                                                              │
│  3. User pulls new image:                                   │
│     docker compose pull                                      │
│                                                              │
│  4. User restarts:                                          │
│     docker compose up -d                                     │
│                                                              │
│  5. Container starts:                                        │
│     ┌─────────────────────────────────────────────────┐     │
│     │ [Migrate] Checking database state...            │     │
│     │ [Migrate] Skipping: 0000_initial.sql            │     │
│     │ [Migrate] Skipping: 0001_auth.sql               │     │
│     │ [Migrate] Applying: 0002_new_feature.sql  ← NEW │     │
│     │ [Migrate] All migrations complete!              │     │
│     │ [App] Starting server v1.2.0...                 │     │
│     └─────────────────────────────────────────────────┘     │
│                                                              │
│  Data Volume: Preserved, only schema updated                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Migration Safety Rules

Since we can't access users' databases to fix issues, migrations MUST be:

| Rule | Example | Why |
|------|---------|-----|
| **Additive only** | `ADD COLUMN`, not `DROP COLUMN` | Never delete user data |
| **Idempotent** | `CREATE TABLE IF NOT EXISTS` | Safe to run twice |
| **Backward compatible** | New columns nullable or have defaults | Old data still works |
| **Tested** | Test v1.0→v1.2 upgrade path | Users skip versions |
| **Transactional** | Wrap in transaction | Partial migration = corruption |

### Version Skipping

Users don't update every release:

```
User's version: v1.0.0
Latest version: v1.5.0

On update, runs ALL migrations in order:
  v1.0.0 → v1.1.0 (migration 0002)
  v1.1.0 → v1.2.0 (migration 0003)
  v1.2.0 → v1.3.0 (migration 0004)
  v1.3.0 → v1.4.0 (migration 0005)
  v1.4.0 → v1.5.0 (migration 0006)
```

### Rollback Strategy

**Our approach: Backups, not down migrations**

Why no automatic rollback:
- Down migrations can fail too
- Adds complexity and more failure modes
- Data might be lost anyway (new columns have data)

Instead:
1. Document backup process clearly
2. Encourage backup before update
3. If update fails, restore from backup

---

## Release Process

### For Developers

```bash
# 1. Make changes
vim packages/data-ops/src/db/schema.ts

# 2. Test locally
pnpm --filter @repo/data-ops db:push
pnpm dev

# 3. Generate migration
pnpm --filter @repo/data-ops db:generate

# 4. Test upgrade path
./scripts/test-upgrade.sh  # v1.0 → v1.1 with sample data

# 5. Update changelog
vim CHANGELOG.md

# 6. Commit and tag
git add -A
git commit -m "feat: add new feature"
git tag v1.1.0
git push --tags

# 7. CI builds and pushes image
# ghcr.io/yourorg/yourapp:v1.1.0
# ghcr.io/yourorg/yourapp:latest
```

### For Users

```bash
# Check current version
docker compose logs web | grep "Starting server"

# Check for updates
docker compose pull

# Update
docker compose up -d

# Verify
docker compose logs web
curl http://localhost:3000/health
```

---

## CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract version
        id: version
        run: echo "VERSION=${GITHUB_REF#refs/tags/}" >> $GITHUB_OUTPUT

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ghcr.io/${{ github.repository }}:${{ steps.version.outputs.VERSION }}
            ghcr.io/${{ github.repository }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          generate_release_notes: true
```

---

## Summary

### What We're Building

- **Self-hosted app** - Users run on their own servers
- **Tailscale-first** - Private network, no public exposure
- **Auto-migrating** - Updates just work
- **Secure by default** - Non-root, minimal attack surface

### Security Model

```
Layer 1: Network     → Tailscale (not public internet)
Layer 2: Transport   → WireGuard encryption (via Tailscale)
Layer 3: Container   → Non-root, dropped capabilities
Layer 4: Application → better-auth for user management
Layer 5: Data        → SQLite in persistent volume
```

### Key Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build, non-root user |
| `docker-compose.yml` | Production configuration |
| `scripts/migrate.mjs` | Database migrations (Drizzle) |
| `docs/SETUP.md` | User setup guide |
| `docs/ARCHITECTURE.md` | This document |
| `CHANGELOG.md` | Version history |
