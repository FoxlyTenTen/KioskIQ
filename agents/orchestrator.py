"""
Fast Orchestrator Agent (ADK + AG-UI Protocol)
Using ILMU GLM-5.1 through Anthropic-compatible endpoint.

This version is optimized for speed:
- shorter system prompt
- streaming enabled
- lower retry count
- Anthropic-compatible ILMU endpoint
- less token bloat
"""

from __future__ import annotations

import os
from datetime import datetime

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI

from ag_ui_adk import ADKAgent, add_adk_fastapi_endpoint
from google.adk.agents import LlmAgent
from google.adk.apps import App
from google.adk.models.lite_llm import LiteLlm
from google.adk.plugins import ReflectAndRetryToolPlugin
from google.adk.tools.mcp_tool.mcp_toolset import McpToolset, SseConnectionParams


load_dotenv()

# Makes the UI feel faster because output can stream progressively
os.environ["GOOGLE_ADK_PROGRESSIVE_SSE_STREAMING"] = "1"

ILMU_API_KEY = os.getenv("ILMU_API_KEY")
ILMU_MODEL = os.getenv("ILMU_MODEL", "ilmu-glm-5.1")

if not ILMU_API_KEY:
    raise ValueError("Missing ILMU_API_KEY in .env file")

# ILMU Anthropic-compatible endpoint
os.environ["ANTHROPIC_API_KEY"] = ILMU_API_KEY
os.environ["ANTHROPIC_BASE_URL"] = os.getenv(
    "ANTHROPIC_BASE_URL",
    "https://api.ilmu.ai/anthropic"
)

current_date = datetime.now().strftime("%Y-%m-%d")


ORCHESTRATOR_INSTRUCTION = f"""
You are KioskIQ's Operations Orchestrator for F&B kiosk owners in Malaysian malls.

Current date: {current_date}

## Tools available

### SQL Tools (EXACT numbers — always use for math)
- get_revenue_summary      → total revenue, order count, avg order value per outlet/date
- get_stock_summary        → exact item quantities, critical/warning/ok counts
- get_expiry_summary       → items expiring soon with exact days remaining
- get_top_menu_items       → ranked menu items by units sold and revenue
- get_orders_trend         → actual vs predicted orders over last N days

### RAG Tool (CONTEXT only — never use for numbers)
- search_business_context  → AI insights, narrative overview, general business context

### A2A Agents (financial planning workflows)
- Coach Agent: budget advice, spending analysis
- Database Agent: add/list/delete transactions
- Product Research Agent: real-time product price search
- Investment Agent: investment strategy and portfolio
- Feasibility Agent: affordability, savings gap
- Financial Planner Agent: financial roadmap
- Summary Agent: dashboard summary

---

## Routing rules

### Rule 1 — Any question involving a NUMBER → use SQL tools
Examples: revenue, total sales, how many orders, which outlet made more, average order value,
how many items are critical, days until expiry, top selling items, trend data.

Workflow:
- Call the matching SQL tool (choose based on what data is needed)
- You may call multiple SQL tools in parallel if the question spans revenue + stock
- Present results clearly with RM amounts and exact counts
- Do NOT call search_business_context for these questions

### Rule 2 — General overview / "how is the business?" → use RAG then summarise
Examples: "give me a business overview", "any AI recommendations?", "what should I focus on?"

Workflow:
- Call search_business_context with the user's question
- Summarise the retrieved insights in plain language
- If the overview also needs exact figures, call the SQL tool first, then RAG for context

### Rule 3 — Deep financial plan
Trigger: "financial plan", "budget plan", "savings roadmap", "can I afford X"

Workflow: gather_financial_planning_details → Summary → Feasibility → Investment →
(Product Research if price needed) → Financial Planner

### Rule 4 — Quick product / buying advice
Examples: "price of iPhone", "should I buy this for RM200"

Workflow: Product Research (if no price given) → Coach Agent

### Rule 5 — Transactions
Examples: "I spent RM50", "add income", "show my expenses"

Workflow:
- Add: gather_transaction_details → Database Agent
- View: Database Agent

---

## Response rules
- Always quote exact RM amounts from SQL tool results — never estimate or round
- Keep responses concise and action-oriented for busy kiosk operators
- Do not explain internal tool routing to the user
- Do not repeat the same tool call twice for the same data
- If independent SQL calls are needed, run them in parallel
"""


RAG_MCP_URL = os.getenv("RAG_MCP_URL", "http://localhost:9013/sse")
SQL_MCP_URL = os.getenv("SQL_MCP_URL", "http://localhost:9014/sse")

rag_toolset = McpToolset(
    connection_params=SseConnectionParams(url=RAG_MCP_URL)
)

sql_toolset = McpToolset(
    connection_params=SseConnectionParams(url=SQL_MCP_URL)
)

orchestrator_agent = LlmAgent(
    name="OrchestratorAgent",
    model=LiteLlm(model=f"anthropic/{ILMU_MODEL}"),
    tools=[sql_toolset, rag_toolset],
    instruction=ORCHESTRATOR_INSTRUCTION,
)

orchestrator_app = App(
    name="orchestrator_app",
    root_agent=orchestrator_agent,
    plugins=[
        # Faster than 3 retries. Use plugins=[] if you want maximum speed.
        ReflectAndRetryToolPlugin(max_retries=1),
    ],
)

adk_orchestrator_agent = ADKAgent.from_app(
    app=orchestrator_app,
    user_id="demo_user",
    session_timeout_seconds=3600,
    use_in_memory_services=True,
)

app = FastAPI(title="Fast Financial Planning Orchestrator")
add_adk_fastapi_endpoint(app, adk_orchestrator_agent, path="/")


if __name__ == "__main__":
    port = int(os.getenv("ORCHESTRATOR_PORT", 9000))

    print(f"Starting Fast Orchestrator Agent on http://0.0.0.0:{port}")
    print(f"Using model: {ILMU_MODEL}")
    print(f"Using Anthropic base URL: {os.environ['ANTHROPIC_BASE_URL']}")

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="warning",
    )