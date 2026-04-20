# Sejuk Sejuk OPS — AI-Powered Field Service Management

> A full-stack operations platform for air-conditioning service businesses in Malaysia.
> Built with React 19, TypeScript, Supabase, and OpenAI — featuring multi-role workflows, agentic AI queries, and real-time streaming.

<!-- IMAGE PLACEHOLDER: Replace with dashboard screenshot -->
<!-- ![Dashboard Overview](docs/screenshots/dashboard.png) -->

### Quick Navigation

| Section | What's inside |
|---------|--------------|
| [Modules Completed](#modules-completed) | All modules I implemented |
| [What I Built](#what-i-built) | Step-by-step flow of the entire system |
| [Tech Stack](#tech-stack) | Tools and why I chose them |
| [Architecture Decisions](#architecture-decisions) | Key design choices |
| [How AI Was Integrated](#how-ai-was-integrated) | 4 AI features — chat, assignment, OCR, WhatsApp |
| [Challenges](#challenges) | Problems I faced and how I solved them |
| [AI Limitations](#limitations-of-the-ai-implementation) | What the AI can and can't do |
| [Production Roadmap](#what-would-i-improve-in-a-real-production-system) | What I'd add next |
| [Self-Assessment](#self-assessment) | Easiest/hardest module, how I used AI tools |
| [Live Demo](#live-demo) | Try it yourself |

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

**Sejuk Sejuk OPS** digitises the full AC service workflow — from order creation to manager review.

### How the system flows:

**Step 1 — Admin creates an order**
Customer WhatsApps the admin → Admin copy-pastes the WhatsApp message into the system → System detects the content and auto-fills the form → Order number auto-generates (e.g. `SSB-20260420-0001`)

**Step 2 — Admin assigns a technician**
Admin clicks "Assign" → A map modal opens showing all technicians with their distance to the customer and current workload → **AI recommends the best technician based on distance and status** with a reason why → Admin accepts or picks someone else

**Step 3 — Technician receives the job (mobile PWA)**
Technician opens the app on their phone → Sees the job in "My Jobs" → Taps **"Start Job"** → Status changes to In Progress → **Customer automatically receives a WhatsApp message** ("technician is on the way")

**Step 4 — Technician completes the job**
On site, technician uploads up to 6 service photos → **AI reads the photos** and suggests text for "work done" if it detects handwritten notes or model numbers → Technician uploads a payment receipt photo → **AI extracts payment amount, method, and reference number** into the form → Technician confirms and submits → **Customer automatically gets a WhatsApp feedback request**

**Step 5 — Manager reviews**
Manager opens the review queue → Sees completed jobs with photos, work details, and payment info → Approves or flags each job

**Step 6 — Manager checks performance**
Manager opens the KPI dashboard → Sees active jobs, pending reviews, revenue, and a technician leaderboard → Opens the **AI chat** and asks things like *"Which technician completed the most jobs this week?"* or *"What's today's revenue?"* → AI answers using real data from the database, streaming word-by-word

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

| Decision | Why |
|----------|-----|
| **PWA (installable web app)** | Technicians can install it on their phone like a real app — no App Store needed, works offline for viewing jobs |
| **All AI runs on the server** | API keys never touch the browser. Keeps everything secure, and the frontend stays lightweight |
| **AI uses function calling, not RAG** | Instead of dumping the whole database into AI, the model picks the right query tool for each question — more accurate, cheaper, and no hallucinated data |
| **Order status enforced at database level** | Even if someone tries to skip a step, the database itself rejects invalid status changes. The UI also only shows valid actions per role — double protection |
| **Vercel for everything** | Frontend, serverless functions, and deployment all in one place. No separate backend to manage |
| **Green API for WhatsApp** | Free 500 messages/month, works instantly. No need for Meta Business Account approval |
| **Leaflet maps instead of Google Maps** | Free geocoding and maps — same result, zero billing |
| **Every action logged** | Every status change, assignment, and review is recorded with who did it and when — full audit trail |

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

**Demo credentials (no signup needed):**

| Role | Username |
|------|----------|
| Admin | `admin` |
| Manager | `manager` |
| Technician | `ali`, `john`, `bala`, `yusoff` |

---

## Built by

**Helmi Ashraf** — [helmiashraf1022@gmail.com](mailto:helmiashraf1022@gmail.com)
