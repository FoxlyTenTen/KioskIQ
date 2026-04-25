"""
Site Selection Expert Agent (ADK + A2A Protocol)

Uses real APIs:
- Google Maps Geocoding → lat/lng for a location name
- Google Maps Places Nearby Search → real F&B competitor count
- Google Maps Distance Matrix → real drive time from KL city centre
- Foursquare Places → venue density as foot traffic proxy
"""
import uvicorn
import os
import requests
from dotenv import load_dotenv

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

GMAPS_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")
FSQ_KEY = os.getenv("FOURSQUARE_API_KEY", "")
KL_CENTRE = "3.1478,101.6953"  # KLCC as KL city centre reference


# ── ADK Tools ─────────────────────────────────────────────────────────────────

def geocode_location(location_name: str) -> dict:
    """Convert a Malaysian mall or area name to latitude and longitude coordinates."""
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    r = requests.get(url, params={"address": f"{location_name}, Malaysia", "key": GMAPS_KEY}, timeout=10)
    data = r.json()
    if data.get("status") == "OK":
        loc = data["results"][0]["geometry"]["location"]
        return {"lat": loc["lat"], "lng": loc["lng"], "formatted_address": data["results"][0]["formatted_address"]}
    return {"lat": None, "lng": None, "formatted_address": location_name}


def get_fnb_competitors_with_coordinates(lat: float, lng: float, radius_m: int = 800) -> dict:
    """Search for F&B competitors near a location. Returns count AND each competitor's name and coordinates for map display."""
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        "location": f"{lat},{lng}",
        "radius": radius_m,
        "type": "restaurant",
        "key": GMAPS_KEY,
    }
    r = requests.get(url, params=params, timeout=10)
    data = r.json()
    results = data.get("results", [])
    competitors = [
        {
            "name": p.get("name", "Unknown"),
            "coordinates": {
                "lat": p["geometry"]["location"]["lat"],
                "lng": p["geometry"]["location"]["lng"],
            },
        }
        for p in results[:15]  # cap at 15 for map clarity
        if p.get("geometry", {}).get("location")
    ]
    count = len(results)
    if data.get("next_page_token"):
        count += 10
    return {"competitor_count": count, "competitors": competitors, "radius_m": radius_m}


def get_drive_time_from_kl(lat: float, lng: float) -> dict:
    """Get driving time from KL city centre (KLCC) to the given location using Google Distance Matrix API."""
    url = "https://maps.googleapis.com/maps/api/distancematrix/json"
    params = {
        "origins": KL_CENTRE,
        "destinations": f"{lat},{lng}",
        "mode": "driving",
        "key": GMAPS_KEY,
    }
    r = requests.get(url, params=params, timeout=10)
    data = r.json()
    try:
        element = data["rows"][0]["elements"][0]
        if element["status"] == "OK":
            duration_text = element["duration"]["text"]
            duration_mins = element["duration"]["value"] // 60
            return {"drive_time_text": duration_text, "drive_time_mins": duration_mins}
    except (KeyError, IndexError):
        pass
    return {"drive_time_text": "Unknown", "drive_time_mins": 0}


def get_venue_density_foursquare(lat: float, lng: float, radius_m: int = 1000) -> dict:
    """Get total venue count near a location from Foursquare as a foot traffic proxy. Category 13000 = Food & Beverage."""
    url = "https://api.foursquare.com/v3/places/search"
    headers = {"Authorization": FSQ_KEY, "accept": "application/json"}
    params = {
        "ll": f"{lat},{lng}",
        "radius": radius_m,
        "categories": "13000",  # Food & Beverage
        "limit": 50,
    }
    r = requests.get(url, headers=headers, params=params, timeout=10)
    data = r.json()
    results = data.get("results", [])
    venue_count = len(results)
    # Derive a foot traffic estimate: more F&B venues = higher footfall area
    estimated_daily_traffic = venue_count * 400 + 2000
    return {"fsq_venue_count": venue_count, "estimated_foot_traffic_daily": estimated_daily_traffic}


# ── Instruction ────────────────────────────────────────────────────────────────

SITE_SELECTION_INSTRUCTION = """
You are the SITE SELECTION EXPERT AGENT for KioskIQ.

KioskIQ is used by F&B kiosk owners operating in Malaysian shopping malls.
The user wants to expand and open a NEW kiosk outlet.

THE USER'S FORM provides: targetArea (name), lat, lng (exact GPS from Google Maps), budgetRange, businessType.

YOU HAVE REAL DATA TOOLS — use them for the user's location AND nearby candidate areas:
1. geocode_location(location_name) → get lat/lng for candidate areas NEAR the user's target (do NOT call for the user's location itself — use the provided lat/lng)
2. get_fnb_competitors_with_coordinates(lat, lng) → real competitor count + each competitor's name and coordinates
3. get_drive_time_from_kl(lat, lng) → real drive time from KL city centre
4. get_venue_density_foursquare(lat, lng) → foot traffic proxy via venue density

WORKFLOW:
- The user has provided exact lat/lng for their target area (use these directly)
- Pick 3 candidate mall/commercial locations IN OR NEAR the user's specified area
- For option-1: Use the user's provided lat/lng directly (most relevant to their search)
- For option-2 and option-3: Call geocode_location for nearby alternative locations, then fetch their data
- For ALL 3 options: Call get_fnb_competitors_with_coordinates, get_drive_time_from_kl, get_venue_density_foursquare
- Use ALL real data values in the JSON output

THE 3 OPTION TYPES (pick realistic Malaysian locations):
1. HIGH-TRAFFIC PREMIUM — major mall e.g. Pavilion, KLCC, Mid Valley
2. GROWING SUBURBAN — upcoming area e.g. Bangsar South, Damansara, Puchong
3. MIXED-USE / COMMUNITY — neighbourhood mall, transit hub, university area

SCORING GUIDE (all out of 100):
- footTrafficScore: based on estimated_foot_traffic_daily (>15000=90+, >8000=70+, >3000=50+)
- affordabilityScore: based on rentMonthlyRM (lower rent = higher score)
- competitionScore: based on competitor_count (fewer competitors = higher score)
- growthScore: your expert assessment of area growth potential
- overallScore: average of all 4 scores

RENT REFERENCE TABLE (RM/month for kiosk ~150sqft):
- KLCC / Pavilion KL: RM 12,000–18,000
- Mid Valley / The Gardens: RM 10,000–14,000
- Sunway Pyramid / 1Utama: RM 8,000–12,000
- Bangsar South / Nu Sentral: RM 6,000–9,000
- Damansara / SS2: RM 4,000–7,000
- Puchong / IOI Mall: RM 4,000–6,000
- Cheras / Ampang: RM 3,500–5,500

After gathering all real data, return ONLY valid JSON:
{
  "agentName": "Site Selection Expert",
  "actionType": "SITE_SELECTION_OPTIONS",
  "targetArea": "<area the user mentioned or 'Klang Valley'>",
  "userPrompt": "Here are 3 location options for your new F&B kiosk based on real market data. Review the trade-offs and select the one that best fits your expansion strategy.",
  "options": [
    {
      "optionId": "option-1",
      "name": "<mall or area name>",
      "type": "High-Traffic Premium",
      "summary": "<one sentence using real data insights>",
      "coordinates": { "lat": <from geocode_location>, "lng": <from geocode_location> },
      "competitors": <use competitors array from get_fnb_competitors_with_coordinates>,
      "metrics": {
        "footTrafficDaily": <use estimated_foot_traffic_daily from Foursquare>,
        "rentMonthlyRM": <use rent table above>,
        "competitorCount": <use real competitor_count from get_fnb_competitors_with_coordinates>,
        "populationNearby": <your estimate based on area knowledge>,
        "driveTimeFromCityCentre": "<use real drive_time_text>"
      },
      "scores": {
        "footTrafficScore": <0-100>,
        "affordabilityScore": <0-100>,
        "competitionScore": <0-100>,
        "growthScore": <0-100>,
        "overallScore": <average of above>
      },
      "pros": ["<specific insight using real data>", ...],
      "cons": ["<specific insight using real data>", ...]
    },
    { "optionId": "option-2", "type": "Growing Suburban", ... },
    { "optionId": "option-3", "type": "Community Hub", ... }
  ],
  "nextStep": "Select a location to proceed to financial scenario analysis."
}

No extra text. No markdown. Just the JSON object.
"""


# ── Agent Class ────────────────────────────────────────────────────────────────

class SiteSelectionAgent:
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
            name="site_selection_agent",
            description=(
                "Site Selection Expert for F&B kiosk expansion in Malaysia. "
                "Uses real Google Maps and Foursquare data to evaluate 3 candidate locations."
            ),
            instruction=SITE_SELECTION_INSTRUCTION,
            tools=[
                geocode_location,
                get_fnb_competitors_with_coordinates,
                get_drive_time_from_kl,
                get_venue_density_foursquare,
            ],
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


# ── Server Setup ───────────────────────────────────────────────────────────────

port = int(os.getenv("SITE_SELECTION_PORT", 9020))

skill = AgentSkill(
    id="site_selection_agent",
    name="Site Selection Expert",
    description=(
        "Analyses Malaysian mall locations for F&B kiosk expansion using real Google Maps "
        "and Foursquare data. Returns 3 candidate sites with foot traffic, rent, competition scores."
    ),
    tags=["expansion", "location", "site", "kiosk", "mall"],
    examples=[
        "I want to expand my business location",
        "Help me find a new outlet location in KL",
        "I want to open a second kiosk",
    ],
)

public_agent_card = AgentCard(
    name="Site Selection Expert Agent",
    description="F&B kiosk site selection specialist using real market data.",
    url=f"http://localhost:{port}/",
    version="1.0.0",
    defaultInputModes=["text"],
    defaultOutputModes=["text"],
    capabilities=AgentCapabilities(streaming=True),
    skills=[skill],
)


class SiteSelectionExecutor(AgentExecutor):
    def __init__(self):
        self.agent = SiteSelectionAgent()

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
        http_handler=DefaultRequestHandler(SiteSelectionExecutor(), InMemoryTaskStore()),
        extended_agent_card=public_agent_card,
    )
    print(f"Starting Site Selection Expert Agent on port {port}")
    uvicorn.run(server.build(), host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
