"""
Market Researcher Agent (ADK + A2A Protocol)

Third agent in the expansion strategy pipeline.
Analyses competitor market segments and Malaysian demographics for a chosen location,
then returns 3 market strategy options (Premium / Value / Niche) for the user to select.
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

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")
DATA_GOV_MY_URL = "https://api.data.gov.my/data-catalogue"


def get_competitor_market_segments(location_name: str, lat: float = 0.0, lng: float = 0.0) -> dict:
    """Fetch nearby F&B competitors via Google Maps Places Text Search and infer market segments from price levels."""
    if not GOOGLE_MAPS_API_KEY:
        return {"error": "GOOGLE_MAPS_API_KEY not set", "competitors": [], "segment_summary": "unknown"}

    try:
        url = "https://places.googleapis.com/v1/places:searchText"
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
            "X-Goog-FieldMask": "places.displayName,places.priceLevel,places.rating,places.userRatingCount",
        }
        body = {
            "textQuery": f"food kiosk cafe restaurant near {location_name}",
            "maxResultCount": 15,
            "locationBias": {
                "circle": {
                    "center": {"latitude": lat if lat else 3.1390, "longitude": lng if lng else 101.6869},
                    "radius": 1000.0,
                }
            } if lat and lng else {},
        }
        r = requests.post(url, json=body, headers=headers, timeout=10)
        data = r.json()
        places = data.get("places", [])

        price_counts = {"PRICE_LEVEL_INEXPENSIVE": 0, "PRICE_LEVEL_MODERATE": 0, "PRICE_LEVEL_EXPENSIVE": 0, "unknown": 0}
        competitors = []
        for p in places:
            name = p.get("displayName", {}).get("text", "Unknown")
            price = p.get("priceLevel", "unknown")
            rating = p.get("rating", 0)
            price_counts[price] = price_counts.get(price, 0) + 1
            competitors.append({"name": name, "priceLevel": price, "rating": rating})

        total = len(places) or 1
        dominant = max(price_counts, key=price_counts.get)
        return {
            "competitors": competitors[:10],
            "totalFound": len(places),
            "priceLevelCounts": price_counts,
            "dominantPriceLevel": dominant,
            "premiumGap": price_counts["PRICE_LEVEL_INEXPENSIVE"] > price_counts["PRICE_LEVEL_EXPENSIVE"],
        }
    except Exception as e:
        return {"error": str(e), "competitors": [], "segment_summary": "unavailable"}


def get_malaysia_demographics(state: str) -> dict:
    """Fetch Malaysian state population data from data.gov.my open API."""
    try:
        params = {"id": "population_state", "filter": f"state@={state}", "limit": 5, "sort": "-date"}
        r = requests.get(DATA_GOV_MY_URL, params=params, timeout=8)
        data = r.json()
        records = data if isinstance(data, list) else data.get("data", [])
        if records:
            latest = records[0]
            return {
                "state": state,
                "population": latest.get("population", "N/A"),
                "year": latest.get("date", "N/A"),
                "source": "data.gov.my",
            }
        return {"state": state, "population": "N/A", "source": "data.gov.my (no records)"}
    except Exception as e:
        return {"state": state, "error": str(e), "population": "unavailable"}


MARKET_RESEARCHER_INSTRUCTION = """
You are the MARKET RESEARCHER AGENT for KioskIQ.

You receive data about a selected F&B kiosk expansion location in Malaysia.
Your job is to analyse the local market and return 3 distinct market positioning strategies.

YOU HAVE TWO TOOLS:
1. get_competitor_market_segments(location_name, lat, lng) → returns nearby competitor price levels and counts
2. get_malaysia_demographics(state) → returns state population data from data.gov.my

CALL BOTH TOOLS before generating your analysis.
- Call get_competitor_market_segments with the locationName and coordinates (if provided)
- Call get_malaysia_demographics with the state/area (extract from targetArea or locationName)

STRATEGY GENERATION RULES:
Generate exactly 3 strategies with these positioning archetypes:
1. "Premium Experience" — higher price point (RM 25–50), quality/brand focus, lower volume
2. "Value Champion" — affordable pricing (RM 8–18), high volume, mass market
3. "Niche Specialist" — specialised product/demographic focus (health food, local cuisine, etc.)

For each strategy:
- Use competitor price level data to justify viability (e.g., if most competitors are inexpensive, premium has lower competition)
- Use demographics to estimate TAM (total addressable market)
- Calculate realistic AOV (average order value) and profit margin for F&B kiosk context
- CAC (customer acquisition cost): Premium RM 20–35, Value RM 8–15, Niche RM 12–22
- LTV (lifetime value): Premium RM 180–300, Value RM 80–150, Niche RM 120–220
- Monthly marketing budget: Premium RM 3000–5000, Value RM 1500–3000, Niche RM 2000–4000
- opportunityScore: 0–100 based on competitor gap analysis and demand signals

Return ONLY valid JSON in this exact format — no extra text, no markdown:
{
  "agentName": "Market Researcher",
  "actionType": "SELECT_MARKET_STRATEGY",
  "locationName": "<locationName from input>",
  "targetArea": "<targetArea from input>",
  "userPrompt": "<brief summary of what was analysed>",
  "strategies": [
    {
      "strategyId": "strategy-1",
      "name": "<strategy name>",
      "positioning": "<1 sentence positioning statement>",
      "targetCustomer": "<target customer description>",
      "marketAnalysis": {
        "tam": <estimated total addressable market in RM>,
        "sam": <serviceable addressable market in RM>,
        "growthRate": "<e.g. 8% annually>"
      },
      "customerProfile": "<2-3 sentence customer profile>",
      "pricingStrategy": {
        "pricePoint": "<e.g. RM 25-45>",
        "aov": <average order value in RM>,
        "profitMargin": <decimal e.g. 0.42>
      },
      "marketingApproach": {
        "cac": <customer acquisition cost in RM>,
        "ltv": <lifetime value in RM>,
        "monthlyBudget": <monthly marketing budget in RM>
      },
      "growthTactics": ["<tactic 1>", "<tactic 2>", "<tactic 3>"],
      "pros": ["<pro 1>", "<pro 2>", "<pro 3>"],
      "cons": ["<con 1>", "<con 2>"],
      "marketOpportunity": {
        "opportunityScore": <0-100>,
        "growthPotential": "High" | "Moderate" | "Low",
        "timelineToDominance": "<e.g. 12-18 months>"
      }
    }
  ],
  "nextStep": "Select the strategy that best fits your business goals and risk appetite."
  }

CRITICAL OUTPUT RULES:
- Return exactly 3 strategies.
- Do not omit any nested object or array shown in the schema.
- If a value is uncertain, still fill the field with a realistic estimate rather than leaving it blank.
- `pricingStrategy`, `marketingApproach`, and `marketOpportunity` must always be present for every strategy.
"""


class MarketResearcherAgent:
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
            name="market_researcher_agent",
            description=(
                "Market strategy analyst for F&B kiosk expansion in Malaysia. "
                "Analyses competitor segments and demographics to produce 3 positioning strategies."
            ),
            instruction=MARKET_RESEARCHER_INSTRUCTION,
            tools=[get_competitor_market_segments, get_malaysia_demographics],
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


port = int(os.getenv("MARKET_RESEARCHER_PORT", 9022))

skill = AgentSkill(
    id="market_researcher",
    name="Market Strategy Research",
    description=(
        "Analyses competitor market segments and Malaysian demographics for a chosen location. "
        "Returns 3 market positioning strategies (Premium, Value, Niche) for user selection."
    ),
    tags=["market", "research", "strategy", "competitor", "demographics", "positioning"],
    examples=[
        "Analyse market strategies for Mid Valley Megamall expansion",
        "What market segment should I target for my kiosk?",
        "Give me 3 positioning options for my F&B kiosk",
    ],
)

public_agent_card = AgentCard(
    name="Market Researcher",
    description="Market strategy analyst for F&B kiosk expansion in Malaysia.",
    url=f"http://localhost:{port}/",
    version="1.0.0",
    defaultInputModes=["text"],
    defaultOutputModes=["text"],
    capabilities=AgentCapabilities(streaming=True),
    skills=[skill],
)


class MarketResearcherExecutor(AgentExecutor):
    def __init__(self):
        self.agent = MarketResearcherAgent()

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
        http_handler=DefaultRequestHandler(MarketResearcherExecutor(), InMemoryTaskStore()),
        extended_agent_card=public_agent_card,
    )
    print(f"Starting Market Researcher Agent on port {port}")
    uvicorn.run(server.build(), host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
