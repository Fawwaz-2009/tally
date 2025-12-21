# Expense Tracker - Product Specification

## Overview

A privacy-first, self-hosted expense tracker designed for individuals or couples who want visibility into their spending without relying on cloud services or bank integrations.

### Vision

Simple expense tracking with minimal friction. Capture expenses via screenshot, process locally with AI, analyze spending patterns - all within your own infrastructure.

### Key Principles

- **Privacy first** - All data stays on your network, no external cloud dependencies
- **Minimal friction** - Screenshot and share, fire and forget
- **Self-hosted** - Runs on your homelab, you own your data
- **Open source** - Deployable by anyone with a Tailscale network and Docker

---

## Users & Access Model

### Target Users

- Individuals tracking personal expenses
- Couples/households tracking personal and shared expenses
- Privacy-conscious users who want full control of their data

### Access Control

- **No traditional authentication** - Access controlled at network level via Tailscale
- If you're on the Tailscale network, you're authorized
- Each user's device must be added to the Tailscale network

### User Model

Users are entities that can own expenses. This includes:
- Individual people (e.g., "john", "sarah")
- Shared entities (e.g., "household", "vacation-fund", "kids")

All users are equal in the system - there's no distinction between "personal" and "shared" at the data model level.

```yaml
users:
  - id: "john"
    name: "John"
  - id: "sarah"
    name: "Sarah"
  - id: "household"
    name: "Household"
```

---

## Architecture

### High-Level Flow

```
iPhone Screenshot
       │
       ▼
iOS Shortcut (POST image + user ID)
       │
       ▼ (via Tailscale)
       │
Server (Docker)
       │
       ├─► Local AI (Ollama + Vision Model)
       │         │
       │         ▼
       │   Extract: amount, currency, merchant, date
       │         │
       │         ▼
       │   Enrich: category tags, normalized merchant
       │
       ▼
   Database
       │
       ▼
Web Dashboard (Tailscale access only)
```

### Components

| Component | Description |
|-----------|-------------|
| **iOS Shortcut** | Captures screenshot, sends to server with user ID |
| **API Server** | Receives images, orchestrates processing, serves dashboard |
| **Local AI** | Vision model for OCR/extraction (Ollama with LLaVA or similar) |
| **Database** | Stores expenses, tags, user data |
| **Dashboard** | Web UI for viewing and managing expenses |

### Infrastructure Requirements

- Any server running Docker (homelab, VPS, NAS, etc.)
- Tailscale account and network configured
- GPU recommended for local AI (improves extraction speed)
- iPhone with Shortcuts app (per user)

### No External Dependencies

- No cloud APIs for core functionality
- No WhatsApp/Meta
- No bank integrations
- Exchange rates fetched periodically (daily) - only external call

---

## Data Model

### Expense

```json
{
  "id": "uuid",
  "amount": 45.00,
  "currency": "EUR",
  "base_amount": 49.12,
  "base_currency": "USD",
  "date": "2025-11-28T14:30:00Z",
  "merchant": "starbucks",
  "categories": ["food", "coffee"],
  "user": "john",
  "screenshot_path": "/data/screenshots/uuid.png",
  "status": "success",
  "created_at": "2025-11-28T14:31:00Z"
}
```

### Expense Status

| Status | Meaning |
|--------|---------|
| `submitted` | Just received, queued for worker to pick up |
| `processing` | Worker is actively extracting data |
| `success` | Extraction complete, all data present |
| `needs-review` | Extraction failed or incomplete, needs manual input |

```
submitted → processing → success
                       → needs-review
```

### Typed Tags

Tags are organized by type/dimension:

| Type | Purpose | Examples |
|------|---------|----------|
| **Category** | What kind of spending | groceries, eating-out, transport, entertainment |
| **Merchant** | Where the money went | starbucks, amazon, costco |
| **User** | Whose expense | john, sarah, household |

### Tag Generation

- **Merchant**: Extracted from screenshot, normalized by AI (e.g., "STARBUCKS #12345" → "starbucks")
- **Category**: Inferred by AI based on merchant
- **User**: From sender ID (Shortcut config) or caption override

### Multi-Currency Support

- Each expense stores original amount and currency
- Base currency configured during setup
- Conversion to base currency at ingestion time
- Exchange rates fetched periodically (daily)

---

## User Journeys

### 1. Setup & First Launch

**Pre-platform (outside the app):**
1. User has Docker environment (Unraid or similar)
2. User has Tailscale configured
3. User pulls and starts Docker container
4. User accesses dashboard via Tailscale hostname

**First launch (in the app):**
1. Welcome screen
2. Enter name (creates first user)
3. Select base currency
4. Shortcut setup instructions displayed:
   - API endpoint (derived from current URL + `/api/trpc/expenses.uploadFromFormData`)
   - User ID
   - Step-by-step guide to create iOS Shortcut
5. Prompt to add first expense
6. Success confetti on first expense added
7. User sees their expense in the dashboard

### 2. Expense Ingestion (Day-to-Day)

**Personal expense:**
1. Make payment on phone (NFC)
2. Take screenshot of confirmation
3. Share screenshot → select Shortcut
4. Done (fire and forget)

**Shared/attributed expense:**
1. Same as above, but add caption before sharing
2. Caption = user ID to attribute to (e.g., "household")
3. Server parses caption and overrides default attribution

**Behavior:**
- Silent success - no confirmation, no waiting
- Network error → Shortcut shows error (user retries later)
- Expense created with status: `submitted`
- Worker picks up, moves to `processing`, then `success` or `needs-review`
- Extraction issues → status: `needs-review`, shown in dashboard for manual input

### 3. Viewing & Analysis

**Default view:**
- Dashboard shows current month summary
- Total spending, breakdown by user

**Three dimensions for analysis:**

| View | Question Answered |
|------|-------------------|
| **Category** | How much on groceries vs eating-out? |
| **User** | My spending vs partner vs household? |
| **Merchant** | Which places get most of our money? |

**Filtering:**
- Date range selection
- Filter by user
- Filter by category
- Filter by merchant

### 4. Corrections & Management

**Expenses needing review:**
1. Banner on dashboard: "X expenses need review"
2. Tap → dedicated resolution page
3. View original screenshot + partial extraction
4. Fill in missing/incorrect fields
5. Save → expense status changes to `success`

**Editing expenses:**
- Tap any expense to edit
- Change amount, merchant, category, user
- Save changes

**Tag management:**
- View all tags by type (Settings → Tags)
- Rename tags globally
- Remove tag from individual expense
- See usage count per tag

**Deferred (not in v1):**
- Bulk tag deletion
- Complex tag merging

### 5. Adding a New User

**Outside the app:**
1. Add new device to Tailscale network

**In the app:**
2. Settings → Users → Add User
3. Enter name/ID
4. Shortcut setup instructions displayed (reused from onboarding)
5. New user sets up Shortcut on their device
6. Done - can submit expenses and access dashboard

### 6. Export & Backup

**Manual export:**
1. Settings → Export
2. Choose format (CSV or JSON)
3. Choose scope (date range, users)
4. Download file

**Automated backup:**
- App writes JSON backup to configured server path
- Schedule: daily or weekly
- Unraid users point to backed-up share

**What's exported:**
- Expense data only (no screenshots)
- All fields: amount, currency, date, tags

**Not in v1:**
- Restore functionality (manual process if needed)
- Screenshot export

---

## v1 Scope

### In Scope

| Feature | Details |
|---------|---------|
| Expense ingestion via iOS Shortcut | Screenshot → Share → Done |
| Local AI extraction | Amount, currency, merchant, date |
| Typed tags | Categories, merchants, users |
| Multi-currency | Store original, convert to base currency |
| Dashboard | View, filter, analyze expenses |
| Three analysis dimensions | By category, by user, by merchant |
| Review queue handling | Banner + resolution page for `needs-review` status |
| Expense editing | Edit any field on any expense |
| Tag management | View, rename tags; remove from individual expense |
| User management | Add/edit users |
| Manual export | CSV and JSON |
| Automated backup | Scheduled JSON to server path |
| Tailscale-only access | No authentication layer needed |
| Docker deployment | Single container or compose |

### Deferred (Post-v1)

| Feature | Reason |
|---------|--------|
| Android support | iOS Shortcuts first, Tasker/Automate later |
| Bulk tag operations | See usage patterns first |
| Custom AI instructions | Let users adjust extraction behavior |
| Restore functionality | Manual process acceptable for v1 |
| Screenshot export | Keeps export size manageable |
| Budget/alerts | Core tracking first, planning features later |
| Trends over time | Basic views first, advanced analytics later |

---

## Open Questions

1. **AI model selection** - Which vision model works best for payment screenshots? (LLaVA, other options)
2. **Screenshot format variety** - How well does generic extraction handle different payment apps?
3. **Shortcut reliability** - Any iOS limitations on Shortcut → local server communication?

---

## Technical Decisions (To Be Made)

These will be addressed in the engineering phase:

- Tech stack (backend framework, frontend framework, database)
- API design
- Docker image structure
- AI integration specifics
- Database schema details

---

*Document created: November 2025*
*Status: Ready for engineering phase*
