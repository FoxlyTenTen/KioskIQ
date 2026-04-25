import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

const LOCATION_KEYS: Record<string, string> = {
  'outlet-1': 'midValley',
  'outlet-2': 'sunway',
  'outlet-3': 'klcc',
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('location') ?? 'outlet-1';
    const isAll = locationId === 'all';

    const supabase = createServiceClient();
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split('T')[0];

    if (isAll) {
      // Fetch aggregate + multi-location trend
      const [allDailyRes, allOrdersRes, allStockRes, allExpiryRes, insightsRes] = await Promise.all([
        supabase
          .from('pos_orders_daily')
          .select('business_date, actual_orders, predicted_orders, location_id')
          .order('business_date', { ascending: true })
          .limit(30),
        supabase
          .from('pos_orders')
          .select('order_id, total_amount, outlet_id')
          .gte('ordered_at', `${today}T00:00:00`)
          .lt('ordered_at', `${tomorrow}T00:00:00`),
        supabase
          .from('inventory_stock')
          .select('item_name, current_qty, threshold_qty, status, unit, location_id')
          .in('status', ['critical', 'warning']),
        supabase
          .from('inventory_expiry')
          .select('item_name, quantity, expiry_date, days_to_expiry, location_id')
          .order('expiry_date', { ascending: true })
          .limit(15),
        supabase
          .from('dashboard_ai_insights')
          .select('insight_text')
          .eq('is_active', true)
          .order('priority', { ascending: true }),
      ]);

      const allOrders = allOrdersRes.data ?? [];
      const allStock = allStockRes.data ?? [];
      const allExpiry = allExpiryRes.data ?? [];
      const allDaily = allDailyRes.data ?? [];

      const todaysRevenue = allOrders.reduce((s, o) => s + Number(o.total_amount), 0);
      const todaysOrderCount = allOrders.length;

      // Build multi-location trend — pivot by date
      const dateMap: Record<string, Record<string, number | null>> = {};
      for (const row of allDaily) {
        const label = new Date(row.business_date).toLocaleDateString('en-MY', { month: 'short', day: 'numeric' });
        if (!dateMap[label]) dateMap[label] = {};
        const key = LOCATION_KEYS[row.location_id] ?? row.location_id;
        dateMap[label][key] = row.actual_orders;
        dateMap[label][`${key}Predicted`] = row.predicted_orders;
      }
      const chartData = Object.entries(dateMap).map(([date, vals]) => ({ date, ...vals }));

      // Fetch all order items for today to get top selling items
      const orderIds = allOrders.map((o) => o.order_id);
      let topItemsData: { item_name: string; qty: number; line_total: number }[] = [];
      if (orderIds.length > 0) {
        const { data } = await supabase
          .from('pos_order_items')
          .select('item_name, qty, line_total')
          .in('order_id', orderIds);
        topItemsData = data ?? [];
      }

      const itemMap: Record<string, { sold: number; revenue: number }> = {};
      for (const row of topItemsData) {
        if (!itemMap[row.item_name]) itemMap[row.item_name] = { sold: 0, revenue: 0 };
        itemMap[row.item_name].sold += row.qty;
        itemMap[row.item_name].revenue += Number(row.line_total);
      }
      const topSellingItems = Object.entries(itemMap)
        .map(([item, v]) => ({ item, ...v }))
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 6);

      return NextResponse.json({
        kpis: {
          todaysOrders: todaysOrderCount,
          todaysRevenue,
          averageOrderValue: todaysOrderCount > 0 ? todaysRevenue / todaysOrderCount : 0,
          predictedTomorrow: null,
          lowStockCount: allStock.length,
          criticalCount: allStock.filter((i) => i.status === 'critical').length,
          expiringUrgent: allExpiry.filter((i) => i.days_to_expiry != null && i.days_to_expiry <= 3).length,
        },
        chartData,
        insights: (insightsRes.data ?? []).map((i) => i.insight_text),
        topSellingItems,
        lowStockItems: allStock,
        expiryItems: allExpiry,
        isAllLocations: true,
      }, {
        headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=120' },
      });
    }

    // — Single location (original logic, enhanced) —
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
        .limit(7),
    ]);

    const errors = { ordersDaily: ordersDaily.error, todayOrders: todayOrders.error, insights: insights.error, lowStock: lowStock.error, expiry: expiry.error };
    if (Object.values(errors).some(Boolean)) console.error('[dashboard] Supabase errors:', JSON.stringify(errors, null, 2));

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

    const orders = todayOrders.data ?? [];
    const todaysRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
    const todaysOrderCount = orders.length;

    const predictedRow = ordersDaily.data?.find((r) => r.business_date === tomorrow);
    const todayRow = ordersDaily.data?.find((r) => r.business_date === today);
    const todaysActualOrders = todayRow?.actual_orders ?? todaysOrderCount;

    const itemMap: Record<string, { sold: number; revenue: number }> = {};
    for (const row of topItemsData) {
      if (!itemMap[row.item_name]) itemMap[row.item_name] = { sold: 0, revenue: 0 };
      itemMap[row.item_name].sold += row.qty;
      itemMap[row.item_name].revenue += Number(row.line_total);
    }
    const topSellingItems = Object.entries(itemMap)
      .map(([item, v]) => ({ item, ...v }))
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 6);

    const chartData = (ordersDaily.data ?? []).map((r) => ({
      date: new Date(r.business_date).toLocaleDateString('en-MY', { month: 'short', day: 'numeric' }),
      actual: r.actual_orders,
      predicted: r.predicted_orders,
    }));

    const expiryItems = expiry.data ?? [];

    return NextResponse.json({
      kpis: {
        todaysOrders: todaysActualOrders,
        todaysRevenue,
        averageOrderValue: todaysActualOrders > 0 ? todaysRevenue / todaysActualOrders : 0,
        predictedTomorrow: predictedRow?.predicted_orders ?? null,
        lowStockCount: (lowStock.data ?? []).length,
        criticalCount: (lowStock.data ?? []).filter((i) => i.status === 'critical').length,
        expiringUrgent: expiryItems.filter((i) => i.days_to_expiry != null && i.days_to_expiry <= 3).length,
      },
      chartData,
      insights: (insights.data ?? []).map((i) => i.insight_text),
      topSellingItems,
      lowStockItems: lowStock.data ?? [],
      expiryItems,
      isAllLocations: false,
    }, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' },
    });
  } catch (err) {
    console.error('[dashboard] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
