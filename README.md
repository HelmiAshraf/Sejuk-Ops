# Sejuk Sejuk OPS — AI-Powered Field Service Management

> A full-stack operations platform for air-conditioning service businesses in Malaysia.
> Built with React 19, TypeScript, Supabase, and OpenAI — featuring multi-role workflows, agentic AI queries, and real-time streaming.

<!-- IMAGE PLACEHOLDER: Replace with dashboard screenshot -->
<!-- ![Dashboard Overview](docs/screenshots/dashboard.png) -->

---

## Modules Completed

| Module | Status |
|--------|--------|
| Module 1 — Admin Portal (Order Submission) | Done |
| Module 2 — Technician Portal (Service Job) | Done |
| Module 3 — WhatsApp Notification Trigger | Done |
| Bonus — KPI Dashboard | Done |
| AI Module — Operations Query Window | Done |
| Optional: AI Document Understanding | Done |
| Optional: AI Operational Insight | Done (built into AI Query — e.g. "Which technician is overloaded?") |

---

## What I Built

**Sejuk Sejuk OPS** digitises the full AC service workflow — from order creation to manager review — across three roles:

- **Admin** creates service orders, assigns technicians using an interactive map with AI-powered recommendations, monitors job progress, and closes completed work.
- **Technicians** view assigned jobs on mobile (PWA), start jobs with one tap (auto-WhatsApps the customer), upload service photos and payment receipts (AI extracts details from images), and submit completion.
- **Managers** review completed jobs (approve or flag), view a KPI dashboard with technician leaderboard, and query operations data conversationally through an AI assistant.

Every status change is logged in an immutable audit trail. Every AI recommendation is visible and manually overridable.

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | React 19 + TypeScript | Concurrent features, full type safety |
| Build | Vite 6 | Sub-second HMR, fast cold starts |
| Routing | React Router v7 | Nested layouts, route-based code splitting |
| Styling | Tailwind CSS v4 | Utility-first, rapid iteration |
| Charts | Recharts | Composable, React-native charting |
| Maps | Leaflet + Nominatim | Free geocoding and maps, no Google billing |
| PWA | Vite Plugin PWA + Workbox | Installable on mobile, offline shell caching |
| Database | Supabase (PostgreSQL) | Row-level security, hosted, realtime-ready |
| Storage | Supabase Storage | CDN-served photos, tied to DB auth |
| API | Vercel Serverless Functions | Co-located with frontend, zero infra config |
| AI | OpenAI `gpt-4o` | Function calling, vision (OCR), streaming |
| Notifications | Green API (WhatsApp) | Free tier, no Meta Business Account needed |
| Auth | Mock login with role selector | As per assessment spec |

---

## Architecture Decisions

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

**Why Vercel Functions for AI** — OpenAI API keys stay server-side only. Functions run co-located with the frontend, so no separate backend to deploy or maintain.

**Why Supabase anon key on client, service-role key on server** — the client can only do what RLS policies allow. The service-role key (full DB access) only exists in Vercel env vars, used by serverless functions.

**Why a status machine at two layers** — `orders.status` has a `CHECK` constraint at the database level (DB rejects invalid values). The UI's `getNextStatuses()` function independently only renders valid action buttons per role. Defense in depth — even if the UI has a bug, the DB won't allow a bad transition.

**Why function calling instead of RAG** — for a structured domain with known query patterns, OpenAI function calling routes questions directly to purpose-built SQL queries. No vector database, no embedding pipeline — simpler, cheaper, and more predictable than RAG.

**Why Green API for WhatsApp** — free 500 messages/month, works instantly with no Meta Business Account approval process. Sufficient for a real MVP, not just a demo.

---

## How AI Was Integrated


### 1. AI Chat for Managers — Ask anything about operations

Managers open the AI assistant and ask questions in plain Bahasa/English like:

- *"What jobs did Ali complete last week?"*
- *"Which technician completed the most jobs this week?"*
- *"How many jobs were completed today?"*
- *"What's today's total revenue?"*
- *"Are there any jobs completed without photos?"*
- *"Which technician might be overloaded right now?"*

The AI reads real data from the database, not hallucinated answers. Responses stream in word-by-word so it feels instant. Supports follow-up questions — ask "and what about last month?" and it remembers the context.

<!-- IMAGE PLACEHOLDER: Replace with AI chat screenshot -->
<!-- ![AI Chat](docs/screenshots/ai-chat.png) -->

### 2. AI-Powered Technician Assignment

When admin assigns a job, a map modal opens showing all technicians with their distance to the customer and current workload. The AI analyzes this and recommends the best technician with a short reason why — highlighted with a badge. Admin can accept or override.

<!-- IMAGE PLACEHOLDER: Replace with assignment map modal screenshot -->
<!-- ![AI Assignment](docs/screenshots/ai-assign-modal.png) -->

### 3. AI Receipt & Photo Reading

Technicians upload a payment receipt photo — the AI reads it and auto-fills the payment amount, method, and reference number into the form. No manual typing needed.

Same for service photos — if there's a handwritten note or model number visible, the AI extracts it and suggests it for the "work done" field.

If the photo is blurry or unclear, the form simply stays empty for manual entry. No wrong data gets auto-filled.

### 4. WhatsApp Customer Notifications

- Customer gets a WhatsApp message **"technician is on the way"** when the technician starts the job
- Customer gets a **feedback request** when the job is completed

Fully automated — technician just taps "Start Job" and the message goes out.

---

## Challenges

### Making AI queries feel instant
Batch LLM responses felt sluggish. I switched the manager AI chat to Server-Sent Events (SSE) streaming — the first word appears in ~400ms, so it feels responsive even when the full response takes 3–4 seconds.

### Geocoding without Google Maps billing
Swapped Google Maps API for Nominatim (OpenStreetMap) + Leaflet. Haversine distance math runs client-side. Nominatim is slightly slower with a 1 req/sec rate limit — fine for an internal ops tool.

### OCR reliability on field photos
Receipt photos from the field (bad lighting, angles) are noisy. I prompt GPT-4o to return `null` for any field it isn't confident about. The form never auto-fills with wrong data — it just leaves fields empty for manual entry.

---

## Limitations of the AI Implementation

**Query scope is bounded** — the AI assistant handles the six query types defined via function calling tools. Questions outside that scope (e.g. "how should we price our services?") get a graceful fallback. This is by design — the assessment requires AI responses based on structured data through controlled queries, not unrestricted DB access. Adding new query types is straightforward: define a new tool + SQL function.

**OCR accuracy depends on photo quality** — receipt and document extraction works well with clear photos but degrades with poor lighting or blurry images. The system handles this gracefully by leaving fields empty rather than filling in bad data.

**Technician location is static for demo purposes** — locations are stored as fixed coordinates on each technician's profile. In a production system, this would use the browser Geolocation API for real-time GPS positioning. The distance calculation and AI assignment logic are already built to work with any coordinate source.

**Model cost at scale** — `gpt-4o` is used for all AI features. The config already exposes an `OPENAI_MODEL` env var to swap to `gpt-4o-mini` for cost-sensitive tasks like OCR and auto-flagging, trading some accuracy for ~10x cost reduction.

---

## What Would I Improve in a Real Production System

| Area | What I'd add |
|------|-------------|
| **Auth** | Supabase Auth with JWT + RLS tied to `auth.uid()` — the RLS policies are already scaffolded in the migrations |
| **Technician GPS** | Real-time location via browser Geolocation API — the map modal and distance logic already accept any coordinate source |
| **Photo optimization** | Client-side canvas resize before upload — saves bandwidth on mobile data |
| **Push notifications** | Web Push API so technicians get instant alerts for new assignments |
| **AI query expansion** | More tools — scheduling insights, parts inventory, seasonal trends — each one is just a tool definition + SQL function |

The architecture is designed so each of these is an incremental addition, not a rewrite.

---

## Self-Assessment

### Which module was easiest?
**Module 1 (Admin Portal)** — standard CRUD with a form and a list page. The data model was clear from the assessment spec, so it was mostly execution.

### Which module was hardest?
**AI Agentic Query with streaming** — getting the function calling loop right (parse intent → select tool → execute SQL → format response) and then layering SSE streaming on top so it feels real-time. Debugging the tool selection when the model picked the wrong function for ambiguous queries took the most iteration.

### How did I use AI tools while building this project?
I used **Claude Code** (Anthropic's CLI) as a development partner throughout the build. Specifically:
- **Architecture planning** — discussed the data model, status machine design, and API structure before writing code
- **Code generation** — scaffolded components, API endpoints, and database migrations with Claude, then reviewed and refined
- **Debugging** — when SSE streaming broke or function calling returned unexpected tool selections, I used Claude to diagnose and fix
- **This README** — drafted and iterated with Claude to make sure it clearly communicates the technical decisions

Claude was a force multiplier, but every architectural decision and code review was mine. The AI helped me move faster — it didn't make the design choices.

---

## Live Demo

| Environment | URL |
|-------------|-----|
| Production | https://sejuk-ops.vercel.app |
| Password | Utopia|

**Demo credentials (no signup needed):**

| Role | Username |
|------|----------|
| Admin | `admin` |
| Manager | `manager` |
| Technician | `ali`, `john`, `bala`, `yusoff` |

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

Create `.env.local`:

```env
VITE_APP_PASSWORD=your_demo_password

VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o

GREEN_API_INSTANCE_ID=your_instance_id
GREEN_API_TOKEN=your_token
```

Run Supabase migrations (paste SQL files in order via Supabase SQL editor), then:

```bash
npm run dev          # Frontend
vercel dev           # Frontend + Vercel Functions
```

---

## Built by

**Helmi Ashraf** — [helmiashraf1022@gmail.com](mailto:helmiashraf1022@gmail.com)
