"""
Strategic Planner Agent (ADK + A2A Protocol)

Fifth and final agent in the expansion strategy pipeline.
Synthesises ALL prior selections (location, financial, market strategy, risk profile)
and generates 3 expansion roadmaps (Conservative / Standard / Aggressive)
with full phase breakdowns, investment schedules, and milestones.
"""
import uvicorn
import os
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


STRATEGIC_PLANNER_INSTRUCTION = """
You are the STRATEGIC PLANNER AGENT for KioskIQ.

You receive ALL prior expansion decisions:
- Selected location (name, rent, foot traffic, coordinates)
- Financial feasibility (break-even months, monthly profit, initial investment, ROI)
- Market strategy (strategy name, pricing, target customer, AOV)
- Risk management profile (profile name, contingency budget, risk tolerance level)

YOUR TASK: Synthesise everything and generate exactly 3 EXPANSION ROADMAPS:
1. Conservative Expansion — Slow, safe, prove model thoroughly before scaling
2. Standard Expansion — Balanced, proven approach, moderate growth pace
3. Aggressive Expansion — Fast growth, rapid rollout, maximum market capture

ROADMAP STRUCTURE (3 phases each):
- Phase 1: PILOT STORE — validate the model at the selected location
- Phase 2: REGIONAL EXPANSION — open multiple new outlets
- Phase 3: NETWORK GROWTH — consolidate and optimise the network

SCALING RULES (adapt to Malaysian RM context from financial input):
- Conservative Phase 2: 2 new locations, 1 every 6 months (months 12-24)
- Standard Phase 2: 4 new locations, 1 every 2 months (months 7-15)
- Aggressive Phase 2: 6 new locations, 1 every month (months 5-11)

INVESTMENT CALCULATION:
- Each new outlet costs approximately the same as the initial investment (from feasibility data)
- Add 15-20% contingency buffer on top of total
- Funding strategy: mix of owner equity, bank/SBA loan, and investor capital

GROWTH SPEED BADGES:
- Conservative: "SLOW"
- Standard: "STANDARD"
- Aggressive: "FAST"

FINAL RECOMMENDATION:
- Recommend the roadmap that best matches the selected risk profile
- Conservative risk profile → lean toward Conservative or Standard roadmap
- Balanced risk profile → lean toward Standard roadmap
- Aggressive risk profile → lean toward Standard or Aggressive roadmap

Return ONLY valid JSON in this exact format — no extra text, no markdown:
{
  "agentName": "Strategic Planner",
  "actionType": "FINAL_RECOMMENDATION",
  "selectedLocation": "<locationName from input>",
  "selectedFinancial": "<brief financial summary>",
  "selectedStrategy": "<market strategy name>",
  "selectedRiskProfile": "<risk profile name>",
  "userPrompt": "Select your expansion roadmap — choose the growth pace that matches your ambitions and resources",
  "roadmaps": [
    {
      "roadmapId": "roadmap-1",
      "name": "Conservative Expansion",
      "philosophy": "<1 sentence>",
      "totalTimeline": "30+ months",
      "totalInvestment": <RM>,
      "expectedYear3Revenue": <RM>,
      "expectedYear3Profit": <RM>,
      "phases": {
        "phase1": { "name": "Pilot Store", "months": "0-6", "investment": <RM>, "revenueTarget": "<RM X/month by month 6>", "decisionPoint": "<Month X: if Y then Z>" },
        "phase2": { "name": "Regional Expansion", "numLocations": <n>, "timeline": "<Months X-Y>", "investmentPerLocation": <RM>, "totalPhase2Investment": <RM>, "expansionPace": "<one every N months>", "decisionPoint": "<Month X: if Y then Z>" },
        "phase3": { "name": "Network Growth", "numLocations": <n>, "timeline": "<Months X-Y>", "investment": <RM>, "targetNetworkSize": <total outlets> }
      },
      "timelineVisualization": "Phase 1 (0-6) → Evaluation → Phase 2 → Phase 3",
      "investmentSchedule": { "phase1": <RM>, "phase2": <RM>, "phase3": <RM>, "contingency": <RM>, "total": <RM>, "fundingStrategy": "<Bank loan RM X + Owner equity RM Y>" },
      "milestones": ["Month 1: <milestone>", "Month 3: <milestone>", "Month 6: <milestone>", "Month 12: <milestone>", "Month 18: <milestone>", "Month 24: <milestone>"],
      "successMetrics": { "month6": "<metric>", "month12": "<metric>", "month24": "<metric>" },
      "pros": ["<pro 1>", "<pro 2>", "<pro 3>"],
      "cons": ["<con 1>", "<con 2>"],
      "comparison": { "growthSpeed": "SLOW", "capitalRequired": "<LOW (RM Xk)>", "riskLevel": "LOW", "managementComplexity": "LOW", "bestFor": "<type>" }
    }
  ],
  "finalRecommendation": {
    "recommendedRoadmap": "<roadmap name>",
    "reasoning": "<2 sentences>",
    "projectedOutcome": "<1 sentence>"
  },
  "nextStep": "Select your preferred expansion roadmap to finalise your complete expansion plan."
}

CRITICAL OUTPUT RULES:
- Return exactly 3 roadmaps (Conservative, Standard, Aggressive).
- Every roadmap must include phases (phase1/phase2/phase3), investmentSchedule, milestones, successMetrics, pros, cons, and comparison.
- Keep string values concise — single sentences, not paragraphs.
- If a value is uncertain, use a realistic estimate instead of omitting the field.
"""


class StrategicPlannerAgent:
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
            name="strategic_planner_agent",
            description=(
                "Strategic expansion planner for F&B kiosk businesses in Malaysia. "
                "Synthesises all prior selections and generates 3 phased expansion roadmaps."
            ),
            instruction=STRATEGIC_PLANNER_INSTRUCTION,
            tools=[],
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


port = int(os.getenv("STRATEGIC_PLANNER_PORT", 9024))

skill = AgentSkill(
    id="strategic_planner",
    name="Strategic Expansion Planning",
    description=(
        "Synthesises all prior expansion selections and generates 3 phased expansion roadmaps "
        "(Conservative/Standard/Aggressive) with investment schedules, milestones, and a final recommendation."
    ),
    tags=["strategy", "planning", "roadmap", "expansion", "phases", "milestones"],
    examples=[
        "Create an expansion roadmap for my kiosk business",
        "Give me 3 growth strategies for my expansion",
        "What is my recommended expansion plan?",
    ],
)

public_agent_card = AgentCard(
    name="Strategic Planner",
    description="Strategic expansion planner for F&B kiosk businesses in Malaysia.",
    url=f"http://localhost:{port}/",
    version="1.0.0",
    defaultInputModes=["text"],
    defaultOutputModes=["text"],
    capabilities=AgentCapabilities(streaming=True),
    skills=[skill],
)


class StrategicPlannerExecutor(AgentExecutor):
    def __init__(self):
        self.agent = StrategicPlannerAgent()

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
        http_handler=DefaultRequestHandler(StrategicPlannerExecutor(), InMemoryTaskStore()),
        extended_agent_card=public_agent_card,
    )
    print(f"Starting Strategic Planner Agent on port {port}")
    uvicorn.run(server.build(), host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
