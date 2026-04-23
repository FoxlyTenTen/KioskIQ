"""
Summary Plan Agent (ADK + A2A Protocol)

This agent sends a dashboard summary of the user's financial inputs to the UI.
It exposes an A2A Protocol endpoint and can be called by the Orchestrator.
"""
import uvicorn
import os
import json
from datetime import datetime
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from typing import List

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
class SummaryPlanResponse(BaseModel):
    goalDescription: str
    planType: str
    monthlyIncome: float
    monthlyTargetedExpenses: float
    savingGoalEnd: float
    riskTolerance: str
    dashboard_message: str
    timestamp: str

# --- Agent Class ---
class SummaryAgent:
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
            name='summary_agent',
            description='Creates a summary dashboard of the user\'s financial input.',
            instruction="""
You are the SUMMARY AGENT.
Your job is to receive financial planning data from the user and generate a SUMMARY DASHBOARD JSON.
This acts as a confirmation receipt before the complex planning begins.

INPUT:
- Goal Description
- Plan Type
- Monthly Income
- Monthly Targeted Expenses
- Saving Goal End Amount
- Risk Tolerance

OUTPUT:
Return a VALID JSON object matching `SummaryPlanResponse`.
- `dashboard_message`: A short, encouraging message confirming receipt (e.g., "Data received. Initializing financial analysis for [Goal]...").
- `timestamp`: Current time (formatted nicely).
- Echo back all input fields.

Schema:
{
  "goalDescription": string,
  "planType": string,
  "monthlyIncome": number,
  "monthlyTargetedExpenses": number,
  "savingGoalEnd": number,
  "riskTolerance": string,
  "dashboard_message": string,
  "timestamp": string
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
            # Inject timestamp if model missed it, or just validate
            data = json.loads(content_str)
            if 'timestamp' not in data:
                data['timestamp'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            validated = SummaryPlanResponse(**data)
            return json.dumps(validated.model_dump(), indent=2)
        except Exception as e:
            return json.dumps({
                "error": f"Validation failed: {str(e)}",
                "raw": content_str
            })

# --- Server Setup ---
port = int(os.getenv("SUMMARY_PORT", 9010))

skill = AgentSkill(
    id='summary_agent',
    name='Summary Agent',
    description='Displays financial input summary',
    tags=['finance', 'dashboard', 'summary'],
    examples=['Show summary of my car plan'],
)

public_agent_card = AgentCard(
    name='Summary Agent',
    description='Displays summary of financial inputs.',
    url=f'http://localhost:{port}/',
    version='1.0.0',
    capabilities=AgentCapabilities(streaming=True),
    defaultInputModes=['text'],
    defaultOutputModes=['text'],
    skills=[skill],
    supportsAuthenticatedExtendedCard=False,
)

class SummaryExecutor(AgentExecutor):
    def __init__(self):
        self.agent = SummaryAgent()
    
    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        result = await self.agent.invoke(context.get_user_input(), getattr(context, 'context_id', 'default'))
        await event_queue.enqueue_event(new_agent_text_message(result))

    async def cancel(self, context, event_queue): pass

def main():
    server = A2AStarletteApplication(
        agent_card=public_agent_card,
        http_handler=DefaultRequestHandler(SummaryExecutor(), InMemoryTaskStore()),
        extended_agent_card=public_agent_card,
    )
    print(f"Starting Summary Agent on port {port}")
    uvicorn.run(server.build(), host='0.0.0.0', port=port)

if __name__ == '__main__':
    main()
