"""
SQL MCP Server — KioskIQ
Provides exact numerical data direct from Supabase (no RAG, no vector search).
Use this for ANY question involving: revenue, order counts, stock quantities,
comparisons between outlets, totals, averages, or expiry countdowns.
"""

import os
from datetime import date, timedelta

from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP
from supabase import create_client

load_dotenv()

port = int(os.getenv("SQL_MCP_PORT", 9014))
mcp = FastMCP("KioskIQ SQL", host="0.0.0.0", port=port)

sb = create_client(
    os.getenv("NEXT_PUBLIC_SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
)

OUTLET_NAMES = {
    "outlet-1": "Mid Valley Food Court",
    "outlet-2": "Sunway Pyramid Kiosk",
    "outlet-3": "KLCC Food Corner",
}


def _outlet_label(location_id: str) -> str:
    return OUTLET_NAMES.get(location_id, location_id)


# ─── Tool 1: Revenue & Orders ──────────────────────────────────────────────

def _fetch_orders_for_date(query_date: str, location_id: str) -> list:
    """Fetch pos_orders rows for a given date, optionally filtered by outlet."""
    next_date = (date.fromisoformat(query_date) + timedelta(days=1)).isoformat()
    q = (
        sb.from_("pos_orders")
        .select("order_id, total_amount, outlet_id, ordered_at")
        .gte("ordered_at", f"{query_date}T00:00:00")
        .lt("ordered_at", f"{next_date}T00:00:00")
    )
    if location_id != "all":
        q = q.eq("outlet_id", location_id)
    return q.execute().data or []


def _latest_order_date(location_id: str) -> str | None:
    """Return the date of the most recent order in the database."""
    q = sb.from_("pos_orders").select("ordered_at").order("ordered_at", desc=True).limit(1)
    if location_id != "all":
        q = q.eq("outlet_id", location_id)
    rows = q.execute().data or []
    if not rows:
        return None
    return rows[0]["ordered_at"][:10]  # extract YYYY-MM-DD


@mcp.tool()
def get_revenue_summary(target_date: str = "", location_id: str = "all") -> str:
    """
    Get exact revenue and order counts for a specific date and/or outlet.
    Always use this tool when the user asks about: revenue, total sales, order count,
    average order value, or any financial figure. Never use RAG for these questions.

    Args:
        target_date: ISO date string e.g. '2025-04-25'. Defaults to today, falls back to most recent date with data.
        location_id: 'outlet-1', 'outlet-2', 'outlet-3', or 'all'. Defaults to 'all'.
    """
    today = date.today().isoformat()
    query_date = target_date.strip() if target_date.strip() else today

    orders = _fetch_orders_for_date(query_date, location_id)

    # If no data for requested date, fall back to most recent date that has data
    fallback_note = ""
    if not orders and not target_date.strip():
        latest = _latest_order_date(location_id)
        if latest and latest != query_date:
            orders = _fetch_orders_for_date(latest, location_id)
            fallback_note = f" (most recent data — no orders recorded for today {query_date})"
            query_date = latest

    if not orders:
        return (
            f"No orders found for {query_date}"
            + (f" at {_outlet_label(location_id)}" if location_id != "all" else "")
            + ". The database may not have POS data for this period."
        )

    total_revenue = sum(float(o["total_amount"]) for o in orders)
    total_orders = len(orders)
    avg_order = total_revenue / total_orders

    lines = [
        f"Revenue Summary — {query_date}{fallback_note}" + (f" | {_outlet_label(location_id)}" if location_id != "all" else " | All Outlets"),
        f"  Total orders : {total_orders}",
        f"  Total revenue: RM {total_revenue:.2f}",
        f"  Avg per order: RM {avg_order:.2f}",
    ]

    if location_id == "all":
        lines.append("\nBreakdown by outlet:")
        by_outlet: dict[str, list] = {}
        for o in orders:
            by_outlet.setdefault(o["outlet_id"], []).append(float(o["total_amount"]))
        for oid, amounts in sorted(by_outlet.items()):
            rev = sum(amounts)
            cnt = len(amounts)
            lines.append(f"  {_outlet_label(oid)}: {cnt} orders  RM {rev:.2f}  (avg RM {rev/cnt:.2f})")

    return "\n".join(lines)


# ─── Tool 2: Stock Status ──────────────────────────────────────────────────

@mcp.tool()
def get_stock_summary(location_id: str = "all") -> str:
    """
    Get exact stock levels, quantities, and status for all items.
    Use this for: how many items are critical/warning/ok, specific item quantities,
    stock comparisons between outlets, or reorder recommendations.
    Never use RAG for precise stock quantities.

    Args:
        location_id: 'outlet-1', 'outlet-2', 'outlet-3', or 'all'. Defaults to 'all'.
    """
    q = sb.from_("inventory_stock").select("item_name, current_qty, threshold_qty, status, unit, location_id")
    if location_id != "all":
        q = q.eq("location_id", location_id)
    result = q.order("status").execute()
    items = result.data or []

    if not items:
        return "No stock data found."

    critical = [i for i in items if i["status"] == "critical"]
    warning  = [i for i in items if i["status"] == "warning"]
    ok       = [i for i in items if i["status"] == "ok"]

    lines = [
        f"Stock Summary" + (f" — {_outlet_label(location_id)}" if location_id != "all" else " — All Outlets"),
        f"  Total items : {len(items)}",
        f"  OK          : {len(ok)}",
        f"  Warning     : {len(warning)}",
        f"  Critical    : {len(critical)}",
    ]

    if critical:
        lines.append("\nCritical items (reorder NOW):")
        for i in critical:
            lines.append(f"  [{_outlet_label(i['location_id'])}] {i['item_name']}: {i['current_qty']} {i['unit']} (min {i['threshold_qty']} {i['unit']})")

    if warning:
        lines.append("\nWarning items (reorder soon):")
        for i in warning:
            lines.append(f"  [{_outlet_label(i['location_id'])}] {i['item_name']}: {i['current_qty']} {i['unit']} (min {i['threshold_qty']} {i['unit']})")

    return "\n".join(lines)


# ─── Tool 3: Expiry Summary ────────────────────────────────────────────────

@mcp.tool()
def get_expiry_summary(days_ahead: int = 7, location_id: str = "all") -> str:
    """
    Get exact list of items expiring within a given number of days.
    Use this for: expiry alerts, waste risk, items to discount or use first.
    Never use RAG for precise expiry dates or countdown figures.

    Args:
        days_ahead: How many days ahead to check. Default 7.
        location_id: 'outlet-1', 'outlet-2', 'outlet-3', or 'all'. Defaults to 'all'.
    """
    q = (
        sb.from_("inventory_expiry")
        .select("item_name, quantity, expiry_date, days_to_expiry, location_id")
        .lte("days_to_expiry", days_ahead)
        .order("days_to_expiry")
    )
    if location_id != "all":
        q = q.eq("location_id", location_id)

    result = q.execute()
    items = result.data or []

    if not items:
        return f"No items expiring within {days_ahead} days."

    lines = [
        f"Expiry Alert — next {days_ahead} days" + (f" | {_outlet_label(location_id)}" if location_id != "all" else " | All Outlets"),
        f"  {len(items)} item(s) need attention:\n",
    ]
    for i in items:
        urgency = "⚠️ TODAY" if i["days_to_expiry"] == 0 else f"{i['days_to_expiry']} day(s)"
        lines.append(f"  {urgency}  {i['item_name']} ({i['quantity']} units)  [{_outlet_label(i['location_id'])}]  expires {i['expiry_date']}")

    return "\n".join(lines)


# ─── Tool 4: Top Menu Items ────────────────────────────────────────────────

@mcp.tool()
def get_top_menu_items(target_date: str = "", location_id: str = "all", limit: int = 8) -> str:
    """
    Get exact ranking of best-selling menu items by units sold and revenue.
    Use this for: top sellers, which items are most popular, menu performance.
    Never use RAG for sales rankings or item revenue figures.

    Args:
        target_date: ISO date string e.g. '2025-04-25'. Defaults to today.
        location_id: 'outlet-1', 'outlet-2', 'outlet-3', or 'all'. Defaults to 'all'.
        limit: Number of top items to return. Default 8.
    """
    today = date.today().isoformat()
    query_date = target_date.strip() if target_date.strip() else today

    orders = _fetch_orders_for_date(query_date, location_id)

    # Fall back to most recent date if no data today
    fallback_note = ""
    if not orders and not target_date.strip():
        latest = _latest_order_date(location_id)
        if latest and latest != query_date:
            orders = _fetch_orders_for_date(latest, location_id)
            fallback_note = f" (most recent data — no orders for today {query_date})"
            query_date = latest

    order_ids = [o["order_id"] for o in orders]

    if not order_ids:
        return f"No orders found for {query_date}."

    items_res = (
        sb.from_("pos_order_items")
        .select("item_name, qty, line_total")
        .in_("order_id", order_ids)
        .execute()
    )
    rows = items_res.data or []

    totals: dict[str, dict] = {}
    for r in rows:
        name = r["item_name"]
        if name not in totals:
            totals[name] = {"sold": 0, "revenue": 0.0}
        totals[name]["sold"] += r["qty"]
        totals[name]["revenue"] += float(r["line_total"])

    ranked = sorted(totals.items(), key=lambda x: x[1]["sold"], reverse=True)[:limit]

    lines = [
        f"Top Menu Items — {query_date}{fallback_note}" + (f" | {_outlet_label(location_id)}" if location_id != "all" else " | All Outlets"),
    ]
    for rank, (name, v) in enumerate(ranked, 1):
        lines.append(f"  #{rank}  {name}: {v['sold']} units  RM {v['revenue']:.2f}")

    return "\n".join(lines)


# ─── Tool 5: Orders Trend ─────────────────────────────────────────────────

@mcp.tool()
def get_orders_trend(days: int = 10, location_id: str = "all") -> str:
    """
    Get the actual vs predicted order count trend for the last N days.
    Use this for: is business growing?, comparing actual to forecast,
    identifying which days are busiest.

    Args:
        days: How many days of history. Default 10.
        location_id: 'outlet-1', 'outlet-2', 'outlet-3', or 'all'. Defaults to 'all'.
    """
    q = (
        sb.from_("pos_orders_daily")
        .select("business_date, actual_orders, predicted_orders, location_id")
        .order("business_date", desc=False)
        .limit(days * 3)  # fetch extra to cover all outlets
    )
    if location_id != "all":
        q = q.eq("location_id", location_id)

    rows = q.execute().data or []

    if not rows:
        return "No trend data available."

    lines = [
        f"Orders Trend — last {days} days" + (f" | {_outlet_label(location_id)}" if location_id != "all" else " | All Outlets"),
    ]
    for r in rows:
        actual = r["actual_orders"] if r["actual_orders"] is not None else "—"
        predicted = r["predicted_orders"] if r["predicted_orders"] is not None else "—"
        label = _outlet_label(r["location_id"]) if location_id == "all" else ""
        outlet_str = f"  [{label}]" if label else " "
        lines.append(f"  {r['business_date']}{outlet_str}  actual: {actual}  predicted: {predicted}")

    return "\n".join(lines)


if __name__ == "__main__":
    print(f"Starting KioskIQ SQL MCP Server on http://0.0.0.0:{port}/sse")
    mcp.run(transport="sse")
