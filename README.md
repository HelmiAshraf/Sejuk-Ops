# Sejuk Sejuk OPS — AI-Powered Field Service Management

> An end-to-end operations platform for air-conditioning service businesses in Malaysia.  
> Built with React 19, TypeScript, Supabase, and OpenAI — with multi-role workflows, agentic AI queries, and real-time streaming.

---

<!-- IMAGE PLACEHOLDER -->
> **Image needed:** Full-page screenshot of the Manager Dashboard (KPI cards + AI chat panel open).  
> Save as `docs/screenshots/dashboard.png` and replace this block with:  
> `![Dashboard Overview](docs/screenshots/dashboard.png)`

---

## Table of Contents

1. [What I Built](#what-i-built)
2. [Live Demo](#live-demo)
3. [Tech Stack](#tech-stack)
4. [Architecture](#architecture)
5. [Role-Based Workflows](#role-based-workflows)
6. [AI Integration — Deep Dive](#ai-integration--deep-dive)
7. [Database Design](#database-design)
8. [Challenges & Decisions](#challenges--decisions)
9. [Assumptions](#assumptions)
10. [Limitations](#limitations)
11. [Local Setup](#local-setup)

---

## What I Built

**Sejuk Sejuk OPS** is a production-grade field service management system purpose-built for AC service companies in Malaysia.

The core problem: field service businesses manage jobs through WhatsApp chats, phone calls, and paper forms. Jobs get lost, technicians don't know their schedule, managers have no real-time visibility, and there's no audit trail. This app replaces that chaos.

### What the system does end-to-end:

- **Admin** creates service orders (manual entry or parsed from WhatsApp screenshots), assigns technicians using an interactive map with AI recommendations, and closes completed jobs.
- **Technicians** receive jobs on their phone, tap "Start Job" (auto-WhatsApps the customer), upload service photos and a payment receipt, and submit completion — all from a mobile PWA with no app store install.
- **Managers** review completed jobs, approve or flag them, and query operational metrics conversationally via an AI assistant ("Who's the busiest technician today?" / "Any jobs with missing photos?").

Every status change is logged immutably. Every AI-generated recommendation is visible and overridable. No black boxes.

---

## Live Demo

| Environment | URL |
|-------------|-----|
| Production | _[add your Vercel URL here]_ |
| Preview | _[add your Vercel preview URL here]_ |

**Demo credentials (no signup needed):**

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `demo123` |
| Manager | `manager` | `demo123` |
| Technician (Ali) | `ali` | `demo123` |
| Technician (John) | `john` | `demo123` |

---

## Tech Stack

### Frontend
| Layer | Choice | Why |
|-------|--------|-----|
| Framework | React 19 + TypeScript | Concurrent features, full type safety |
| Build | Vite 6 | Sub-second HMR, fast cold starts |
| Routing | React Router v7 | File-based routing patterns, nested layouts |
| Styling | Tailwind CSS v4 | Utility-first, no CSS context-switching |
| Charts | Recharts | Composable, React-native charting |
| Maps | Leaflet + Nominatim | Free geocoding, no Google API billing |
| Icons | Lucide React | Consistent, tree-shakeable |
| PWA | Vite Plugin PWA + Workbox | Offline support, installable on mobile |

### Backend
| Layer | Choice | Why |
|-------|--------|-----|
| Database | Supabase (PostgreSQL) | Row-level security, realtime-ready, hosted |
| Storage | Supabase Storage | CDN-served photos, tied to DB auth |
| API | Vercel Serverless Functions | Co-located with frontend, zero infra |
| AI | OpenAI `gpt-4o` | Function calling, vision, streaming |
| Notifications | Green API (WhatsApp) | Free 500 msgs/month, no Meta Business Account |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   React 19 SPA (Vite PWA)           │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────┐  │
│  │  Admin   │  │Technician │  │     Manager      │  │
│  │  Pages   │  │   Pages   │  │  Dashboard + AI  │  │
│  └────┬─────┘  └─────┬─────┘  └────────┬─────────┘  │
│       │              │                  │            │
│  ┌────▼──────────────▼──────────────────▼─────────┐ │
│  │          Supabase JS Client (anon key)         │ │
│  └────────────────────┬───────────────────────────┘ │
└───────────────────────┼─────────────────────────────┘
                        │
        ┌───────────────▼────────────────┐
        │   Supabase (PostgreSQL + RLS)  │
        │   Storage Bucket (CDN photos)  │
        └────────────────────────────────┘

        ┌───────────────────────────────────────────┐
        │          Vercel Serverless Functions       │
        │  /api/ai-stream    → Streaming AI queries  │
        │  /api/ai-assign    → Technician recommend  │
        │  /api/ai-supervisor→ Job auto-flagging     │
        │  /api/ai-document  → Photo text extraction │
        │  /api/ai-receipt   → Receipt OCR           │
        │  /api/notify-customer → WhatsApp sender   │
        └───────────────┬───────────────────────────┘
                        │
              ┌─────────▼─────────┐
              │   OpenAI gpt-4o   │
              │  (+ Vision API)   │
              └───────────────────┘
```

### Key design choices

**Vercel Functions for all AI calls** — keeps OpenAI API keys off the client, handles CORS, and runs co-located with the frontend with zero cold-start overhead for lightweight functions.

**Supabase anon key on client, service-role key on server** — client can only do what RLS policies allow. The service-role key (full access) only lives in Vercel environment variables, used by serverless functions for AI-initiated writes.

**Status machine enforced at UI + DB level** — `orders.status` has a `CHECK` constraint at the database. The UI's `getNextStatuses()` function independently blocks illegal transitions. Defense in depth.

**No vector database** — Instead of RAG with embeddings, the AI uses OpenAI function calling to route queries directly to purpose-built SQL functions. Simpler, cheaper, and more predictable for a structured domain.

**Green API over Twilio/Meta** — Free 500 messages/month, no Meta Business Account approval needed. For a demo/MVP this is 100% sufficient.

---

## Role-Based Workflows

### Admin
<!-- IMAGE PLACEHOLDER -->
> **Image needed:** Screenshot of the order list page + the technician assignment map modal side by side.  
> Save as `docs/screenshots/admin-assign.png`

1. Create order from customer call or WhatsApp text
2. Open assignment modal → map shows all technicians with distance + workload + AI recommendation
3. Assign technician → auto-notifies customer via WhatsApp ("technician is on the way")
4. Monitor job progress through status pipeline
5. Close job after manager approves

### Technician (mobile-first, PWA)
<!-- IMAGE PLACEHOLDER -->
> **Image needed:** Mobile screenshot of "My Jobs" page showing active job card with Start/Complete buttons.  
> Save as `docs/screenshots/technician-jobs.png`

1. Open PWA on phone (installable, no App Store)
2. See all assigned jobs in "Active" tab
3. Tap "Start Job" → status flips to In Progress, customer gets WhatsApp
4. On site: upload up to 6 service photos (AI reads any visible text/notes)
5. Upload receipt photo → AI extracts payment amount and method
6. Submit completion → manager review queue triggered

### Manager
<!-- IMAGE PLACEHOLDER -->
> **Image needed:** Screenshot of the review modal open with job photos + AI supervisor flag visible.  
> Save as `docs/screenshots/manager-review.png`

1. Dashboard shows live KPIs: active jobs, pending reviews, revenue
2. Pipeline bar shows jobs per status stage
3. Technician leaderboard with job count ranking
4. Review queue: approve or flag each completed job
5. AI chat: ask anything about operations in natural language

---

## AI Integration — Deep Dive

This is not a chatbot wrapper. There are **five distinct AI capabilities**, each solving a real operational problem.

---

### 1. Agentic Ops Query (Manager AI Chat)

**Endpoints:** `POST /api/ai-query` (batch) and `POST /api/ai-stream` (streaming SSE)

The manager types a question. The AI figures out which database tool to call, executes it, and streams back a human-readable answer with context.

```
User: "Who closed the most jobs this week?"

AI flow:
  1. Parse intent → route to `query_top_technician` tool
  2. Call tool with { period: "week" }
  3. Tool runs SQL → returns { name: "Ali", count: 7 }
  4. Stream natural language response word-by-word
```

**Tools available to the model:**

| Function | What it queries |
|----------|----------------|
| `query_jobs_by_technician` | All jobs for a named technician, optional date range |
| `query_top_technician` | Highest performer by job count (today / week / month) |
| `query_jobs_count` | Total completions by status or time range |
| `query_jobs_no_photos` | Jobs submitted without photo evidence |
| `query_revenue` | Revenue totals by period, filtered by status |
| `query_overloaded_technician` | Who has the most active In-Progress jobs right now |

**Memory:** 8-turn conversation window — follow-up questions work ("and what about last month?").

**Guardrails:** Input length cap, blocked term list (SQL injection attempts, profanity), 500ms debounce on the UI.

**Supported query types (examples):**
- "What's today's total revenue?"
- "Which technician has the most active jobs right now?"
- "Are there any jobs completed without photos?"
- "How many jobs did Ali close this week?"
- "Show me jobs that are overdue in review"
- "What's the revenue for completed jobs this month?"

---

### 2. Intelligent Technician Assignment

**Endpoint:** `POST /api/ai-assign`

When assigning a job, the admin opens a map modal. The system:
1. Geocodes the customer address (Nominatim API)
2. Calculates Haversine distance from each technician's last known location
3. Counts each technician's active job load
4. Sends this structured data to GPT-4o with a prompt asking for a recommendation + reasoning

The AI response includes a recommended technician ID and a 2–3 sentence justification. The admin sees this highlighted in purple — but can override it.

<!-- IMAGE PLACEHOLDER -->
> **Image needed:** Screenshot of the assignment map modal with a technician card showing the purple "AI Recommended" badge.  
> Save as `docs/screenshots/ai-assign-modal.png`

---

### 3. Job Supervisor (Auto-Flagging)

**Endpoint:** `POST /api/ai-supervisor`

Runs automatically when a technician submits job completion. Sends the full job record to GPT-4o and checks for three anomalies:

| Flag | Trigger |
|------|---------|
| Price mismatch | Final amount >50% above quoted price |
| Missing photos | Job completed with zero photos uploaded |
| Suspiciously fast | Job marked complete in under 15 minutes |

If any flag fires, the completion is tagged and shown to the manager in the review UI. No silent passes.

---

### 4. Document Understanding (Receipt & Photo OCR)

**Endpoints:** `POST /api/ai-receipt` and `POST /api/ai-document`

**Receipt OCR:** When a technician uploads a payment receipt photo, GPT-4o Vision reads it and extracts:
- Payment amount
- Payment method (Cash / Bank Transfer / E-Wallet)
- Bank reference number or transaction ID
- Remarks

These values are pre-filled into the completion form. Technician just confirms.

**Service photo reading:** If a photo contains a handwritten service note or a sign (e.g., model number written on the unit), the text is extracted and suggested for the "work done" field.

Both use vision-capable `gpt-4o` with structured output. If extraction fails or returns low-confidence results, the form stays empty — the technician fills it manually. No silent corruption.

---

### 5. WhatsApp Customer Notifications

**Endpoint:** `POST /api/notify-customer`

Two automated messages, sent via Green API:
- **"On the way"** — fired when technician taps Start Job. Includes technician name.
- **"Feedback request"** — fired on job completion. Thanks customer and asks for a review.

Fire-and-forget: the notification result doesn't block the job workflow.

---

## Database Design

```
technicians
├── id (uuid PK)
├── name, phone
└── is_active

orders
├── id (uuid PK)
├── order_no (SSB-20260420-0001, auto-generated by DB trigger)
├── customer_name, customer_phone, customer_address
├── problem_description, service_type
├── quoted_price
├── assigned_technician_id → technicians.id
├── status (New|Assigned|In Progress|Job Done|Reviewed|Closed)
├── preferred_date, admin_notes
└── created_at, updated_at (auto-trigger)

job_completions (1:1 with orders)
├── order_id → orders.id
├── technician_id → technicians.id
├── work_done, extra_charges, final_amount
├── payment_amount, payment_method, payment_remarks
├── receipt_photo_url
└── completed_at

job_photos (up to 6 per order)
├── order_id → orders.id
├── storage_path, public_url
└── uploaded_at, uploaded_by

audit_logs (append-only)
├── order_id → orders.id
├── action, from_status, to_status
├── actor_role, actor_name
└── metadata (jsonb)

manager_reviews (1:1 with orders)
├── order_id → orders.id
├── reviewed_by, review_notes
├── outcome (Approved|Flagged)
└── reviewed_at
```

**Order number auto-generation:** A PostgreSQL function generates `SSB-YYYYMMDD-NNNN` on insert using a sequence. No application logic needed.

**Cascading deletes:** Deleting an order removes its photos, completion record, and audit logs — keeps storage clean.

---

## Challenges & Decisions

### Challenge 1: Making AI queries feel fast
Batch LLM calls felt sluggish on a connection with even moderate latency. I switched the manager AI chat to Server-Sent Events (SSE) streaming — the response starts appearing in ~400ms, and users perceive it as instant even when the total generation takes 3–4 seconds.

### Challenge 2: Geocoding without Google Maps billing
Initially planned Google Maps API. Swapped to Nominatim (OpenStreetMap) for free geocoding and Leaflet for the map component. Haversine distance math runs client-side. The only trade-off is that Nominatim is slightly slower and has a 1 req/sec rate limit — acceptable for an internal ops tool.

### Challenge 3: OCR reliability on receipt photos
Receipt photos taken in field conditions (bad lighting, angles) are noisy. I handle this by prompting GPT-4o to return `null` for any field it isn't confident about, rather than guessing. The form never auto-fills with wrong data — it just leaves fields empty for manual entry.

### Challenge 4: Offline + photo uploads
PWA offline caching is straightforward for reads. Photo uploads are the problem — you can't buffer a 5MB file indefinitely in service worker cache. Current approach: photos require connection, but the rest of the form (work done, amounts) works offline. A full offline-first photo queue would need IndexedDB buffering — out of scope for the assessment timeframe.

### Challenge 5: Status machine integrity
With multiple roles acting on the same order, stale UI state could cause illegal transitions. Solved with two layers: the DB `CHECK` constraint rejects invalid statuses at write time, and the UI `getNextStatuses()` function only renders valid action buttons based on current status + user role.

---

## Assumptions

- **Malaysian market only** — phone numbers follow `60XXXXXXXXX` format, addresses are in Malay/English, currency is MYR (RM).
- **Single business, single location** — no multi-branch or franchise support.
- **Technician locations are static** — stored on their profile, not live GPS. The map shows last known location, not real-time.
- **WhatsApp is primary communication** — customers are assumed to be reachable via WhatsApp. The system doesn't handle SMS or email.
- **Manager is not on-site** — review happens asynchronously, not in real time during job execution.
- **Authentication is demo-grade** — the app uses a mock user system with hardcoded credentials. Not suitable for production without replacing this with real auth (Supabase Auth or similar).

---

## Limitations

### Authentication
The current auth is a mock system using `localStorage` and a hardcoded password gate. It demonstrates role-based access correctly but has no real session management, JWT tokens, or multi-user isolation. Production would require Supabase Auth with proper RLS tied to `auth.uid()`.

### AI Query Scope
The AI assistant only understands structured queries that map to one of the six predefined database tools. Questions outside that scope (e.g., "suggest how to improve our pricing") get a graceful fallback message. Adding new query types requires writing a new tool definition and SQL function.

### AI Model Cost
`gpt-4o` is used for all AI features. At scale, receipt OCR and document reading on every job completion adds up. The config exposes an `OPENAI_MODEL` env var to swap to `gpt-4o-mini` — trading some accuracy for ~10x cost reduction.

### Technician Location
Location is manually set, not GPS-tracked. The distance calculation on the assignment map is an approximation based on stored coordinates, not real-time position.

### Photo Uploads
Photos upload directly to Supabase Storage from the browser. There is no compression or resizing — large photos (5–10MB) from modern phones can be slow on mobile data. Client-side resize with a canvas element would fix this but was not implemented.

### Offline Photo Uploads
The PWA caches the app shell for offline viewing, but photo uploads require network. Jobs can be viewed offline; completion cannot be submitted without connection.

### No Push Notifications
Technicians are not notified of new assignments via push. They must open the app to see new jobs. Implementing Web Push would complete the loop.

### Concurrency
There is no optimistic locking. If two admins try to assign the same order simultaneously, the last write wins. At this scale (small AC service team) it is not a real problem.

---

## Local Setup

### Prerequisites
- Node.js 20+
- A Supabase project
- OpenAI API key
- (Optional) Green API account for WhatsApp

### Steps

```bash
git clone https://github.com/your-username/sejuk-ops.git
cd sejuk-ops
npm install
```

Copy and fill in environment variables:

```bash
cp .env.example .env.local
```

```env
# App gate
VITE_APP_PASSWORD=your_demo_password

# Supabase (client-side)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Supabase (server-side, Vercel Functions only)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o

# Green API (optional — WhatsApp notifications)
GREEN_API_INSTANCE_ID=your_instance_id
GREEN_API_TOKEN=your_token
```

Run migrations on your Supabase project (paste SQL files in order via Supabase SQL editor), then:

```bash
npm run dev
```

For Vercel Functions locally:

```bash
npm install -g vercel
vercel dev
```

---

## Project Structure

```
sejuk-ops/
├── src/
│   ├── api/              # Supabase query functions (client-side)
│   ├── components/       # Shared UI components
│   ├── config/           # AI feature flags and model config
│   ├── constants/        # Service types, mock users, technician IDs
│   ├── context/          # Auth context provider
│   ├── lib/              # Status machine, Supabase client
│   ├── pages/
│   │   ├── admin/        # Order list, new order form, order detail
│   │   ├── technician/   # My jobs, job completion form
│   │   └── manager/      # Dashboard, AI query, review queue
│   └── types/            # TypeScript interfaces
├── api/                  # Vercel Serverless Functions
│   ├── _auth.ts          # API key validation middleware
│   ├── _config.ts        # Server AI config
│   ├── ai-stream.ts      # Streaming agentic query (SSE)
│   ├── ai-query.ts       # Batch agentic query
│   ├── ai-assign.ts      # Technician recommendation
│   ├── ai-supervisor.ts  # Job auto-flagging
│   ├── ai-document.ts    # Service photo text extraction
│   ├── ai-receipt.ts     # Receipt OCR
│   └── notify-customer.ts# WhatsApp sender
└── supabase/
    └── migrations/       # Ordered SQL migration files
```

---

## Built by

Helmi Ashraf — [helmiashraf1022@gmail.com](mailto:helmiashraf1022@gmail.com)

Built as a technical assessment submission demonstrating full-stack product engineering with practical AI integration.
