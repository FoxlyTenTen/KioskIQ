"""
Fast Orchestrator Agent (ADK + AG-UI Protocol)
Using ILMU GLM-5.1 through Anthropic-compatible endpoint.
"""

from __future__ import annotations

import os
import sys
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
from google.adk.tools.mcp_tool import mcp_session_manager as _msm


load_dotenv()

# ── Patch MCP cleanup to catch BaseException (anyio cancel scope raises
#    BaseException, not Exception, so it bypasses ADK's except-Exception blocks
#    and crashes the ASGI handler).
_orig_session_close = _msm.MCPSessionManager.close

async def _safe_session_close(self):
    async with self._session_lock:
        for session_key in list(self._sessions.keys()):
            _, exit_stack = self._sessions[session_key]
            try:
                await exit_stack.aclose()
            except BaseException as e:
                print(
                    f"Warning: Error during MCP session cleanup for {session_key}: {e}",
                    file=self._errlog,
                )
            finally:
                del self._sessions[session_key]

_msm.MCPSessionManager.close = _safe_session_close
# ── End patch ──────────────────────────────────────────────────────────────────


os.environ["GOOGLE_ADK_PROGRESSIVE_SSE_STREAMING"] = "1"

ILMU_API_KEY = os.getenv("ILMU_API_KEY")
ILMU_MODEL = os.getenv("ILMU_MODEL", "ilmu-glm-5.1")

if not ILMU_API_KEY:
    raise ValueError("Missing ILMU_API_KEY in .env file")

os.environ["ANTHROPIC_API_KEY"] = ILMU_API_KEY
os.environ["ANTHROPIC_BASE_URL"] = os.getenv(
    "ANTHROPIC_BASE_URL",
    "https://api.ilmu.ai/anthropic"
)

current_date = datetime.now().strftime("%Y-%m-%d")

ORCHESTRATOR_INSTRUCTION = f"""
You are KioskIQ's Operations Orchestrator for F&B kiosk owners in Malaysian malls.

Current date: {current_date}

============================================================
STEP 1 — READ THE USER'S INTENT BEFORE TOUCHING ANY TOOL
============================================================

Classify the message into ONE of these 4 categories:

A) FINANCIAL / PERSONAL — anything about personal money, savings, budget, income,
   expenses, financial plan, investment, transactions, product price, "can I afford",
   "I spent", "add income", "my salary", "my goal".

B) KIOSK NUMBERS — anything about the kiosk business data: revenue, orders, stock
   quantities, expiry dates, top menu items, outlet comparison, sales trend.

C) KIOSK OVERVIEW — general questions: "how is the business?", "any insights?",
   "what should I focus on?", AI recommendations.

D) OTHER — greetings, unclear questions.

============================================================
STEP 2 — ROUTE BASED ON CATEGORY. NEVER MIX CATEGORIES.
============================================================

--- CATEGORY A: FINANCIAL / PERSONAL ---
NEVER call RAG or SQL tools for these. ALWAYS use agents only.

A1. Deep financial plan
    Trigger words: "financial plan", "savings plan", "budget plan", "roadmap",
    "plan my finances", "help me save", "I want to save for"
    Workflow:
      1. gather_financial_planning_details  ← show the form first, wait for submission
      2. Summary Agent
      3. Feasibility Agent
      4. Investment Agent
      5. Product Research Agent (only if a specific product is mentioned)
      6. Financial Planner Agent

A2. Quick buying / product advice
    Trigger: "price of X", "should I buy", "can I afford", "cheapest", "find me"
    Workflow: Product Research Agent → Coach Agent

A3. Transactions
    Trigger: "I spent", "add expense", "add income", "show my expenses", "list transactions"
    Workflow:
      - Add: gather_transaction_details → Database Agent
      - View: Database Agent

A4. Budget / spending advice only
    Trigger: "am I overspending?", "review my budget", "spending analysis"
    Workflow: Coach Agent

--- CATEGORY B: KIOSK NUMBERS ---
NEVER call RAG or agents for these. ALWAYS use SQL tools only.

Examples: revenue, total sales, order count, stock qty, expiry countdown, top menu items,
outlet comparison, orders trend, average order value.

Workflow:
- Call the matching SQL tool(s). Run in parallel if multiple data types needed.
- get_revenue_summary   → revenue, order count, avg order value
- get_stock_summary     → stock quantities, critical/warning/ok counts
- get_expiry_summary    → items expiring soon
- get_top_menu_items    → best-selling menu items
- get_orders_trend      → daily orders trend vs prediction
- Always quote exact RM amounts. Never estimate.

--- CATEGORY C: KIOSK OVERVIEW ---
Use RAG only. Never use SQL or agents.

Workflow:
- Call search_business_context
- Summarise insights in plain language for a busy kiosk owner
- If the answer also needs exact numbers, fetch with SQL first, then RAG for context

--- CATEGORY E: BUSINESS LOCATION EXPANSION ---
Keywords: "expand", "new location", "open another outlet", "site selection",
          "new kiosk", "second outlet", "third outlet", "want to expand",
          "expand my business", "open new branch"

Workflow:
1. gather_expansion_details  ← show the expansion form first, wait for submission
2. After form is submitted, call Site Selection Expert Agent with the submitted data
   (include targetArea, lat, lng, budgetRange, businessType in the message to the agent)
3. The agent returns 3 location options — call display_site_selection_options to show them
4. Wait for user to select a location (HITL respond)
5. Confirm the selection and ask if they want to proceed to financial analysis

NEVER use RAG or SQL tools for expansion requests.

--- CATEGORY D: OTHER ---
- Answer directly. No tools needed.

============================================================
STEP 3 — RESPONSE RULES
============================================================
- Never explain your routing logic to the user
- Never call a tool from the wrong category
- Never answer financial questions using RAG or SQL tools
- Never answer kiosk stock/revenue questions using agents
- Keep answers short and action-oriented
"""

RAG_MCP_URL = os.getenv("RAG_MCP_URL", "http://localhost:9013/sse")
SQL_MCP_URL = os.getenv("SQL_MCP_URL", "http://localhost:9014/sse")

rag_toolset = McpToolset(connection_params=SseConnectionParams(url=RAG_MCP_URL))
sql_toolset = McpToolset(connection_params=SseConnectionParams(url=SQL_MCP_URL))

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
        timeout_keep_alive=120,
    )
