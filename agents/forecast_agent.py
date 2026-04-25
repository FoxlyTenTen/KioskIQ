"""
Forecast & Demand Prediction Agent (ADK + A2A Protocol)

Integrates with KioskIQ ML Service to provide:
- Daily order forecasts
- Expiry & waste risk predictions
- Reorder quantity recommendations
- Revenue & AOV forecasts
- Stockout predictions
- Top selling item predictions

Fetches live data from Supabase to build ML feature vectors automatically.
"""
import uvicorn
import os
import math
import requests
from datetime import date, timedelta
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

# ── Config ────────────────────────────────────────────────────────────────────

ML_BASE_URL = "https://kioskiq-ml-service-86519568652.us-central1.run.app"
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

# ── Supabase helpers ──────────────────────────────────────────────────────────

def _supabase_get(table: str, params: dict) -> list:
    """Generic Supabase REST query."""
    try:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/{table}",
            headers=SUPABASE_HEADERS,
            params=params,
            timeout=10,
        )
        return r.json() if isinstance(r.json(), list) else []
    except Exception:
        return []


def _date_features(d: date) -> dict:
    """Compute cyclical month features and weekend flag for a date."""
    month = d.month
    month_rad = (month - 1) / 12 * 2 * math.pi
    return {
        "day_of_week": d.weekday(),          # 0=Mon … 6=Sun
        "day_of_month": d.day,
        "month_sin": round(math.sin(month_rad), 4),
        "month_cos": round(math.cos(month_rad), 4),
        "is_weekend": 1 if d.weekday() >= 5 else 0,
    }


def _fetch_daily_orders(location_id: str, days: int = 14) -> list[dict]:
    """Fetch recent pos_orders_daily rows sorted oldest→newest."""
    since = (date.today() - timedelta(days=days)).isoformat()
    rows = _supabase_get(
        "pos_orders_daily",
        {
            "select": "business_date,actual_orders,predicted_orders",
            "location_id": f"eq.{location_id}",
            "business_date": f"gte.{since}",
            "order": "business_date.asc",
        },
    )
    return rows


def _fetch_inventory(location_id: str) -> list[dict]:
    return _supabase_get(
        "inventory_stock",
        {
            "select": "item_name,current_qty,threshold_qty,unit",
            "location_id": f"eq.{location_id}",
        },
    )


def _fetch_expiry(location_id: str) -> list[dict]:
    return _supabase_get(
        "inventory_expiry",
        {
            "select": "item_name,quantity,expiry_date,days_to_expiry",
            "location_id": f"eq.{location_id}",
            "order": "days_to_expiry.asc",
        },
    )


def _fetch_recent_orders(location_id: str, days: int = 7) -> list[dict]:
    """Fetch individual POS orders for AOV calculation."""
    since = (date.today() - timedelta(days=days)).isoformat()
    return _supabase_get(
        "pos_orders",
        {
            "select": "total_amount,ordered_at",
            "outlet_id": f"eq.{location_id}",
            "ordered_at": f"gte.{since}T00:00:00",
        },
    )


def _fetch_order_items(location_id: str, days: int = 7) -> list[dict]:
    """Fetch order items to compute per-item sales lag features."""
    since = (date.today() - timedelta(days=days)).isoformat()
    return _supabase_get(
        "pos_order_items",
        {
            "select": "item_name,qty",
            "order": "item_name.asc",
        },
    )


def _ml_post(endpoint: str, payload: list) -> dict:
    try:
        r = requests.post(
            f"{ML_BASE_URL}{endpoint}",
            json=payload,
            timeout=30,
        )
        return r.json()
    except Exception as e:
        return {"error": str(e)}

# ── Tool functions ────────────────────────────────────────────────────────────

def forecast_daily_orders(location_id: str) -> dict:
    """
    Forecast tomorrow's order volume for a kiosk location.
    Fetches 14 days of POS history from Supabase to build ML features automatically.
    Returns predicted order count and confidence context.
    """
    rows = _fetch_daily_orders(location_id, days=14)

    actuals = [r["actual_orders"] for r in rows if r.get("actual_orders") is not None]
    if len(actuals) < 2:
        return {"error": f"Not enough order history for {location_id} (need at least 2 days)."}

    today = date.today()
    tomorrow = today + timedelta(days=1)
    feats = _date_features(tomorrow)

    lag_1 = actuals[-1]
    lag_7 = actuals[-7] if len(actuals) >= 7 else actuals[0]
    window7 = actuals[-7:] if len(actuals) >= 7 else actuals
    window14 = actuals[-14:] if len(actuals) >= 14 else actuals
    rolling_mean_7 = round(sum(window7) / len(window7), 2)
    rolling_std_7 = round(
        (sum((x - rolling_mean_7) ** 2 for x in window7) / len(window7)) ** 0.5, 2
    )
    rolling_mean_14 = round(sum(window14) / len(window14), 2)

    # Use latest predicted_orders from DB if available, else use rolling mean
    latest_predicted = rows[-1].get("predicted_orders") if rows else None
    predicted_orders = float(latest_predicted) if latest_predicted else rolling_mean_7

    payload = [{
        "location_id": location_id,
        "predicted_orders": predicted_orders,
        **feats,
        "lag_1": float(lag_1),
        "lag_7": float(lag_7),
        "rolling_mean_7": rolling_mean_7,
        "rolling_std_7": rolling_std_7,
        "rolling_mean_14": rolling_mean_14,
    }]

    result = _ml_post("/predict/daily-order", payload)
    return {
        "location_id": location_id,
        "forecast_date": tomorrow.isoformat(),
        "recent_avg_orders": rolling_mean_7,
        "lag_1_orders": lag_1,
        "ml_prediction": result,
    }


def predict_expiry_waste_risk(location_id: str) -> dict:
    """
    Predict expiry and waste risk for all items at a location.
    Fetches live inventory expiry data from Supabase.
    Returns risk scores per item sorted by urgency.
    """
    expiry_rows = _fetch_expiry(location_id)
    if not expiry_rows:
        return {"error": f"No expiry data found for {location_id}."}

    # Estimate avg_daily_usage from inventory_stock threshold (rough proxy)
    stock_rows = _fetch_inventory(location_id)
    stock_map = {r["item_name"]: r for r in stock_rows}

    today = date.today()
    feats = _date_features(today)
    payload = []

    for row in expiry_rows:
        item = row["item_name"]
        qty = float(row.get("quantity", 1))
        days_to_expiry = int(row.get("days_to_expiry", 1))
        stock = stock_map.get(item, {})
        threshold = float(stock.get("threshold_qty", qty))
        # Estimate: avg daily usage = threshold / 7 (1-week turnover assumption)
        avg_daily_usage = round(threshold / 7, 2) if threshold > 0 else 1.0
        shelf_life_days = max(days_to_expiry + 1, 7)
        inventory_pressure = round(qty / max(avg_daily_usage * days_to_expiry, 0.1), 3)
        expiry_urgency = round(days_to_expiry / shelf_life_days, 3)

        payload.append({
            "location_id": location_id,
            "item_name": item,
            "quantity": qty,
            "avg_daily_usage": avg_daily_usage,
            "days_to_expiry": days_to_expiry,
            "shelf_life_days": shelf_life_days,
            "inventory_pressure": inventory_pressure,
            "expiry_urgency": expiry_urgency,
            "short_life_item": 1 if shelf_life_days <= 7 else 0,
            "markdown_applied": 0,
            "markdown_discount_pct": 0.0,
            **feats,
        })

    result = _ml_post("/predict/expiry-risk", payload)
    return {
        "location_id": location_id,
        "items_analysed": len(payload),
        "ml_prediction": result,
    }


def recommend_reorder_quantities(location_id: str) -> dict:
    """
    Recommend reorder quantities for all inventory items at a location.
    Fetches live stock levels from Supabase and computes demand features.
    Returns recommended reorder quantities per item.
    """
    stock_rows = _fetch_inventory(location_id)
    if not stock_rows:
        return {"error": f"No inventory data found for {location_id}."}

    today = date.today()
    feats = _date_features(today)
    payload = []

    for row in stock_rows:
        item = row["item_name"]
        current_qty = float(row.get("current_qty", 0))
        threshold_qty = float(row.get("threshold_qty", 1))
        avg_daily_demand = round(threshold_qty / 7, 2)
        demand_next_7d = round(avg_daily_demand * 7, 2)
        lead_time_days = 2
        safety_stock_days = 3
        stock_gap = max(threshold_qty - current_qty, 0)
        coverage_days = round(current_qty / max(avg_daily_demand, 0.1), 2)
        inventory_pressure = round(stock_gap / max(threshold_qty, 1), 3)
        net_supply_risk = round(1 - min(coverage_days / (lead_time_days + safety_stock_days), 1), 3)

        payload.append({
            "location_id": location_id,
            "item_name": item,
            "unit": row.get("unit", "unit"),
            "current_qty": current_qty,
            "threshold_qty": threshold_qty,
            "incoming_qty": 0.0,
            "avg_daily_demand": avg_daily_demand,
            "demand_next_7d": demand_next_7d,
            "lead_time_days": lead_time_days,
            "safety_stock_days": safety_stock_days,
            "supplier_reliability": 0.90,
            "promo_event": 0,
            "promo_uplift": 0.0,
            "stock_gap": stock_gap,
            "coverage_days": coverage_days,
            "incoming_coverage_days": 0.0,
            "inventory_pressure": inventory_pressure,
            "net_supply_risk": net_supply_risk,
            **feats,
        })

    result = _ml_post("/predict/reorder-qty", payload)
    return {
        "location_id": location_id,
        "items_analysed": len(payload),
        "ml_prediction": result,
    }


def forecast_revenue_aov(location_id: str) -> dict:
    """
    Forecast tomorrow's revenue and average order value (AOV) for a location.
    Fetches POS order history from Supabase to build lag and rolling features.
    Returns predicted revenue and AOV.
    """
    daily_rows = _fetch_daily_orders(location_id, days=14)
    recent_orders = _fetch_recent_orders(location_id, days=7)

    actuals = [r["actual_orders"] for r in daily_rows if r.get("actual_orders") is not None]
    if len(actuals) < 2:
        return {"error": f"Not enough daily order history for {location_id}."}

    # Compute AOV from recent pos_orders
    amounts = [float(r["total_amount"]) for r in recent_orders if r.get("total_amount")]
    aov_recent = round(sum(amounts) / len(amounts), 2) if amounts else 20.0

    today = date.today()
    feats = _date_features(today)

    orders_lag_1 = float(actuals[-1])
    orders_lag_7 = float(actuals[-7]) if len(actuals) >= 7 else float(actuals[0])
    orders_roll7_list = actuals[-7:] if len(actuals) >= 7 else actuals
    orders_roll7 = round(sum(orders_roll7_list) / len(orders_roll7_list), 2)

    revenue_lag_1 = round(orders_lag_1 * aov_recent, 2)
    revenue_lag_7 = round(orders_lag_7 * aov_recent, 2)
    revenue_roll7 = round(orders_roll7 * aov_recent, 2)

    payload = [{
        "location_id": location_id,
        "actual_orders": orders_lag_1,
        "promo_event": 0,
        "rain_impact": 1,
        "gross_margin_pct": 0.35,
        **feats,
        "orders_lag_1": orders_lag_1,
        "orders_lag_7": orders_lag_7,
        "revenue_lag_1": revenue_lag_1,
        "revenue_lag_7": revenue_lag_7,
        "aov_lag_1": aov_recent,
        "aov_lag_7": aov_recent,
        "orders_roll7": orders_roll7,
        "revenue_roll7": revenue_roll7,
        "aov_roll7": aov_recent,
    }]

    result = _ml_post("/predict/revenue-aov", payload)
    return {
        "location_id": location_id,
        "forecast_date": (today + timedelta(days=1)).isoformat(),
        "current_aov_rm": aov_recent,
        "recent_avg_orders": orders_roll7,
        "ml_prediction": result,
    }


def predict_stockout_risk(location_id: str) -> dict:
    """
    Predict stockout risk for all inventory items at a location.
    Fetches live stock levels from Supabase.
    Returns stockout probability and days-until-stockout per item.
    """
    stock_rows = _fetch_inventory(location_id)
    if not stock_rows:
        return {"error": f"No inventory data found for {location_id}."}

    today = date.today()
    feats = _date_features(today)
    payload = []

    for row in stock_rows:
        item = row["item_name"]
        current_qty = float(row.get("current_qty", 0))
        threshold_qty = float(row.get("threshold_qty", 1))
        avg_daily_usage = round(threshold_qty / 7, 2)
        lead_time_days = 2
        stock_gap = max(threshold_qty - current_qty, 0)
        coverage_days = round(current_qty / max(avg_daily_usage, 0.1), 2)
        risk_pressure = round(stock_gap / max(threshold_qty, 1), 3)
        net_supply_risk = round(1 - min(coverage_days / (lead_time_days + 1), 1), 3)

        payload.append({
            "location_id": location_id,
            "item_name": item,
            "current_qty": current_qty,
            "threshold_qty": threshold_qty,
            "incoming_qty": 0.0,
            "avg_daily_usage": avg_daily_usage,
            "lead_time_days": lead_time_days,
            "supplier_reliability": 0.90,
            "promo_event": 0,
            "promo_uplift": 0.0,
            "disruption_event": 0,
            "stock_gap": stock_gap,
            "coverage_days": coverage_days,
            "incoming_coverage_days": 0.0,
            "risk_pressure": risk_pressure,
            "net_supply_risk": net_supply_risk,
            **feats,
        })

    result = _ml_post("/predict/stockout", payload)
    return {
        "location_id": location_id,
        "items_analysed": len(payload),
        "ml_prediction": result,
    }


def predict_top_selling_items(location_id: str) -> dict:
    """
    Predict which items will be top sellers tomorrow for a location.
    Fetches recent order item sales from Supabase to build item lag features.
    Returns ranked list of predicted top selling items.
    """
    order_items = _fetch_order_items(location_id, days=7)

    # Aggregate qty sold per item over last 7 days
    item_totals: dict[str, float] = {}
    for row in order_items:
        name = row.get("item_name", "Unknown")
        item_totals[name] = item_totals.get(name, 0) + float(row.get("qty", 0))

    today = date.today()
    feats = _date_features(today)

    # Build item_features dict: {"ItemName__lag1": qty}
    item_features = {f"{name}__lag1": round(qty / 7, 2) for name, qty in item_totals.items()}

    if not item_features:
        item_features = {}

    payload = [{
        "location_id": location_id,
        **feats,
        "item_features": item_features,
    }]

    result = _ml_post("/predict/top-selling", payload)
    return {
        "location_id": location_id,
        "items_tracked": len(item_features),
        "recent_sales_summary": dict(sorted(item_totals.items(), key=lambda x: x[1], reverse=True)[:5]),
        "ml_prediction": result,
    }


# ── Agent instruction ─────────────────────────────────────────────────────────

FORECAST_AGENT_INSTRUCTION = """
You are the FORECAST & DEMAND PREDICTION AGENT for KioskIQ.

You have access to 6 ML-powered prediction tools that connect to live Supabase data and a deployed ML service.

AVAILABLE TOOLS:
1. forecast_daily_orders(location_id) — Predicts tomorrow's order volume
2. predict_expiry_waste_risk(location_id) — Identifies items at risk of expiry/waste
3. recommend_reorder_quantities(location_id) — Recommends how much to reorder per item
4. forecast_revenue_aov(location_id) — Predicts tomorrow's revenue and average order value
5. predict_stockout_risk(location_id) — Flags items likely to stock out
6. predict_top_selling_items(location_id) — Predicts tomorrow's best-selling items

KNOWN LOCATION IDs (from Supabase):
- "outlet-1" → Mid Valley Food Court
- "outlet-2" → Sunway Pyramid Kiosk
- "outlet-3" → KLCC Food Corner

RULES:
- Always call the relevant tool(s) first before responding.
- If the user asks about a specific location, use its location_id directly.
- If no location is specified, default to "outlet-1".
- After getting tool results, summarise the key numbers clearly in plain English.
- For demand/order forecasts: state predicted orders + context vs recent average.
- For stockout/expiry: list the top 3 most at-risk items with urgency.
- For reorder: list items that need restocking with recommended quantities.
- For revenue: state predicted revenue and AOV vs recent average.
- Always mention the location name (not just the ID) in your response.
- If a tool returns an error, explain it clearly and suggest checking if the location has data.
"""


# ── Agent class ───────────────────────────────────────────────────────────────

class ForecastAgent:
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
            name="forecast_agent",
            description=(
                "ML-powered demand forecasting and prediction agent for KioskIQ. "
                "Predicts daily orders, revenue, AOV, stockout risk, expiry waste, and top sellers."
            ),
            instruction=FORECAST_AGENT_INSTRUCTION,
            tools=[
                forecast_daily_orders,
                predict_expiry_waste_risk,
                recommend_reorder_quantities,
                forecast_revenue_aov,
                predict_stockout_risk,
                predict_top_selling_items,
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

        return response_text


# ── A2A server setup ──────────────────────────────────────────────────────────

port = int(os.getenv("FORECAST_AGENT_PORT", 9025))

skill = AgentSkill(
    id="forecast_agent",
    name="Forecast & Demand Prediction",
    description=(
        "ML-powered forecasting using live Supabase kiosk data. "
        "Predicts daily orders, revenue, AOV, stockout risk, expiry waste, reorder quantities, and top sellers."
    ),
    tags=["forecast", "demand", "prediction", "ml", "orders", "revenue", "stockout", "reorder", "expiry"],
    examples=[
        "Forecast tomorrow's orders for Mid Valley",
        "Which items are at risk of stocking out?",
        "What should I reorder for Sunway Pyramid?",
        "Predict revenue for KLCC tomorrow",
        "What will be the top selling items this weekend?",
        "Show me expiry risk for outlet-1",
    ],
)

public_agent_card = AgentCard(
    name="Forecast Agent",
    description="ML-powered demand forecasting and prediction for KioskIQ kiosks.",
    url=f"http://localhost:{port}/",
    version="1.0.0",
    defaultInputModes=["text"],
    defaultOutputModes=["text"],
    capabilities=AgentCapabilities(streaming=True),
    skills=[skill],
)


class ForecastExecutor(AgentExecutor):
    def __init__(self):
        self.agent = ForecastAgent()

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
        http_handler=DefaultRequestHandler(ForecastExecutor(), InMemoryTaskStore()),
        extended_agent_card=public_agent_card,
    )
    print(f"Starting Forecast Agent on port {port}")
    uvicorn.run(server.build(), host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
