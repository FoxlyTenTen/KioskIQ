# Inventra

> AI-Powered Decision Intelligence Platform built on a scalable, agent-driven architeture for SMEs.

**Team SevenAteNine** | **ID: 68** | UM Hackathon 2026

[![Pitch Video](https://img.shields.io/badge/Watch%20Our%20Pitch-YouTube-red?style=for-the-badge&logo=youtube)](https://youtu.be/_m998zof9Lk)

---

## Overview of Inventra

![Inventra Dashboard](Inventra1.png)
![Inventra Planning Canvas](Inventra2.png)
![Inventra Inventory](Inventra3.png)

---

Inventra is a full-stack AI platform built for F&B kiosk owners operating in Malaysian shopping malls. It combines real-time operations monitoring, ML-powered forecasting, and a multi-agent AI pipeline that guides owners through the entire business expansion process — from site scouting to a final strategic roadmap.

---

## Features

### Real-Time Analytics Dashboard
- KPI cards: today's orders, revenue, average order value, predicted orders tomorrow, critical stock alerts, expiring items
- Multi-outlet comparison table (sortable) across all 3 outlets
- Charts: revenue trend, orders actual vs predicted, top menu items, expiry urgency breakdown
- Data fetched live from Supabase via SQL MCP tools

### Business Location Expansion Pipeline
A 5-agent sequential AI pipeline with human-in-the-loop checkpoints at every stage. Triggered by "I want to expand my business."

### ML-Powered Demand Forecasting
Predict tomorrow's orders, revenue, stockout risk, reorder quantities, expiry waste risk, and top-selling items — powered by a hosted ML service on Google Cloud Run.

### 3D Inventory Management
Three.js visualization of the kiosk with color-coded racks (red = critical, yellow = warning, green = ok). Live sync via Supabase Realtime subscriptions.

### Natural Language Kiosk Analytics
Ask plain-English questions — "What's expiring this week?" or "Compare all 3 outlets" — and get instant answers routed through SQL or RAG tools.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Browser (Next.js)                          │
│   Dashboard Pages  │  Planning Canvas  │  CopilotKit Chat       │
└──────────────────────────────┬──────────────────────────────────┘
                               │ AG-UI Protocol
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              CopilotKit Runtime  (Next.js API Route)            │
│                  A2A Middleware Agent                            │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│        Orchestrator Agent  (ADK + GLM-5.1 via ILMU — Core Brain) │
│                       Port 9000                                 │
│   ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐   │
│   │  SQL MCP    │  │  RAG MCP    │  │  A2A Agent Routing   │   │
│   │  Port 9014  │  │  Port 9013  │  │  (A2A Protocol)      │   │
│   └──────┬──────┘  └──────┬──────┘  └──────────┬───────────┘   │
└──────────┼────────────────┼─────────────────────┼───────────────┘
           │                │                     │
           ▼                ▼                     ▼
     Supabase DB      OpenAI Embeds    ┌──────────────────────────┐
     (direct SQL)   (text-embed-3)    │   Specialized A2A Agents │
                                      │  ├─ Site Selection  9020  │
                                      │  ├─ Exp. Feasibility 9021 │
                                      │  ├─ Market Research 9022  │
                                      │  ├─ Risk Manager    9023  │
                                      │  ├─ Strategic Plan  9024  │
                                      │  └─ Forecast        9025  │
                                      └──────────────────────────┘
```

| Layer | Protocol | Purpose |
|---|---|---|
| Browser ↔ CopilotKit | HTTP/SSE | Streaming user messages |
| CopilotKit ↔ Orchestrator | AG-UI | Agent-UI communication |
| Orchestrator ↔ SQL/RAG | MCP over SSE | Database & vector search tools |
| Orchestrator ↔ Specialists | A2A (HTTP) | Agent-to-agent task delegation |

---

## Expansion Pipeline (Flagship Feature)

```
User: "I want to expand my business"
      │
      ▼
[HITL Form] — target area, budget, business type
      │
      ▼
Agent 1: Site Selection (Port 9020)
  Geocodes area → Foursquare foot traffic → Google Places competitors
  → Scores 3 candidate locations (foot traffic, affordability, competition, growth)
      │
[HITL] User picks 1 of 3 locations
      │
      ▼
Agent 2: Expansion Feasibility (Port 9021)
  Fetches live BNM OPR rate → monthly revenue/cost projections
  → Break-even months, ROI %, 12-month forecast, risk level
      │
[HITL] User reviews and accepts
      │
      ▼
Agent 3: Market Researcher (Port 9022)
  Google Places competitor analysis → data.gov.my demographics
  → 3 market positioning strategies (Premium / Value / Niche)
  → TAM/SAM, pricing, customer profile per strategy
      │
[HITL] User picks 1 of 3 strategies
      │
      ▼
Agent 4: Risk Manager (Port 9023)
  → 3 risk profiles (Conservative / Balanced / Aggressive)
  → 5 risks each with severity, impact RM, mitigation, contingency
  → Financial buffers per profile
      │
[HITL] User picks 1 of 3 profiles
      │
      ▼
Agent 5: Strategic Planner (Port 9024)
  Synthesises all prior selections
  → 3 expansion roadmaps with phased investment schedules
  → AI recommendation with projected outcome
      │
[HITL] User picks 1 of 3 roadmaps
      │
      ▼
Planning Canvas — 5 slides:
  📍 Location → 💰 Feasibility → 🎯 Market Strategy → 🛡️ Risk → 🗺️ Roadmap
```

---

## Agent System

| Agent | Port | Model | Purpose |
|---|---|---|---|
| Orchestrator | 9000 | **GLM-5.1 (ILMU)** | Intent routing, SQL/RAG/A2A dispatch — core brain |
| RAG MCP Server | 9013 | — | Semantic search over business context |
| SQL MCP Server | 9014 | — | Direct Supabase SQL queries |
| Site Selection Expert | 9020 | Gemini 2.5-flash | Location scoring with live APIs |
| Expansion Feasibility | 9021 | Gemini 2.5-flash | Financial projections |
| Market Researcher | 9022 | Gemini 2.5-flash | Market segmentation & strategies |
| Risk Manager | 9023 | Gemini 2.5-flash | Risk profiling & buffers |
| Strategic Planner | 9024 | Gemini 2.5-flash | Multi-phase expansion roadmaps |
| Forecast Agent | 9025 | Gemini 2.5-flash | ML demand forecasting via Cloud Run |

### Orchestrator Intent Routing

| Category | Trigger | Routing |
|---|---|---|
| Kiosk Numbers | revenue, orders, stock, expiry | SQL MCP tools |
| Kiosk Overview | "how is the business?", "any insights?" | RAG MCP |
| Expansion | "expand", "new location", "open outlet" | 5-agent pipeline |
| Forecast | "forecast", "predict", "stockout", "reorder" | Forecast Agent |

---

## ML Forecasting

The Forecast Agent fetches live Supabase data, engineers ML features, and calls the Inventra ML Service hosted on Google Cloud Run.

| Forecast | Output |
|---|---|
| Daily Orders | Predicted order count tomorrow |
| Revenue & AOV | Forecasted revenue (RM), expected AOV |
| Stockout Risk | Risk % per item, days until stockout |
| Reorder Quantities | Units to reorder per item |
| Expiry Waste Risk | Waste % risk, units at risk |
| Top Selling Items | Top 5 predicted items tomorrow |

Trigger phrases: "forecast tomorrow", "will we stock out?", "predict top sellers for outlet-2"

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| Next.js 16 + React 19 | App Router, SSR, API routes |
| TypeScript 5 | Type safety |
| TailwindCSS | Styling |
| CopilotKit | AI chat, HITL actions, AG-UI protocol |
| Recharts | Dashboard charts |
| Three.js + @react-three | 3D inventory visualization |
| React Leaflet | Location maps with competitor markers |
| Supabase JS | Database client + Realtime |

### Backend (Python Agents)
| Technology | Purpose |
|---|---|
| Google ADK | LLM agent framework |
| A2A SDK | Agent-to-agent protocol |
| FastMCP | MCP server + SSE transport |
| FastAPI + Uvicorn | HTTP server for A2A endpoints |
| Supabase Python | Direct DB access from agents |

### Infrastructure
| Service | Purpose |
|---|---|
| Supabase | PostgreSQL + pgvector embeddings |
| Google Cloud Run | Inventra ML Service |
| GLM-5.1 via ILMU | Orchestrator (core brain) — intent routing & reasoning |
| Gemini 2.5-flash | All 6 specialized A2A agents |
| OpenAI text-embedding-3-small | RAG query embeddings |

### External APIs
| API | Used By |
|---|---|
| Google Geocoding + Places + Distance Matrix | Site Selection, Market Research |
| Foursquare Places | Site Selection (foot traffic proxy) |
| Bank Negara Malaysia OPR | Expansion Feasibility (cost of capital) |
| data.gov.my (population_state) | Market Researcher (demographics) |

---

## Pages

| Route | Description |
|---|---|
| `/` | Dashboard — KPIs, charts, multi-outlet comparison table |
| `/planning` | Business Intelligence Canvas — expansion pipeline slideshow |
| `/location` | Per-outlet cards with predicted orders, stock, and expiry status |
| `/inventory` | 3D kiosk visualization with live stock management |

---

## Setup

### Prerequisites
- Node.js 18+
- Python 3.11+ with virtual environment at `agents/.venv`

### Install

```bash
# Frontend
npm install

# Python agents (Windows)
cd agents
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
```

### Configure

```bash
cp .env.example .env
# Fill in your keys
```

### Run Everything

```bash
npm run dev
```

Starts all 10 processes concurrently:

| Service | Command |
|---|---|
| UI | `next dev --turbopack` |
| Orchestrator | `python agents/orchestrator.py` |
| RAG MCP | `python agents/rag_mcp_server.py` |
| SQL MCP | `python agents/sql_mcp_server.py` |
| Forecast | `python agents/forecast_agent.py` |
| Site Selection | `python agents/site_selection_agent.py` |
| Expansion Feasibility | `python agents/expansion_feasibility_agent.py` |
| Market Researcher | `python agents/market_researcher_agent.py` |
| Risk Manager | `python agents/risk_manager_agent.py` |
| Strategic Planner | `python agents/strategic_planner_agent.py` |

### Sync RAG Knowledge Base

Click **"Sync to AI"** in the dashboard header, or:

```bash
curl -X POST http://localhost:3000/api/rag/embed
```

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# LLM
GOOGLE_API_KEY=
OPENAI_API_KEY=

# External APIs
GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
FOURSQUARE_API_KEY=

# Agent URLs (defaults shown)
ORCHESTRATOR_URL=http://localhost:9000
SITE_SELECTION_AGENT_URL=http://localhost:9020
EXPANSION_FEASIBILITY_AGENT_URL=http://localhost:9021
MARKET_RESEARCHER_AGENT_URL=http://localhost:9022
RISK_MANAGER_AGENT_URL=http://localhost:9023
STRATEGIC_PLANNER_AGENT_URL=http://localhost:9024
FORECAST_AGENT_URL=http://localhost:9025
```

---

## Database Schema (Supabase)

**`pos_orders`** — order totals per outlet  
**`pos_order_items`** — line items per order  
**`pos_orders_daily`** — daily aggregates with ML-predicted counts  
**`inventory_stock`** — current qty, threshold, status per item per outlet  
**`inventory_expiry`** — expiry dates and days remaining per item  
**`locations`** — outlet names and addresses  
**RAG table** — pgvector embeddings, queried via `match_rag_documents` RPC

Supported outlets: `outlet-1` (Mid Valley Food Court), `outlet-2` (Sunway Pyramid Kiosk), `outlet-3` (KLCC Food Corner)

---

## Submission

> **UM Hackathon 2026**
> Built and submitted by **Team SevenAteNine**
>
> Inventra was designed, developed, and deployed within the hackathon duration. Every agent, dashboard, and ML pipeline in this repository is original work produced by the team.
>
> [Watch our pitch](https://youtu.be/_m998zof9Lk)
