# KioskIQ — Tech Stack & Feature Map

---

## Full System Architecture

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║                              KIOSKIQ WEB APP                                    ║
║                        Next.js 16 + React 19 + TypeScript                       ║
╠══════════════╦═══════════════════════════════════════╦══════════════════════════╣
║              ║                                       ║                          ║
║  LEFT        ║         CENTER — MAIN PAGES           ║  RIGHT                   ║
║  SIDEBAR     ║                                       ║  CHAT PANEL              ║
║              ║                                       ║  (Persistent)            ║
║  KioskIQ     ║  ┌───────────────────────────────┐   ║  ┌────────────────────┐  ║
║              ║  │  / — Dashboard Overview        │   ║  │  Planning          │  ║
║  Navigation: ║  │  • KPI Cards (5 metrics)       │   ║  │  Assistant         │  ║
║              ║  │    - Today's Orders            │   ║  │                    │  ║
║  Dashboard   ║  │    - Today's Revenue           │   ║  │  TravelChat        │  ║
║  Overview    ║  │    - Avg Order Value           │   ║  │  component         │  ║
║              ║  │    - Predicted Tomorrow        │   ║  │  (travel-chat.tsx) │  ║
║  Planning    ║  │    - Low Stock Alerts          │   ║  │                    │  ║
║  Assistant ★ ║  │  • Line Chart (Actual vs       │   ║  │  CopilotKit        │  ║
║              ║  │    Predicted orders, Recharts) │   ║  │  AG-UI Client      │  ║
║  Labour      ║  │  • AI Insight Panel            │   ║  │                    │  ║
║  Scheduling  ║  │  • Top-Selling Items table     │   ║  │  Sends messages    │  ║
║  (stub)      ║  │  • Low Stock Alerts table      │   ║  │  → Orchestrator    │  ║
║              ║  │  • Items Near Expiry table     │   ║  │    via A2A         │  ║
║  Demand      ║  └───────────────────────────────┘   ║  │                    │  ║
║  Forecasting ║                                       ║  │  Renders agent     │  ║
║  (stub)      ║  ┌───────────────────────────────┐   ║  │  cards from        │  ║
║              ║  │  /inventory — Inventory &      │   ║  │  context state     │  ║
║  Inventory & ║  │  Waste                         │   ║  └────────────────────┘  ║
║  Waste       ║  │  • Live badge (Supabase RT)    │   ║                          ║
║              ║  │  Tab 1: 3D Store View          │   ║                          ║
║  Location &  ║  │    - Three.js / R3F canvas     │   ║                          ║
║  Strategy    ║  │    - Clickable rack objects    │   ║                          ║
║  (stub)      ║  │    - RackDetailsPanel          │   ║                          ║
║              ║  │    - UpdateStockDialog         │   ║                          ║
║  Settings    ║  │  Tab 2: Stock Dashboard        │   ║                          ║
║  (stub)      ║  │    - StockSummary cards        │   ║                          ║
║              ║  │    - StockTable (full list)    │   ║                          ║
║  ─────────── ║  └───────────────────────────────┘   ║                          ║
║              ║                                       ║                          ║
║  User Avatar ║  ┌───────────────────────────────┐   ║                          ║
║  Logout btn  ║  │  /planning — Financial         │   ║                          ║
║              ║  │  Planning Results              │   ║                          ║
║  Theme       ║  │  • FinancialPlanCard           │   ║                          ║
║  Toggle      ║  │  • SummaryPlanCard             │   ║                          ║
║              ║  │  • FeasibilityCard             │   ║                          ║
║  Search bar  ║  │  • InvestmentCard              │   ║                          ║
║  Bell icon   ║  │  • MasterPlanCard              │   ║                          ║
║              ║  │  • ProductCard                 │   ║                          ║
║              ║  │  • DownloadReportButton        │   ║                          ║
║              ║  └───────────────────────────────┘   ║                          ║
║              ║                                       ║                          ║
║              ║  ┌───────────────────────────────┐   ║                          ║
║              ║  │  /login  /signup               │   ║                          ║
║              ║  │  /forgot-password              │   ║                          ║
║              ║  │  Auth forms → Supabase Auth    │   ║                          ║
║              ║  └───────────────────────────────┘   ║                          ║
╚══════════════╩═══════════════════════════════════════╩══════════════════════════╝
```

---

## API Routes (Next.js Backend)

```
app/api/
├── dashboard/route.ts      GET  — KPIs, chart data, top items, low stock, expiry
│                                  Queries: pos_orders, pos_orders_daily,
│                                           inventory_stock, inventory_expiry,
│                                           dashboard_ai_insights
│                                  Cache: s-maxage=60, stale-while-revalidate=300
│
├── copilotkit/route.ts     POST — AG-UI ↔ A2A middleware bridge
│                                  Routes chat to Orchestrator (port 9000)
│
├── transactions/route.ts   GET/POST — CRUD for transaction records (MongoDB)
│
├── budget/route.ts         GET  — Budget data
│
└── rag/
    ├── chat/route.ts       POST — RAG chatbot Q&A (Supabase vector search)
    └── embed/route.ts      POST — Embed documents into Supabase vector store
```

---

## AI Agent System (Python / FastAPI)

```
                    ┌─────────────────────────────────────┐
                    │         ORCHESTRATOR  :9000          │
                    │  Google ADK + LiteLLM                │
                    │  Model: ILMU GLM-5.1                 │
                    │  (Anthropic-compatible endpoint)     │
                    │  Routes user intent to specialists   │
                    └──────────────┬──────────────────────┘
                                   │  A2A Protocol
           ┌───────────────────────┼───────────────────────┐
           │           │           │           │            │
           ▼           ▼           ▼           ▼            ▼
    ┌────────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐
    │  Coach     │ │Database│ │Feasib- │ │Invest- │ │Financial │
    │  Agent     │ │ Agent  │ │ility   │ │ment    │ │ Planner  │
    │            │ │        │ │ Agent  │ │ Agent  │ │  Agent   │
    │ Budget     │ │Add/List│ │Afford- │ │Portfolio│ │Roadmap  │
    │ advice,    │ │/Delete │ │ability │ │suggest.│ │ builder  │
    │ spending   │ │transact│ │savings │ │strategy│ │          │
    │ analysis   │ │ions    │ │gap     │ │        │ │          │
    └────────────┘ └───┬────┘ └────────┘ └────────┘ └──────────┘
                       │
           ┌───────────┼───────────────┐
           │           │               │
           ▼           ▼               ▼
    ┌────────────┐ ┌────────┐   ┌────────────┐
    │  Product   │ │Summary │   │  RAG MCP   │
    │  Agent     │ │ Agent  │   │  Server    │
    │            │ │        │   │  :9013/sse │
    │ Real-time  │ │Dashbd  │   │            │
    │ product    │ │summary │   │ Scrapy web │
    │ price      │ │of user │   │ scrape +   │
    │ search     │ │ input  │   │ Supabase   │
    │ (Scrapy)   │ │        │   │ vector DB  │
    └────────────┘ └────────┘   └────────────┘
```

---

## Data Flow — Dashboard Overview

```
Browser                 Next.js API           Supabase (PostgreSQL)
  │                         │                         │
  │── GET /api/dashboard ──►│                         │
  │                         │── SELECT pos_orders ───►│
  │                         │── SELECT pos_orders_daily►│
  │                         │── SELECT inventory_stock►│
  │                         │── SELECT inventory_expiry►│
  │                         │── SELECT ai_insights ───►│
  │                         │◄─ all results ──────────│
  │◄── JSON (KPIs + chart) ─│                         │
  │                         │
  │  SWR caches 60s, no refetch on focus
```

## Data Flow — Inventory (Real-time)

```
Browser                 Supabase Realtime
  │                          │
  │── subscribe channel ────►│
  │                          │ (WebSocket)
  │◄── inventory_stock ──────│  push on INSERT/UPDATE
  │    changes live          │
  │                          │
  │  User clicks rack  →  ThreeDStoreView (Three.js)
  │  → RackDetailsPanel shows items
  │  → UpdateStockDialog → supabase.update() → RT push
```

## Data Flow — Planning Assistant (Chat → Agents)

```
User types in chat panel
        │
        ▼
  TravelChat (travel-chat.tsx)
  CopilotKit useCoAgent hooks
        │  AG-UI Protocol
        ▼
  /api/copilotkit  (A2A middleware)
        │  A2A Protocol (HTTP + SSE)
        ▼
  Orchestrator Agent :9000
  (ILMU GLM-5.1 via LiteLLM)
        │  routes to specialist(s)
        ▼
  Specialist Agents (FastAPI)
  → returns structured JSON cards
        │
        ▼
  FinancialDataContext (React context)
  → updates state: financialPlanData,
    summaryPlanData, feasibilityData,
    investmentData, productData…
        │
        ▼
  /planning page renders result cards
  (FinancialPlanCard, FeasibilityCard…)
```

---

## Database Schema (Supabase / PostgreSQL)

| Table | Purpose |
|---|---|
| `pos_orders` | Individual orders with `total_amount`, `ordered_at` |
| `pos_orders_daily` | Daily rollup: `actual_orders`, `predicted_orders` |
| `pos_order_items` | Line items per order: `item_name`, `qty`, `line_total` |
| `inventory_stock` | Stock levels: `item_name`, `current_qty`, `threshold_qty`, `status`, `unit` |
| `inventory_expiry` | Expiry tracking: `item_name`, `quantity`, `expiry_date`, `days_to_expiry` |
| `dashboard_ai_insights` | AI-generated insight text with `priority` and `is_active` |

MongoDB (via `lib/mongodb.ts`) — used for transaction records by Database Agent.

Supabase Vector Store — used by RAG MCP Server for document embeddings + semantic search.

---

## Frontend Component Tree

```
app/layout.tsx  (ThemeProvider)
└── app/(dashboard)/layout.tsx
    └── DashboardLayout
        ├── FinancialDataProvider  (React context)
        ├── Sidebar  (nav links, user avatar, logout, theme toggle)
        ├── Header   (search bar, bell, theme toggle, avatar)
        ├── <children>  (page content)
        │   ├── /               → DashboardOverview
        │   │   ├── KPICard ×5
        │   │   ├── Recharts LineChart
        │   │   ├── AIInsightPanel
        │   │   ├── TopSellingItems table
        │   │   ├── LowStockAlerts table
        │   │   └── ItemsNearExpiry table
        │   │
        │   ├── /inventory      → InventoryPage
        │   │   ├── Radix Tabs
        │   │   ├── ThreeDStoreView  (Three.js + R3F)
        │   │   │   └── ItemShape3D (clickable 3D racks)
        │   │   ├── RackDetailsPanel
        │   │   ├── UpdateStockDialog
        │   │   ├── StockSummary
        │   │   └── StockTable
        │   │
        │   ├── /planning       → PlanningPage
        │   │   ├── FinancialPlanCard
        │   │   ├── SummaryPlanCard
        │   │   ├── FeasibilityCard
        │   │   ├── InvestmentCard
        │   │   ├── MasterPlanCard
        │   │   ├── ProductCard
        │   │   └── DownloadReportButton
        │   │
        │   ├── /labour         → (stub)
        │   ├── /demand         → (stub)
        │   ├── /location       → (stub)
        │   └── /settings       → (stub)
        │
        └── TravelChat (right panel — always visible)
            ├── CopilotKit hooks
            ├── MessageFromA2A / MessageToA2A
            └── Agent response cards (streamed via SSE)

app/login/page.tsx         → Supabase Auth
app/signup/page.tsx        → Supabase Auth
app/forgot-password/page.tsx
```

---

## Technology Summary

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js | 16 |
| UI Library | React | 19 |
| Language | TypeScript | 5 |
| Styling | Tailwind CSS | 3 |
| UI Components | Radix UI + shadcn/ui | latest |
| Charts | Recharts | 3 |
| 3D Rendering | Three.js + React Three Fiber | 0.184 / 9 |
| Data Fetching | SWR | 2 |
| AI Chat UI | CopilotKit | latest |
| Agent Protocol | AG-UI + A2A | 0.0.40 / 0.44 |
| Agent Framework | Google ADK | 1.21 |
| LLM Adapter | LiteLLM | 1.81 |
| LLM Model | ILMU GLM-5.1 | — |
| Web Scraping | Scrapy | 2.14 |
| Primary DB | Supabase (PostgreSQL + Realtime + Vector) | 2 |
| Secondary DB | MongoDB | 6 |
| Auth | Supabase Auth | — |
| Agent Server | FastAPI + Uvicorn | 0.123 / 0.40 |
| MCP Transport | SSE (MCP protocol) | 1.26 |
| Observability | OpenTelemetry | 1.37 |
