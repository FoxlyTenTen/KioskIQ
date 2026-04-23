"""
Investment Strategy Agent (ADK + A2A Protocol)

This agent recommends investment strategies and portfolios based on user profile and surplus income.
It exposes an A2A Protocol endpoint and can be called by the Orchestrator.
"""
import uvicorn
import os
import json
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import List, Dict

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
from google.adk.tools import google_search

class InvestmentStrategyResponse(BaseModel):
    strategyName: str
    riskLevel: str
    allocation: Dict[str, int] # e.g. {"Stocks": 60, "Bonds": 40}
    recommendedVehicles: List[str]
    expectedReturn: str
    rationale: str

class InvestmentAgent:
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
            name='investment_agent',
            description='Generates investment strategies based on user profile.',
            instruction="""


You are the INVESTMENT STRATEGY AGENT.
Your task is to recommend the best investment strategies based on the user's financial profile, SPECIFICALLY tailored to their remaining salary (surplus).

INPUTS (Context from previous agents):
- riskTolerance (Conservative, Moderate, Aggressive)
- planType (short, medium, long)
- savingGoalEnd (Target amount)
- monthlyIncome
- **SURPLUS**: (Disposable income calculated by Feasibility Agent)

LOGIC GUIDELINES:
1. **Analyze Surplus**: You MUST use the "Surplus" value to determine realistic investment vehicles.
2. **News-Based Research**: Use `google_search` to find the **TOP 3 Investment Strategies** currently trending or recommended in the news for the user's situation/region (Malaysia/Global).
   - Search query examples: "best investment strategy for RM[SURPLUS] monthly Malaysia 2025", "Public Gold Malaysia GAP price trend 2025", "ASB dividend 2025 vs FD rates", "best robo advisor Malaysia 2025 performance".
   - **Real-World Malaysian Examples**: Look for specific opportunities like **"Public Gold (Gold Accumulation Program)"**, **"ASB (Amanah Saham Bumiputera)"**, **"Tabung Haji"**, **"Wahed Invest/StashAway"**, or specific high-interest digital banks (e.g., **"GXBank", "Aeon Bank"**).
3. **Selection & Recommendation**:
   - Identify the top 3 performed strategies/products found in the news.
   - Select the BEST one to feature as the main strategy (strategyName), but **MUST describe the other 2 alternatives** in the `rationale` section so the user can see top 3 options.
4. **Time Horizon Dominance**:
   - Short (< 1 yr): Safety first (FDs, Money Market).
   - Medium (1-3 yrs): Balanced (Bonds, Blue Chips).
   - Long (3+ yrs): Growth (index funds, ETFs).

OUTPUT:
Return strict JSON matching `InvestmentStrategyResponse`.
{
  "strategyName": string, // Name of the BEST strategy found (e.g., "Diversified Growth ETF Portfolio")
  "riskLevel": string,
  "allocation": { "Asset Class": percentage_int, ... },
  "recommendedVehicles": [string, ...], // List specific products for this strategy AND mentions of 2 alternatives found.
  "expectedReturn": string (e.g. "5-7% APY"),
  "rationale": string // Concise, bullet-pointed explanation. Key points only. NO essays. Format: "- **Option 1**: [Name] - [Why good]. - **Option 2**..."
}
            """,
            tools=[google_search],
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
            
        return content_str

# --- Server Setup ---
port = int(os.getenv("INVESTMENT_PORT", 9012))

skill = AgentSkill(
    id='investment_agent',
    name='Investment Agent',
    description='Recommends investment portfolios',
    tags=['finance', 'investment', 'portfolio'],
    examples=['Where should I invest for a house?'],
)

public_agent_card = AgentCard(
    name='Investment Agent',
    description='Recommends investment strategies.',
    url=f'http://localhost:{port}/',
    version='1.0.0',
    capabilities=AgentCapabilities(streaming=True),
    defaultInputModes=['text'],
    defaultOutputModes=['text'],
    skills=[skill],
    supportsAuthenticatedExtendedCard=False,
)

class InvestmentExecutor(AgentExecutor):
    def __init__(self):
        self.agent = InvestmentAgent()
    
    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        result = await self.agent.invoke(context.get_user_input(), getattr(context, 'context_id', 'default'))
        await event_queue.enqueue_event(new_agent_text_message(result))

    async def cancel(self, context, event_queue): pass

def main():
    server = A2AStarletteApplication(
        agent_card=public_agent_card,
        http_handler=DefaultRequestHandler(InvestmentExecutor(), InMemoryTaskStore()),
        extended_agent_card=public_agent_card,
    )
    print(f"Starting Investment Agent on port {port}")
    uvicorn.run(server.build(), host='0.0.0.0', port=port)

if __name__ == '__main__':
    main()
