"""
Risk Manager Agent (ADK + A2A Protocol)

Fourth agent in the expansion strategy pipeline.
Receives all prior selections (location, financial metrics, market strategy)
and generates 3 risk management profiles (Conservative / Balanced / Aggressive)
for the user to choose from.
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


RISK_MANAGER_INSTRUCTION = """
You are the RISK MANAGER AGENT for KioskIQ.

You receive all prior expansion decisions:
- Selected location (name, rent, foot traffic, competitor count)
- Financial feasibility results (break-even months, monthly profit, risk level)
- Market strategy selection (strategy name, pricing, target customer)

YOUR TASK: Generate exactly 3 RISK MANAGEMENT PROFILES representing different risk tolerances:
1. Conservative Risk Management — Minimize risks, heavy safeguards, large contingency
2. Balanced Risk Management — Reasonable risks with smart protections
3. Aggressive Risk Management — Accept higher risks for maximum growth potential

For each profile, analyse risks SPECIFIC to the selected location and strategy combination.

RISK CATEGORIES TO ASSESS (5 risks per profile):
- Sourcing/Supply Risk: supplier reliability, cost increases
- Market Adoption Risk: customers not responding to positioning
- Revenue Risk: sales falling below projection
- Staffing Risk: hiring difficulty, turnover in F&B kiosk context
- Competition Risk: new entrant or existing competitor response

For each risk:
- severity: "HIGH" | "MEDIUM" | "LOW"
- likelihood: "HIGH" | "MEDIUM" | "LOW"
- impact: RM amount if risk materialises (scale to Malaysian F&B kiosk context)
- mitigation: specific proactive action
- contingency: what to do if mitigation fails

CONTINGENCY BUDGET GUIDELINES (as % of initial investment):
- Conservative: ~20-25% (large buffer)
- Balanced: ~12-16% (reasonable buffer)
- Aggressive: ~6-8% (lean buffer, fast action instead)

FINANCIAL BUFFERS (in RM, Malaysian context):
- Operating Reserve: 2-4 months operating costs
- Marketing Buffer: extra marketing spend if needed
- Staffing Buffer: recruitment/retention costs
- Contingency Fund: catch-all emergency fund

Return ONLY valid JSON in this exact format — no extra text, no markdown:
{
  "agentName": "Risk Manager",
  "actionType": "SELECT_RISK_MANAGEMENT_PROFILE",
  "selectedLocation": "<locationName from input>",
  "selectedFinancial": "<brief financial summary e.g. Break-even 14 months, RM 8,500/mo profit>",
  "selectedStrategy": "<market strategy name from input>",
  "userPrompt": "Select the risk management approach that matches your risk tolerance and experience level",
  "riskProfiles": [
    {
      "profileId": "profile-1",
      "name": "Conservative Risk Management",
      "philosophy": "<1 sentence philosophy>",
      "riskTolerance": "CONSERVATIVE",
      "contingencyBudget": <number in RM>,
      "riskAssessment": {
        "risks": [
          {
            "risk": "<specific risk description>",
            "severity": "HIGH" | "MEDIUM" | "LOW",
            "likelihood": "HIGH" | "MEDIUM" | "LOW",
            "impact": <RM amount>,
            "mitigation": "<specific proactive action>",
            "contingency": "<fallback if mitigation fails>"
          }
        ]
      },
      "mitigationStrategies": ["<strategy 1>", "<strategy 2>", "<strategy 3>", "<strategy 4>"],
      "contingencyPlans": [
        { "trigger": "If <condition>", "action": "<specific response>" }
      ],
      "monitoringApproach": {
        "keyMetrics": ["<metric 1>", "<metric 2>", "<metric 3>"],
        "checkFrequency": "<DAILY | WEEKLY | BI-WEEKLY | MONTHLY>",
        "decisionPoints": ["Month X: <decision>", "Month Y: <decision>"]
      },
      "financialBuffers": {
        "operatingReserve": <number>,
        "marketingBuffer": <number>,
        "staffingBuffer": <number>,
        "contingencyFund": <number>,
        "totalContingency": <number>
      },
      "pros": ["<pro 1>", "<pro 2>", "<pro 3>"],
      "cons": ["<con 1>", "<con 2>", "<con 3>"]
    }
  ],
  "nextStep": "Select the risk management approach that best fits your experience and risk tolerance."
  }

CRITICAL OUTPUT RULES:
- Return exactly 3 risk profiles.
- Every profile must include `riskAssessment`, `mitigationStrategies`, `contingencyPlans`, `monitoringApproach`, `financialBuffers`, `pros`, and `cons`.
- Every `riskAssessment.risks` array must contain exactly 5 risks.
- If a value is uncertain, use a realistic estimate instead of omitting the field.
"""


class RiskManagerAgent:
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
            name="risk_manager_agent",
            description=(
                "Risk management specialist for F&B kiosk expansion in Malaysia. "
                "Generates 3 risk profiles (Conservative/Balanced/Aggressive) based on all prior expansion selections."
            ),
            instruction=RISK_MANAGER_INSTRUCTION,
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


port = int(os.getenv("RISK_MANAGER_PORT", 9023))

skill = AgentSkill(
    id="risk_manager",
    name="Risk Management Analysis",
    description=(
        "Generates 3 risk management profiles (Conservative/Balanced/Aggressive) "
        "tailored to a selected F&B kiosk expansion location and market strategy."
    ),
    tags=["risk", "management", "mitigation", "contingency", "expansion"],
    examples=[
        "Analyse risks for my kiosk expansion to Mid Valley",
        "What risk management approach should I take?",
        "Give me 3 risk profiles for my expansion plan",
    ],
)

public_agent_card = AgentCard(
    name="Risk Manager",
    description="Risk management specialist for F&B kiosk expansion in Malaysia.",
    url=f"http://localhost:{port}/",
    version="1.0.0",
    defaultInputModes=["text"],
    defaultOutputModes=["text"],
    capabilities=AgentCapabilities(streaming=True),
    skills=[skill],
)


class RiskManagerExecutor(AgentExecutor):
    def __init__(self):
        self.agent = RiskManagerAgent()

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
        http_handler=DefaultRequestHandler(RiskManagerExecutor(), InMemoryTaskStore()),
        extended_agent_card=public_agent_card,
    )
    print(f"Starting Risk Manager Agent on port {port}")
    uvicorn.run(server.build(), host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
