"""
Financial Planner Agent (ADK + A2A Protocol)

This agent synthesizes data from Feasibility, Investment, and Product agents into a Master Financial Plan.
It exposes an A2A Protocol endpoint and can be called by the Orchestrator.
"""
import uvicorn
import os
import json
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from typing import List, Optional

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
class Milestone(BaseModel):
    month: int
    saved_amount: float
    description: str

class MasterFinancialPlan(BaseModel):
    plan_title: str
    goal: str
    target_amount: float
    monthly_contribution: float
    months_to_goal: int
    feasibility: str = Field(..., description="High, Medium, or Low")
    milestones: List[Milestone]
    recommendation: str

# --- Agent Class ---
class FinancialPlannerAgent:
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
            name='financial_planner_agent',
            description='Synthesizes financial data, product costs, and advice into a master plan.',
            instruction="""


You are the FINANCIAL PLANNER AGENT.
Your job is to synthesize inputs from multiple sources into a COHESIVE MASTER PLAN.

CRITICAL CONSTRAINTS:
1. You have NO TOOLS (e.g., you cannot use `send_message_to_a2a_agent` or `google_search`).
2. Do NOT attempt to call any tools.
3. If information is missing, use reasonable estimates or placeholders, but do NOT ask for it.
4. Your ONLY output must be the specific JSON format below.

INPUTS you will receive:
1. **Financial Metrics** (from Feasibility Agent): Income, Expenses, Free Cashflow, Gap, Savings Rate.
2. **Investment Strategy** (from Investment Agent): Recommended portfolio allocation and vehicles.
3. **Product/Goal Cost** (from Prod Research Agent): Exact price of the target item (if applicable).
4. **User Goal**: The specific objective from the form.

OUTPUT:
Generate a structured JSON `MasterFinancialPlan`.

Logic:
1. Calculate `monthly_contribution`: Typically (Income - Expenses) * 0.5 (conservative) to 0.8 (aggressive).
2. Calculate `months_to_goal`: Product Cost / Monthly Contribution.
3. Determine `feasibility`:
   - < 3 months = High
   - 3-12 months = Medium
   - > 12 months = Low (or requires adjustment)
4. Generate `milestones`: 3-5 key checkpoints (e.g. "Month 1: Save $X").

Return ONLY valid JSON matching this schema:
{
  "plan_title": "Plan for iPhone 15",
  "goal": "Buy iPhone 15",
  "target_amount": 999.00,
  "monthly_contribution": 200.00,
  "months_to_goal": 5,
  "feasibility": "High",
  "milestones": [
    { "month": 1, "saved_amount": 200, "description": "Start saving" },
    { "month": 5, "saved_amount": 1000, "description": "Goal Reached!" }
  ],
  "recommendation": "You can afford this easily by saving $200/mo."
}
            """,
            tools=[],
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
            if event.is_final_response():
                if event.content and event.content.parts and event.content.parts[0].text:
                    response_text = '\n'.join([p.text for p in event.content.parts if p.text])
                break
        
        # Clean JSON
        content_str = response_text.strip()
        if "```json" in content_str:
            content_str = content_str.split("```json")[1].split("```")[0].strip()
        elif "```" in content_str:
            content_str = content_str.split("```")[1].split("```")[0].strip()
            
        try:
            structured_data = json.loads(content_str)
            validated_plan = MasterFinancialPlan(**structured_data)
            # Re-serialize to ensure strict JSON format
            return json.dumps(validated_plan.model_dump(), indent=2)
        except Exception as e:
            return json.dumps({
                "error": f"Validation failed: {str(e)}",
                "raw": content_str
            })

# --- Server Setup ---
port = int(os.getenv("PLANNER_PORT", 9009))

skill = AgentSkill(
    id='financial_planner_agent',
    name='Financial Planner',
    description='Creates master financial plans',
    tags=['finance', 'planning', 'synthesis'],
    examples=['Create a master plan for buying an iPhone'],
)

public_agent_card = AgentCard(
    name='Financial Planner Agent',
    description='Synthesizes financial data into a master plan.',
    url=f'http://localhost:{port}/',
    version='1.0.0',
    capabilities=AgentCapabilities(streaming=True),
    defaultInputModes=['text'],
    defaultOutputModes=['text'],
    skills=[skill],
    supportsAuthenticatedExtendedCard=False,
)

class PlannerExecutor(AgentExecutor):
    def __init__(self):
        self.agent = FinancialPlannerAgent()
    
    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        result = await self.agent.invoke(context.get_user_input(), getattr(context, 'context_id', 'default'))
        await event_queue.enqueue_event(new_agent_text_message(result))

    async def cancel(self, context, event_queue): pass

def main():
    server = A2AStarletteApplication(
        agent_card=public_agent_card,
        http_handler=DefaultRequestHandler(PlannerExecutor(), InMemoryTaskStore()),
        extended_agent_card=public_agent_card,
    )
    print(f"Starting Financial Planner Agent on port {port}")
    uvicorn.run(server.build(), host='0.0.0.0', port=port)

if __name__ == '__main__':
    main()
