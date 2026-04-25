import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('location') ?? 'outlet-1';

    const supabase = createServiceClient();
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const [
      ordersDaily,
      todayOrders,
      insights,
      todayOrderIds,
      lowStock,
      expiry,
    ] = await Promise.all([
      supabase
        .from('pos_orders_daily')
        .select('business_date, actual_orders, predicted_orders')
        .eq('location_id', locationId)
        .order('business_date', { ascending: true })
        .limit(10),

      supabase
        .from('pos_orders')
        .select('order_id, total_amount')
        .eq('outlet_id', locationId)
        .gte('ordered_at', `${today}T00:00:00`)
        .lt('ordered_at', `${tomorrow}T00:00:00`),

      supabase
        .from('dashboard_ai_insights')
        .select('insight_text')
        .eq('is_active', true)
        .order('priority', { ascending: true }),

      // Fetch today's order_ids to avoid fragile cross-table filter
      supabase
        .from('pos_orders')
        .select('order_id')
        .eq('outlet_id', locationId)
        .gte('ordered_at', `${today}T00:00:00`)
        .lt('ordered_at', `${tomorrow}T00:00:00`),

      supabase
        .from('inventory_stock')
        .select('item_name, current_qty, threshold_qty, status, unit')
        .eq('location_id', locationId)
        .in('status', ['critical', 'warning'])
        .order('status', { ascending: true }),

      supabase
        .from('inventory_expiry')
        .select('item_name, quantity, expiry_date, days_to_expiry')
        .eq('location_id', locationId)
        .order('expiry_date', { ascending: true })
        .limit(5),
    ]);

    // Log any Supabase errors so they show in the terminal
    const errors = { ordersDaily: ordersDaily.error, todayOrders: todayOrders.error, insights: insights.error, lowStock: lowStock.error, expiry: expiry.error };
    const hasErrors = Object.values(errors).some(Boolean);
    if (hasErrors) console.error('[dashboard] Supabase errors:', JSON.stringify(errors, null, 2));

    // Fetch top-selling items using the order_ids we already have
    const orderIds = (todayOrderIds.data ?? []).map((r) => r.order_id);
    let topItemsData: { item_name: string; qty: number; line_total: number }[] = [];
    if (orderIds.length > 0) {
      const { data, error } = await supabase
        .from('pos_order_items')
        .select('item_name, qty, line_total')
        .in('order_id', orderIds);
      if (error) console.error('[dashboard] pos_order_items error:', error);
      topItemsData = data ?? [];
    }

    // Compute today's revenue and order count
    const orders = todayOrders.data ?? [];
    const todaysRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
    const todaysOrderCount = orders.length;

    const predictedRow = ordersDaily.data?.find((r) => r.business_date === tomorrow);
    const predictedTomorrow = predictedRow?.predicted_orders ?? null;

    const todayRow = ordersDaily.data?.find((r) => r.business_date === today);
    const todaysActualOrders = todayRow?.actual_orders ?? todaysOrderCount;

    // Aggregate top selling items
    const itemMap: Record<string, { sold: number; revenue: number }> = {};
    for (const row of topItemsData) {
      if (!itemMap[row.item_name]) itemMap[row.item_name] = { sold: 0, revenue: 0 };
      itemMap[row.item_name].sold += row.qty;
      itemMap[row.item_name].revenue += Number(row.line_total);
    }
    const topSellingItems = Object.entries(itemMap)
      .map(([item, v]) => ({ item, ...v }))
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5);

    const chartData = (ordersDaily.data ?? []).map((r) => ({
      date: new Date(r.business_date).toLocaleDateString('en-MY', { month: 'short', day: 'numeric' }),
      actual: r.actual_orders,
      predicted: r.predicted_orders,
    }));

    const payload = {
      kpis: {
        todaysOrders: todaysActualOrders,
        todaysRevenue,
        averageOrderValue: todaysActualOrders > 0 ? todaysRevenue / todaysActualOrders : 0,
        predictedTomorrow,
        lowStockCount: (lowStock.data ?? []).length,
        criticalCount: (lowStock.data ?? []).filter((i) => i.status === 'critical').length,
      },
      chartData,
      insights: (insights.data ?? []).map((i) => i.insight_text),
      topSellingItems,
      lowStockItems: lowStock.data ?? [],
      expiryItems: expiry.data ?? [],
    };

    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' },
    });
  } catch (err) {
    console.error('[dashboard] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
