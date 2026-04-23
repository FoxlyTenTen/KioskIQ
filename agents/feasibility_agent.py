"""
Feasibility Checker Agent (ADK + A2A Protocol)

This agent deterministically calculates financial metrics (Gap, Savings Rate) based on inputs.
It exposes an A2A Protocol endpoint and can be called by the Orchestrator.
"""
import uvicorn
import os
import json
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from typing import Optional

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

class FeasibilityResponse(BaseModel):
    monthlyIncome: float
    monthlyTargetedExpenses: float
    freeCashflow: float
    savingGoalEnd: float
    months: int
    requiredMonthlySaving: float
    gap: float
    savingsRate: Optional[float]
    status: str 
    feedback_message: str

class FeasibilityAgent:
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
            name='feasibility_agent',
            description='Calculates financial feasibility deterministically.',
            instruction="""


You are the FEASIBILITY CHECKER AGENT.
Your job is to CALCULATE financial metrics based on user inputs.

INPUTS:
- monthlyIncome
- monthlyTargetedExpenses
- savingGoalEnd
- planType ("short", "medium", "long")

LOGIC (Pythonic):
1. **Months Mapping**:
   - "short" -> 6 months
   - "medium" -> 12 months
   - "long" -> 24 months
   - Default -> 12 months

2. **Calculations**:
   - `freeCashflow` = monthlyIncome - monthlyTargetedExpenses
   - `requiredMonthlySaving` = (savingGoalEnd / months) (Help: Handle 0 division, though months > 0).
   - `gap` = freeCashflow - requiredMonthlySaving
   - `savingsRate` = requiredMonthlySaving / monthlyIncome
     - If monthlyIncome <= 0, `savingsRate` = null.

3. **Status Determination**:
   - If `gap` >= 0: "feasible"
   - If `gap` < 0 AND `gap` > -200: "challenging"
   - If `gap` <= -200: "unrealistic"

4. **Feedback Message**:
   - Generate a 1-sentence observation based on the gap. e.g. "You have a surplus of $X." or "You are short by $Y."

OUTPUT:
Return strict JSON matching `FeasibilityResponse`:
{
  "monthlyIncome": number,
  "monthlyTargetedExpenses": number,
  "freeCashflow": number,
  "savingGoalEnd": number,
  "months": integer,
  "requiredMonthlySaving": number,
  "gap": number,
  "savingsRate": number | null,
  "status": string,
  "feedback_message": string
}
            """,
            tools=[],
        )

    async def invoke(self, query: str, session_id: str) -> str:
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
        
        content_str = response_text.strip()
        if "```json" in content_str:
            content_str = content_str.split("```json")[1].split("```")[0].strip()
        elif "```" in content_str:
            content_str = content_str.split("```")[1].split("```")[0].strip()
            
        try:
            structured_data = json.loads(content_str)
            validated_response = FeasibilityResponse(**structured_data)
            return json.dumps(validated_response.model_dump(), indent=2)
        except Exception as e:
            return json.dumps({
                "error": f"Validation failed: {str(e)}",
                "raw": content_str
            })

# --- Server Setup ---
port = int(os.getenv("FEASIBILITY_PORT", 9011))

skill = AgentSkill(
    id='feasibility_agent',
    name='Feasibility Checker',
    description='Checks financial plan feasibility',
    tags=['finance', 'calculator', 'feasibility'],
    examples=['Check if I can afford iPhone'],
)

public_agent_card = AgentCard(
    name='Feasibility Agent',
    description='Calculates financial feasibility.',
    url=f'http://localhost:{port}/',
    version='1.0.0',
    capabilities=AgentCapabilities(streaming=True),
    defaultInputModes=['text'],
    defaultOutputModes=['text'],
    skills=[skill],
    supportsAuthenticatedExtendedCard=False,
)

class FeasibilityExecutor(AgentExecutor):
    def __init__(self):
        self.agent = FeasibilityAgent()
    
    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        result = await self.agent.invoke(context.get_user_input(), getattr(context, 'context_id', 'default'))
        await event_queue.enqueue_event(new_agent_text_message(result))

    async def cancel(self, context, event_queue): pass

def main():
    server = A2AStarletteApplication(
        agent_card=public_agent_card,
        http_handler=DefaultRequestHandler(FeasibilityExecutor(), InMemoryTaskStore()),
        extended_agent_card=public_agent_card,
    )
    print(f"Starting Feasibility Agent on port {port}")
    uvicorn.run(server.build(), host='0.0.0.0', port=port)

if __name__ == '__main__':
    main()
