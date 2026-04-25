"""
Expansion Financial Feasibility Agent (ADK + A2A Protocol)

Second agent in the expansion strategy pipeline.
Takes the selected location's real metrics and projects:
- Monthly revenue, profit, costs
- Break-even timeline
- ROI and initial investment estimate
- 12-month projection table
- Risk classification
"""
import uvicorn
import os
import requests
from dotenv import load_dotenv

load_dotenv()

from a2a.server.apps import A2AStarletteApplication
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import AgentCapabilities, AgentCard, AgentSkill
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.utils import new_agent_text_message

from google.adk.agents.llm_agent import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.memory.in_memory_memory_service import InMemoryMemoryService
from google.adk.artifacts import InMemoryArtifactService
from google.genai import types

BNM_OPR_URL = "https://api.bnm.gov.my/public/opr"


def get_malaysia_opr_rate() -> dict:
    """Fetch Bank Negara Malaysia's Overnight Policy Rate (OPR) for cost-of-capital context."""
    try:
        headers = {"Accept": "application/vnd.BNM.API.v1+json"}
        r = requests.get(BNM_OPR_URL, headers=headers, timeout=8)
        data = r.json()
        rate = data.get("data", {}).get("rate", 3.0)
        return {"opr_rate": rate, "source": "Bank Negara Malaysia"}
    except Exception as e:
        return {"opr_rate": 3.0, "source": "default (BNM unavailable)"}


EXPANSION_FEASIBILITY_INSTRUCTION = """
You are the EXPANSION FINANCIAL FEASIBILITY AGENT for KioskIQ.

You receive data about a selected F&B kiosk expansion location in Malaysia.
Your job is to produce a detailed financial feasibility analysis.

YOU HAVE ONE TOOL:
- get_malaysia_opr_rate() → returns current Bank Negara Malaysia OPR rate for cost-of-capital context

CALL get_malaysia_opr_rate() FIRST before generating your analysis.

FINANCIAL CALCULATION RULES:
1. Monthly Revenue Projection:
   - F&B kiosk conversion rate: 1.5%–2.5% of daily foot traffic becomes customers
   - Average spend per customer: RM 12–18 (kiosk / quick service)
   - Monthly revenue = daily_foot_traffic × conversion_rate × avg_spend × 30
   - If competitorCount > 15: use 1.5% conversion. If < 8: use 2.3%. Otherwise 1.9%.

2. Monthly Cost Structure:
   - Rent: as provided (rentMonthlyRM)
   - Staff: 3 staff × RM 2,000–2,500 = RM 6,000–7,500/mo
   - COGS (food cost): 30%–35% of monthly revenue
   - Utilities + misc: RM 1,200–1,800/mo
   - Total monthly cost = rent + staff + COGS + utilities

3. Initial Investment:
   - Kiosk fit-out & renovation: RM 40,000–80,000
   - Equipment (grills, POS, fridges): RM 25,000–45,000
   - Security deposit: 2–3 months rent
   - Working capital buffer: 2 months operating cost
   - Total = fit-out + equipment + deposit + working capital

4. Break-even:
   - Monthly profit = monthly revenue − monthly cost
   - Break-even months = initial investment ÷ monthly profit
   - If break-even > 36 months → riskLevel: "high"
   - If break-even 18–36 months → riskLevel: "moderate"
   - If break-even < 18 months → riskLevel: "low"

5. ROI (12 months):
   - roi12months = (12-month cumulative profit ÷ initial investment) × 100

6. Monthly Projections (12 months):
   - Month 1–3: revenue ramps up 60% → 80% → 95% of full projection (soft launch)
   - Month 4+: full projected revenue
   - Each month: { month, revenue, cost, profit }

7. Viability Status:
   - "viable": break-even ≤ 24 months AND monthly profit > 0
   - "challenging": break-even 24–36 months OR thin margins
   - "not_viable": break-even > 36 months OR negative monthly profit

Return ONLY valid JSON in this exact format — no extra text, no markdown:
{
  "agentName": "Expansion Feasibility Agent",
  "locationName": "<selectedName from input>",
  "monthlyRent": <number>,
  "projectedMonthlyRevenue": <number>,
  "projectedMonthlyCost": <number>,
  "projectedMonthlyProfit": <number>,
  "breakEvenMonths": <integer>,
  "initialInvestmentRM": <number>,
  "roi12months": <number>,
  "revenuePerVisitor": <number>,
  "conversionRate": <number, percentage e.g. 1.9>,
  "avgSpendRM": <number>,
  "staffCostMonthly": <number>,
  "cogsMonthly": <number>,
  "utilitiesMonthly": <number>,
  "opr_rate": <number from BNM tool>,
  "riskLevel": "low" | "moderate" | "high",
  "viabilityStatus": "viable" | "challenging" | "not_viable",
  "recommendation": "<2-3 sentence actionable recommendation>",
  "monthlyProjections": [
    { "month": 1, "revenue": <number>, "cost": <number>, "profit": <number> },
    ... 12 entries total
  ]
}
"""


class ExpansionFeasibilityAgent:
    def __init__(self):
        self._agent = self._build_agent()
        self._user_id = "remote_agent"
        self._runner = Runner(
            app_name=self._agent.name,
            agent=self._agent,
            artifact_service=InMemoryArtifactService(),
            session_service=InMemorySessionService(),
            memory_service=InMemoryMemoryService(),
        )

    def _build_agent(self) -> LlmAgent:
        model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        return LlmAgent(
            model=model_name,
            name="expansion_feasibility_agent",
            description=(
                "Financial feasibility analyst for F&B kiosk expansion in Malaysia. "
                "Projects monthly revenue, profit, break-even and ROI for a selected location."
            ),
            instruction=EXPANSION_FEASIBILITY_INSTRUCTION,
            tools=[get_malaysia_opr_rate],
        )

    async def invoke(self, query: str, session_id: str) -> str:
        session = await self._runner.session_service.get_session(
            app_name=self._agent.name, user_id=self._user_id, session_id=session_id
        )
        if not session:
            session = await self._runner.session_service.create_session(
                app_name=self._agent.name,
                user_id=self._user_id,
                state={},
                session_id=session_id,
            )

        content = types.Content(role="user", parts=[types.Part.from_text(text=query)])

        response_text = ""
        async for event in self._runner.run_async(
            user_id=self._user_id, session_id=session.id, new_message=content
        ):
            if event.is_final_response() and event.content:
                response_text = getattr(event.content.parts[0], "text", "")
                break

        cleaned = response_text.strip()
        if "```json" in cleaned:
            cleaned = cleaned.split("```json")[1].split("```")[0].strip()
        elif "```" in cleaned:
            cleaned = cleaned.split("```")[1].split("```")[0].strip()

        return cleaned


port = int(os.getenv("EXPANSION_FEASIBILITY_PORT", 9021))

skill = AgentSkill(
    id="expansion_feasibility_agent",
    name="Expansion Financial Feasibility",
    description=(
        "Projects financial feasibility for a selected F&B kiosk expansion location. "
        "Returns monthly revenue, profit, break-even timeline, ROI, and risk classification."
    ),
    tags=["expansion", "feasibility", "financial", "projection", "roi", "break-even"],
    examples=[
        "Analyse financial feasibility for Mid Valley Megamall expansion",
        "Is this location financially viable for my kiosk?",
        "Project revenue and break-even for the selected site",
    ],
)

public_agent_card = AgentCard(
    name="Expansion Feasibility Agent",
    description="Financial projection specialist for F&B kiosk expansion in Malaysia.",
    url=f"http://localhost:{port}/",
    version="1.0.0",
    defaultInputModes=["text"],
    defaultOutputModes=["text"],
    capabilities=AgentCapabilities(streaming=True),
    skills=[skill],
)


class ExpansionFeasibilityExecutor(AgentExecutor):
    def __init__(self):
        self.agent = ExpansionFeasibilityAgent()

    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        result = await self.agent.invoke(
            context.get_user_input(),
            getattr(context, "context_id", "default"),
        )
        await event_queue.enqueue_event(new_agent_text_message(result))

    async def cancel(self, context, event_queue):
        pass


def main():
    server = A2AStarletteApplication(
        agent_card=public_agent_card,
        http_handler=DefaultRequestHandler(ExpansionFeasibilityExecutor(), InMemoryTaskStore()),
        extended_agent_card=public_agent_card,
    )
    print(f"Starting Expansion Feasibility Agent on port {port}")
    uvicorn.run(server.build(), host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
