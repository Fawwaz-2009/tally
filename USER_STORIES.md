# Expense Tracker - User Stories & Implementation Roadmap

## Overview

This document breaks down the product into vertical user stories. Each story delivers end-to-end value - API, UI, and any background processing together.

**Guiding Principles:**
- Each story is a usable increment
- No "API-only" or "UI-only" stories
- Dependencies are explicit
- Earlier stories unlock later ones

---

## Story Map

```
Phase 1: Core Loop (MVP)
├── Story 1: First Launch & Setup
├── Story 2: Submit Expense via API
├── Story 3: View Expenses List
└── Story 4: Process Expense (Worker + AI)

Phase 2: Corrections & Multi-User
├── Story 5: View & Fix Failed Extractions
├── Story 6: Edit Expense
├── Story 7: Add Additional User
└── Story 8: Attribute Expense to Different User

Phase 3: Analysis & Filtering
├── Story 9: Filter by Date Range
├── Story 10: Filter by User
├── Story 11: Filter by Category/Merchant
└── Story 12: Dashboard Summary Stats

Phase 4: Maintenance & Polish
├── Story 13: Manual Export (CSV/JSON)
├── Story 14: Automated Backup
├── Story 15: Currency Conversion
└── Story 16: Tag Management
```

---

## Phase 1: Core Loop (MVP)

The minimum to have a working expense tracker.

---

### Story 1: First Launch & Setup

**As a** new user
**I want to** set up the app on first launch
**So that** I can start tracking expenses

**Acceptance Criteria:**
- [ ] Welcome screen displayed on first visit (no users in DB)
- [ ] Form to enter name (creates first user)
- [ ] Form to select base currency (dropdown of common currencies)
- [ ] Settings saved to database
- [ ] After setup, redirected to dashboard
- [ ] Shortcut setup instructions displayed with:
  - API endpoint URL (derived from current host)
  - User ID
  - Step-by-step instructions to create iOS Shortcut

**Scope:**
- IN: Welcome flow, user creation, currency setting, shortcut instructions
- OUT: Actual shortcut file generation, multiple currency selection

**Technical Notes:**
- `users` table: insert first user
- `settings` table: `base_currency` key
- tRPC: `users.create`, `settings.update`
- Route: `/` checks if setup complete, redirects to `/setup` if not

**Vertical Slice:**
- data-ops: UserRepo.create, SettingsRepo.get/set
- tRPC: users.create, settings.get, settings.update
- UI: /setup route with form, redirect logic in root

---

### Story 2: Submit Expense via API

**As a** user
**I want to** submit an expense screenshot from my phone
**So that** it's captured for processing

**Acceptance Criteria:**
- [x] POST `/api/trpc/expenses.uploadFromFormData` accepts multipart form data
- [x] Request includes: image file, userId, optional caption
- [x] Screenshot saved to filesystem
- [x] Expense record created with status: `submitted`
- [x] Returns 200 with expense ID
- [x] Works when called from iOS Shortcut

**Scope:**
- IN: tRPC FormData endpoint (native FormData via zod-form-data), file saving, expense creation
- OUT: AI processing (separate story)

**Technical Notes:**
- Endpoint: `POST /api/trpc/expenses.uploadFromFormData` (native tRPC FormData)
- Uses `zod-form-data` for FormData validation
- Save image to `BUCKET_STORAGE_PATH/expenses/{id}.{ext}`
- ExpenseRepo.create with status: `submitted`

**Vertical Slice:**
- data-ops: ExpenseRepo.create
- Server: tRPC procedure with FormData input
- No UI (API-only, but tested with actual Shortcut)

**Testing:**
- Manual test with iOS Shortcut
- cURL test for CI

---

### Story 3: View Expenses List

**As a** user
**I want to** see a list of my expenses
**So that** I can verify they're being tracked

**Acceptance Criteria:**
- [ ] Dashboard shows list of all expenses
- [ ] Each expense shows: amount, currency, merchant, date, status
- [ ] `submitted`/`processing` expenses show "Processing..." indicator
- [ ] `needs-review` expenses show "Needs review" indicator
- [ ] List ordered by date (newest first)
- [ ] Empty state when no expenses

**Scope:**
- IN: Basic list view, status indicators
- OUT: Filtering, pagination, summary stats

**Technical Notes:**
- tRPC: `expenses.list` query
- TanStack Query for data fetching
- Basic card/list component for each expense

**Vertical Slice:**
- data-ops: ExpenseRepo.getAll
- tRPC: expenses.list
- UI: Dashboard route with expense list component

---

### Story 4: Process Expense (Worker + AI)

**As a** user
**I want** my submitted expenses to be automatically processed
**So that** amounts and merchants are extracted without manual entry

**Acceptance Criteria:**
- [ ] Background worker starts on app boot
- [ ] Worker picks up expenses with status: `submitted`
- [ ] Marks expense as `processing` while working
- [ ] Calls Ollama to extract: amount, currency, merchant, categories
- [ ] On success: updates expense with extracted data, status: `success`
- [ ] On failure: updates expense with error, status: `needs-review`
- [ ] UI reflects updated status on next refresh/load

**Scope:**
- IN: Worker loop, Ollama integration, status updates
- OUT: Real-time UI updates (polling/refresh is fine for now)

**Technical Notes:**
- ExpenseWorker.runForever started on server boot
- ExtractionService with two-stage Ollama calls (from spike)
- Prompts from ollama-extraction-spike findings

**Vertical Slice:**
- data-ops: ExpenseWorker, ExtractionService, OllamaClient
- Server: Worker startup in server entry
- UI: Status indicators already in Story 3, now they update

**Dependencies:**
- Story 2 (expenses exist to process)
- Story 3 (UI to see results)

---

## Phase 2: Corrections & Multi-User

Handle extraction errors and add partner.

---

### Story 5: View & Fix Expenses Needing Review

**As a** user
**I want to** see and fix expenses that need review
**So that** all my expenses are properly tracked

**Acceptance Criteria:**
- [ ] Banner on dashboard: "X expenses need review" (if any with `needs-review` status)
- [ ] Clicking banner navigates to review page
- [ ] Review page shows list of expenses with status: `needs-review`
- [ ] Each shows: original screenshot, partial extracted data, error message
- [ ] Form to manually enter: amount, currency, merchant, categories
- [ ] Submit updates expense, changes status to `success`
- [ ] Banner disappears when no expenses have `needs-review` status

**Scope:**
- IN: Review expense view, manual entry form, screenshot display
- OUT: Bulk operations, retry extraction

**Technical Notes:**
- tRPC: `expenses.list({ status: "needs-review" })`, `expenses.update`
- Screenshot served from `/api/screenshots/{id}`
- Form with validation (amount required, etc.)

**Vertical Slice:**
- data-ops: ExpenseRepo.getByStatus, ExpenseRepo.update
- tRPC: expenses.list (with filter), expenses.update, expenses.needsReviewCount
- Server: Screenshot serving endpoint
- UI: Banner component, /review route, manual entry form

---

### Story 6: Edit Expense

**As a** user
**I want to** edit any expense
**So that** I can correct extraction mistakes

**Acceptance Criteria:**
- [ ] Click expense in list → opens detail/edit view
- [ ] Shows all fields: amount, currency, merchant, categories, user
- [ ] Shows original screenshot
- [ ] All fields are editable
- [ ] Save button updates expense
- [ ] Cancel returns to list without saving
- [ ] Delete button removes expense (with confirmation)

**Scope:**
- IN: Edit form, delete, view screenshot
- OUT: Edit history/audit trail

**Technical Notes:**
- Route: `/expenses/{id}`
- tRPC: `expenses.get`, `expenses.update`, `expenses.delete`

**Vertical Slice:**
- data-ops: ExpenseRepo.getById, update, delete
- tRPC: expenses.get, update, delete
- UI: /expenses/$id route, edit form, delete confirmation modal

---

### Story 7: Add Additional User

**As a** user
**I want to** add my partner as a user
**So that** we can both track expenses

**Acceptance Criteria:**
- [ ] Settings → Users shows list of current users
- [ ] "Add User" button opens form
- [ ] Enter name/ID for new user
- [ ] After creation, shows Shortcut setup instructions for new user
- [ ] New user can submit expenses with their ID
- [ ] Expenses attributed correctly to each user

**Scope:**
- IN: User list, add user form, shortcut instructions
- OUT: User deletion (keep simple - can add later)

**Technical Notes:**
- tRPC: `users.list`, `users.create`
- Reuse shortcut instructions component from setup

**Vertical Slice:**
- data-ops: UserRepo.list, create
- tRPC: users.list, users.create
- UI: /settings/users route, add user modal

---

### Story 8: Attribute Expense to Different User

**As a** user
**I want to** attribute an expense to a different user or "household"
**So that** shared expenses are tracked correctly

**Acceptance Criteria:**
- [ ] When submitting via Shortcut, caption overrides user attribution
- [ ] Example: John submits with caption "household" → attributed to "household"
- [ ] User dropdown in edit form allows changing attribution
- [ ] Works with any user ID defined in the system

**Scope:**
- IN: Caption parsing in API, user dropdown in edit form
- OUT: Creating new user on-the-fly from caption

**Technical Notes:**
- API already accepts caption, just need to use it for attribution
- Validate user exists, or fallback to sender

**Vertical Slice:**
- data-ops: ExpenseRepo.create (use caption if valid user)
- Server: Caption parsing logic in API endpoint
- UI: User dropdown in expense edit form (from Story 6)

**Dependencies:**
- Story 7 (multiple users exist)

---

## Phase 3: Analysis & Filtering

Make sense of spending patterns.

---

### Story 9: Filter by Date Range

**As a** user
**I want to** filter expenses by date range
**So that** I can see spending for a specific period

**Acceptance Criteria:**
- [ ] Date range picker on dashboard (from/to)
- [ ] Quick presets: This month, Last month, This year, All time
- [ ] List updates to show only expenses in range
- [ ] Summary updates to reflect filtered data
- [ ] URL reflects filter state (shareable/bookmarkable)

**Scope:**
- IN: Date picker, presets, filtered list
- OUT: Custom saved filters

**Technical Notes:**
- tRPC: `expenses.list` already accepts from/to
- Use URL search params for filter state
- TanStack Query with filter keys

**Vertical Slice:**
- data-ops: ExpenseRepo.getFiltered (add date range)
- tRPC: expenses.list (already has from/to)
- UI: Date picker component, filter state in URL

---

### Story 10: Filter by User

**As a** user
**I want to** filter expenses by user
**So that** I can see spending per person or shared expenses

**Acceptance Criteria:**
- [ ] User filter dropdown on dashboard
- [ ] Options: All users, or specific user (John, Sarah, Household, etc.)
- [ ] List and summary update to show only selected user's expenses
- [ ] Combines with date range filter

**Scope:**
- IN: User filter dropdown, combined filtering
- OUT: Multi-select users

**Technical Notes:**
- tRPC: `expenses.list` accepts userId filter
- Combine with date range in query params

**Vertical Slice:**
- data-ops: ExpenseRepo.getFiltered (already has userId)
- tRPC: expenses.list (already has userId)
- UI: User dropdown, combined filter state

---

### Story 11: Filter by Category/Merchant

**As a** user
**I want to** filter expenses by category or merchant
**So that** I can see spending on specific things or places

**Acceptance Criteria:**
- [ ] Category filter dropdown (multi-select)
- [ ] Merchant filter dropdown (multi-select or search)
- [ ] List updates to show matching expenses
- [ ] Combines with date and user filters
- [ ] Shows count of expenses matching filter

**Scope:**
- IN: Category filter, merchant filter, combined filtering
- OUT: Creating new categories on-the-fly

**Technical Notes:**
- tRPC: Add `categories` and `merchant` filters to expenses.list
- UI: Multi-select dropdown or combobox

**Vertical Slice:**
- data-ops: ExpenseRepo.getFiltered (add category/merchant)
- tRPC: expenses.list (add filters)
- UI: Filter dropdowns, combined filter state

---

### Story 12: Dashboard Summary Stats

**As a** user
**I want to** see summary statistics on the dashboard
**So that** I can quickly understand my spending

**Acceptance Criteria:**
- [ ] Total spending for current filter
- [ ] Breakdown by user (pie chart or bars)
- [ ] Breakdown by category (pie chart or bars)
- [ ] Top merchants list
- [ ] Stats update when filters change

**Scope:**
- IN: Totals, breakdowns by dimension, basic visualization
- OUT: Trends over time, comparisons to previous period

**Technical Notes:**
- Could compute client-side from expense list, or add summary endpoint
- Consider aggregation query for efficiency

**Vertical Slice:**
- data-ops: ExpenseRepo.getSummary or compute in tRPC
- tRPC: expenses.summary (optional) or use existing list
- UI: Summary cards, simple charts (recharts or similar)

---

## Phase 4: Maintenance & Polish

Keep data safe and organized.

---

### Story 13: Manual Export (CSV/JSON)

**As a** user
**I want to** export my expenses
**So that** I can use the data elsewhere or for taxes

**Acceptance Criteria:**
- [ ] Settings → Export page
- [ ] Choose format: CSV or JSON
- [ ] Choose scope: All time, or date range
- [ ] Choose users: All or specific
- [ ] Download button generates and downloads file
- [ ] File includes all expense fields (except screenshot)

**Scope:**
- IN: Format selection, scope filters, file download
- OUT: Screenshot export, scheduled export

**Technical Notes:**
- tRPC mutation that generates file and returns URL or blob
- Or server endpoint that streams the file

**Vertical Slice:**
- data-ops: ExportService.generateCSV, generateJSON
- tRPC: settings.export mutation
- UI: /settings/export route, form, download button

---

### Story 14: Automated Backup

**As a** user
**I want** automatic backups of my data
**So that** I don't lose my expense history

**Acceptance Criteria:**
- [ ] Settings → Backup shows backup configuration
- [ ] Configure schedule: daily, weekly, or disabled
- [ ] Backup writes JSON to configured server path
- [ ] Shows last backup time and status
- [ ] Manual "Backup Now" button

**Scope:**
- IN: Schedule config, manual backup, status display
- OUT: Restore from backup (manual process for v1)

**Technical Notes:**
- ScheduledTasks.runBackup with Effect.repeat + Schedule.cron
- Store backup config in settings table
- Write to BACKUP_PATH

**Vertical Slice:**
- data-ops: ScheduledTasks.runBackup, BackupService
- tRPC: settings.updateBackupSchedule, settings.triggerBackup
- UI: /settings/backup route, schedule form, status display

---

### Story 15: Currency Conversion

**As a** user
**I want** expenses in different currencies converted to my base currency
**So that** I can see accurate totals

**Acceptance Criteria:**
- [ ] Expenses store original amount + currency AND base amount
- [ ] Conversion happens during extraction (or on save)
- [ ] Exchange rates fetched daily (background task)
- [ ] Dashboard totals use base currency amounts
- [ ] Expense detail shows both original and converted amounts

**Scope:**
- IN: Rate fetching, conversion at ingestion, dual display
- OUT: Historical rate accuracy, user-configurable rates

**Technical Notes:**
- Free API: exchangerate-api.com or similar
- Store rates in settings table as JSON
- ScheduledTasks.fetchExchangeRates

**Vertical Slice:**
- data-ops: CurrencyService, ScheduledTasks.fetchRates
- tRPC: (rates fetched in background, no explicit endpoint needed)
- UI: Expense detail shows both amounts

---

### Story 16: Tag Management

**As a** user
**I want to** manage tags (categories and merchants)
**So that** I can keep them organized and fix duplicates

**Acceptance Criteria:**
- [ ] Settings → Tags shows all tags grouped by type
- [ ] Each tag shows: name, usage count
- [ ] Rename tag → updates all expenses with that tag
- [ ] Cannot delete tag directly (remove from individual expenses)
- [ ] Search/filter tags by name

**Scope:**
- IN: View tags, rename, usage count
- OUT: Bulk merge, bulk delete

**Technical Notes:**
- tRPC: `tags.list`, `tags.rename`
- Rename updates tag value in all expense records

**Vertical Slice:**
- data-ops: TagRepo.list, rename
- tRPC: tags.list, tags.rename
- UI: /settings/tags route, tag list, rename modal

---

## Story Dependencies Graph

```
Story 1 (Setup)
    │
    ▼
Story 2 (Submit API) ──────────────────────┐
    │                                       │
    ▼                                       ▼
Story 3 (View List) ◄───────────── Story 4 (Worker + AI)
    │
    ├──► Story 5 (Fix Failed)
    │
    ├──► Story 6 (Edit Expense)
    │        │
    │        ▼
    │    Story 8 (Attribution) ◄── Story 7 (Add User)
    │
    ├──► Story 9 (Date Filter)
    │        │
    │        ▼
    │    Story 10 (User Filter)
    │        │
    │        ▼
    │    Story 11 (Category Filter)
    │        │
    │        ▼
    │    Story 12 (Summary Stats)
    │
    ├──► Story 13 (Export)
    │
    ├──► Story 14 (Backup)
    │
    ├──► Story 15 (Currency)
    │
    └──► Story 16 (Tag Management)
```

---

## MVP Definition

**MVP = Stories 1-4**

After completing Phase 1, you have:
- Working setup flow
- Expense submission from iOS Shortcut
- AI extraction processing
- Basic list view of expenses

This is a **usable expense tracker**. Everything after is improvement.

---

## Estimation Notes

These are rough t-shirt sizes, not time estimates:

| Story | Size | Notes |
|-------|------|-------|
| 1. Setup | M | Form + DB + redirect logic |
| 2. Submit API | S | Simple REST endpoint |
| 3. View List | S | Basic list component |
| 4. Worker + AI | L | Most complex, integrates Ollama |
| 5. Fix Failed | M | Form + screenshot display |
| 6. Edit Expense | M | CRUD form |
| 7. Add User | S | Similar to setup |
| 8. Attribution | S | Mostly wiring |
| 9. Date Filter | S | Date picker + query param |
| 10. User Filter | S | Dropdown + query param |
| 11. Category Filter | M | Multi-select, more complex |
| 12. Summary Stats | M | Aggregation + charts |
| 13. Export | M | File generation |
| 14. Backup | M | Scheduled task + config UI |
| 15. Currency | M | External API + conversion logic |
| 16. Tag Management | S | List + rename |

---

*Document created: November 2025*
*Status: Ready for implementation*
