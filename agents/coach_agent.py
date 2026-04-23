"""
Coach Agent (ADK + A2A Protocol)

This agent provides personalized financial advice and budget tracking.
It exposes an A2A Protocol endpoint and can be called by the Orchestrator.
"""
import uvicorn
import os
import json
from datetime import datetime
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import List
from pymongo import MongoClient

load_dotenv()

# A2A Imports
from a2a.server.apps import A2AStarletteApplication
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import AgentCapabilities, AgentCard, AgentSkill
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.utils import new_agent_text_message

# ADK Imports
from google.adk.agents.llm_agent import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.memory.in_memory_memory_service import InMemoryMemoryService
from google.adk.artifacts import InMemoryArtifactService
from google.genai import types

# --- Data Models ---
class BreakdownItem(BaseModel):
    category: str
    amount: float
    percentage: float
    status: str

class FinancialPlanResponse(BaseModel):
    goalDescription: str
    planType: str
    monthlyIncome: float
    monthlyTargetedExpenses: float
    savingGoalEnd: float
    riskTolerance: str
    advice: str
    budgetBreakdown: List[BreakdownItem]

# --- Database Helper ---
def get_database():
    """Get MongoDB database connection"""
    uri = os.getenv("MONGODB_ATLAS_CLUSTER_URI")
    if not uri:
        # Fallback for dev if needed, or raise
        raise ValueError("MONGODB_ATLAS_CLUSTER_URI not found")
    client = MongoClient(uri)
    return client["financial_system"]

# --- Tools ---
def get_user_budget_limits() -> dict:
    """Get user's budget limits and spending caps for the current month/year."""
    try:
        db = get_database()
        now = datetime.now()
        month = now.month
        year = now.year

        # Fetch latest budget for current month/year
        budget_doc = db.monthly_budget.find_one({"month": month, "year": year})
        
        if not budget_doc:
            # Fallback if no budget set for this month
            return {
                "monthly_budget": 0,
                "spending_limits": {
                    "groceries": 0,
                    "entertainment": 0,
                    "travel": 0
                },
                "status": "No budget found for current month"
            }

        return {
            "monthly_budget": budget_doc.get("budget", 0),
            "spending_limits": budget_doc.get("category_limits", {
                "groceries": 0, "entertainment": 0, "travel": 0
            })
        }
    except Exception as e:
        return {"error": str(e)}

def check_spending_status() -> dict:
    """Check current spending status against budget for the current month."""
    try:
        db = get_database()
        now = datetime.now()
        start_date = datetime(now.year, now.month, 1)
        if now.month == 12:
            end_date = datetime(now.year + 1, 1, 1)
        else:
            end_date = datetime(now.year, now.month + 1, 1)

        # 1. Fetch Transactions for current month
        pipeline = [
            {
                "$match": {
                    "user_id": "demo_user", # Hardcoded to match frontend logic
                    "date": {"$gte": start_date, "$lt": end_date},
                    "type": "expense"
                }
            },
            {
                "$group": {
                    "_id": "$category",
                    "total": {"$sum": "$amount"}
                }
            }
        ]
        
        results = list(db.transactions.aggregate(pipeline))
        spending_map = {item["_id"].lower(): item["total"] for item in results} # lowercase keys

        # 2. Fetch Budget Limits
        budget_limits = get_user_budget_limits()
        if "error" in budget_limits:
            return {"error": budget_limits["error"]}
        
        limits = budget_limits.get("spending_limits", {})
        total_limit = budget_limits.get("monthly_budget", 0)

        # 3. Calculate Remaining
        # Normalize category names to lower case for comparison if needed
        # Assuming frontend saves as 'groceries', 'entertainment', 'travel' (lowercase keys in limits)
        # But transactions save as 'Groceries', 'Entertainment' (Title Case)
        
        # Map DB categories to limit keys
        # Standardize on lowercase for the response
        
        current_spending = {
            "groceries": spending_map.get("groceries", 0),
            "entertainment": spending_map.get("entertainment", 0),
            "travel": spending_map.get("travel", 0)
        }
        
        # Add any other categories found
        for cat, amt in spending_map.items():
            if cat not in current_spending:
                current_spending[cat] = amt

        remaining_budget = {}
        for cat, limit in limits.items():
            spent = current_spending.get(cat, 0)
            remaining_budget[cat] = max(0, limit - spent)

        total_spent = sum(spending_map.values())
        total_remaining = max(0, total_limit - total_spent)

        return {
            "current_spending": current_spending,
            "budget_limits": limits,
            "remaining_by_category": remaining_budget,
            "total_budget": total_limit,
            "total_spent": total_spent,
            "total_remaining": total_remaining
        }
    except Exception as e:
        return {"error": str(e)}

# --- Agent Class ---
class CoachAgent:
    def __init__(self):
        self._agent = self._build_agent()
        self._user_id = 'remote_agent'
        self._runner = Runner(
            app_name=self._agent.name,
            agent=self._agent,
            artifact_service=InMemoryArtifactService(),
            session_service=InMemorySessionService(),
            memory_service=InMemoryMemoryService(),
        )

    def _build_agent(self) -> LlmAgent:
        model_name = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
        
        return LlmAgent(
            model=model_name,
            name='coach_agent',
            description='Provides personalized financial coaching and budget tracking. Returns structured financial plans.',
            instruction="""
You are the FINANCIAL COACH AGENT.
Your job is to analyze the user's financial profile (income, expenses, goals, risk tolerance) and provide financial guidance.

You have TWO modes of operation based on the user's request:

MODE 1: SIMPLE ADVICE / CHATBOT
- Trigger: User asks a specific question like "Can I afford this coffee?", "Is buying a RM300 item good?", "I want to buy additional groceries for 300, is it fit?".
- Action:
  1. **CHECK CONTEXT FIRST**: If you already have the budget data from a previous turn or tool call, USE IT DIRECTLY. Do NOT call the tool again if you have the numbers.
  2. **IMMEDIATE TOOL CALL (If needed)**: If you DO NOT have the data, call `check_spending_status` and `get_user_budget_limits` immediately. Do NOT ask questions.
  3. **NO YAPPING**: If the data is missing, just say "Please set a budget first." If data exists, compare the item price to the `remaining_budget` for that category.
  4. **DIRECT ANSWER**:
     - IF (Remaining >= Price): "Yes, you have RM[Remaining] left in [Category]. It fits."
     - IF (Remaining < Price): "No, you only have RM[Remaining] left in [Category]. This exceeds your budget."
     - IF (No Category Match): Check "Total Remaining" and advise based on that.
  5. **FORMAT**: Simple text only. No JSON. No "Let me check...". Just the answer. Stop talking after the answer.

MODE 2: STRUCTURED FINANCIAL PLAN
- Trigger: User asks to "Create a financial plan", "Generate a plan", or provides a full profile (Income, Goal, etc.) matching the input structure below.
- Action: Analyze the data and return a STRICT JSON object matching the `FinancialPlanResponse` schema.

---------------------------------------------------------
MODE 2 OUTPUT SCHEMA (FinancialPlanResponse):
{
  "goalDescription": string,
  "planType": string,
  "monthlyIncome": number,
  "monthlyTargetedExpenses": number,
  "savingGoalEnd": number,
  "riskTolerance": string,
  "advice": "Your detailed, personalized advice here...",
  "budgetBreakdown": [
    {
      "category": "Housing",
      "amount": number,
      "percentage": number,
      "status": "On Track" | "Warning" | "Over Budget"
    },
    ...
  ]
}

Logic for Mode 2:
1. Use the provided Income/Expense numbers to calculate disposable income.
2. Generate a reasonable budget breakdown based on standard ratios (e.g., 50/30/20 rule).
3. Compare against the user's Goal (savingGoalEnd).
4. Provide actionable `advice` in the JSON field.
5. **IMPORTANT**: If the User did NOT provide their Income/Expenses, you MUST call `get_user_budget_limits` to fetch their saved budget instead of asking for it. Use the database value for `monthlyIncome` in the JSON.

Example Request (Mode 2):
"Goal: Buy Car, Plan medium, Income 5000, Expenses 2000, Goal Amount 10000, Risk Low"

Example Response (Mode 2):
{
  "goalDescription": "Buy Car",
  "planType": "medium",
  "monthlyIncome": 5000,
  "monthlyTargetedExpenses": 2000,
  "savingGoalEnd": 10000,
  "riskTolerance": "Low",
  "advice": "With RM3000 in disposable income...",
  "budgetBreakdown": [...]
}
            """,
            tools=[get_user_budget_limits, check_spending_status],
        )

    async def invoke(self, query: str, session_id: str) -> str:
        # Standard ADK invocation pattern
        session = await self._runner.session_service.get_session(
            app_name=self._agent.name, user_id=self._user_id, session_id=session_id
        )
        content = types.Content(role='user', parts=[types.Part.from_text(text=query)])
        
        if not session:
             session = await self._runner.session_service.create_session(
                app_name=self._agent.name, user_id=self._user_id, state={}, session_id=session_id
            )

        response_text = ''
        async for event in self._runner.run_async(user_id=self._user_id, session_id=session.id, new_message=content):
            if event.is_final_response() and event.content:
                response_text = getattr(event.content.parts[0], 'text', '')
                break
        
        # Clean Markdown if present (optional but good practice)
        content_str = response_text.strip()
            
        return content_str

# --- Server Setup ---
port = int(os.getenv("COACH_PORT", 9007))

skill = AgentSkill(
    id='coach_agent',
    name='Financial Coach',
    description='Analyzes spending and gives budget advice',
    tags=['finance', 'budget', 'coaching'],
    examples=['How is my budget looking?', 'Can I afford a trip?'],
)

public_agent_card = AgentCard(
    name='Coach Agent',
    description='Personal finance coach and budget tracker.',
    url=f'http://localhost:{port}/',
    version='1.0.0',
    defaultInputModes=['text'],
    defaultOutputModes=['text'],
    capabilities=AgentCapabilities(streaming=True),
    skills=[skill]
)

class CoachExecutor(AgentExecutor):
    def __init__(self):
        self.agent = CoachAgent()
    
    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        result = await self.agent.invoke(context.get_user_input(), getattr(context, 'context_id', 'default'))
        await event_queue.enqueue_event(new_agent_text_message(result))

    async def cancel(self, context, event_queue): pass

def main():
    server = A2AStarletteApplication(
        agent_card=public_agent_card,
        http_handler=DefaultRequestHandler(CoachExecutor(), InMemoryTaskStore()),
        extended_agent_card=public_agent_card,
    )
    print(f"Starting Coach Agent on port {port}")
    uvicorn.run(server.build(), host='0.0.0.0', port=port)

if __name__ == '__main__':
    main()
